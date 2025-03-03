package db

import (
	"database/sql"
	"fmt"
	"reflect"
	"sort"
	"strings"
	"unicode"
)

type DBField struct {
	Name         string
	Value        any
	Type         reflect.Type
	OriginalName string
	useDefault   bool
	encrypted    bool
}

func StructTagsToFields(s any) ([]DBField, error) {
	v := reflect.ValueOf(s)

	if v.Kind() == reflect.Ptr {
		if v.IsNil() {
			return nil, fmt.Errorf("nil pointer provided")
		}

		v = v.Elem()
	}

	if v.Kind() != reflect.Struct {
		return nil, fmt.Errorf("provided value is %s, expected struct", v.Kind())
	}

	t := v.Type()
	fields := make([]DBField, 0, t.NumField())

	for i := range t.NumField() {
		f := t.Field(i)

		if !f.IsExported() {
			continue
		}

		tag := f.Tag.Get("db")
		if tag == "-" {
			continue
		}

		if tag == "" {
			tag = toSnakeCase(f.Name)
		}

		useDefault := false
		encrypted := false

		if strings.Contains(tag, ",") {
			parts := strings.Split(tag, ",")
			tag = parts[0]

			for _, opt := range parts[1:] {
				switch opt {
				case "omitempty":
					if reflect.DeepEqual(v.Field(i).Interface(), reflect.Zero(f.Type).Interface()) {
						continue
					}
				case "default":
					useDefault = true
				case "encrypted":
					encrypted = true
				}
			}
		}

		fields = append(fields, DBField{
			Name:         tag,
			Value:        v.Field(i).Interface(),
			Type:         f.Type,
			OriginalName: f.Name,
			useDefault:   useDefault,
			encrypted:    encrypted,
		})
	}

	sort.Slice(fields, func(i, j int) bool {
		return fields[i].Name < fields[j].Name
	})

	return fields, nil
}

func toSnakeCase(s string) string {
	var res string

	for i, r := range s {
		if unicode.IsUpper(r) {
			if i > 0 {
				res += "_"
			}
			res += string(unicode.ToLower(r))
		} else {
			res += string(r)
		}
	}
	return res
}

func (q *Query) InsertStruct(s any, table string) (*Query, error) {
	fields, err := StructTagsToFields(s)
	if err != nil {
		return nil, err
	}

	columns := make([]string, 0, len(fields))
	values := make([]any, 0, len(fields))

	for _, f := range fields {
		value := f.Value

		if f.useDefault {
			continue
		}

		if f.encrypted {
			encValue, err := q.secretsService.Encrypt(value.(string))
			if err != nil {
				return nil, err
			}
			value = encValue
		}

		columns = append(columns, f.Name)
		values = append(values, value)
	}

	if len(columns) == 0 {
		return nil, fmt.Errorf("no columns to insert")
	}

	q.Insert(table, columns...).Values(len(columns)).AddArgs(values...)
	return q, nil
}

func (q *Query) UpdateStruct(s any, table string, where []string, args []any) (*Query, error) {
	fields, err := StructTagsToFields(s)
	if err != nil {
		return nil, err
	}

	if len(where) != len(args) {
		return nil, fmt.Errorf("number of where clauses does not match number of arguments")
	}

	q = q.Update("users")

	for _, f := range fields {
		value := f.Value

		if f.useDefault {
			continue
		}

		if f.encrypted {
			encValue, err := q.secretsService.Encrypt(value.(string))
			if err != nil {
				return nil, err
			}
			value = encValue
		}

		q = q.Set(f.Name).Placeholder(value)
	}

	for i, w := range where {
		if i != 0 && i < len(args) {
			q = q.And(w)
		}
		q = q.Where(w).Placeholder(args[i])
	}

	return q, nil
}

func (q *Query) SelectStruct(s any, table string) (*Query, error) {
	fields, err := StructTagsToFields(s)
	if err != nil {
		return nil, err
	}

	columns := make([]string, 0, len(fields))
	for _, f := range fields {
		columns = append(columns, f.Name)
	}

	q = q.Select(columns...).From(table)
	return q, nil
}

// Scanner is an interface that both sql.Row and sql.Rows satisfy
type Scanner interface {
	Scan(dest ...interface{}) error
}

// scanStructInstance is an internal function that handles the scanning logic for a single instance
func (db *database) scanStructInstance(destVal reflect.Value, scanner Scanner) error {
	fields, err := StructTagsToFields(destVal.Interface())
	if err != nil {
		return fmt.Errorf("failed to extract struct fields: %w", err)
	}

	scanDest := make([]interface{}, len(fields))
	var fieldsToDecrypt []string
	nullStringIndexes := make(map[int]reflect.Value)

	for i, field := range fields {
		// Find the field in the struct
		structField := destVal.FieldByName(field.OriginalName)
		if !structField.IsValid() {
			return fmt.Errorf("struct field %s not found", field.OriginalName)
		}

		if field.encrypted {
			fieldsToDecrypt = append(fieldsToDecrypt, field.OriginalName)
		}

		if structField.Kind() == reflect.String {
			// Handle null strings separately
			nullStringIndexes[i] = structField
			var ns sql.NullString
			scanDest[i] = &ns
		} else {
			scanDest[i] = structField.Addr().Interface()
		}
	}

	// Scan using the scanner interface
	if err := scanner.Scan(scanDest...); err != nil {
		return err
	}

	// Set null strings to their values if they are valid
	for i, field := range nullStringIndexes {
		ns := scanDest[i].(*sql.NullString)
		if ns.Valid {
			field.SetString(ns.String)
		}
	}

	// Decrypt encrypted fields
	for _, fieldName := range fieldsToDecrypt {
		field := destVal.FieldByName(fieldName)
		if !field.IsZero() {
			decValue, err := db.secretsService.Decrypt(field.Interface().(string))
			if err != nil {
				return err
			}
			field.SetString(decValue)
		}
	}

	return nil
}

// ScanStruct scans a single row into a struct
func (db *database) ScanStruct(row *sql.Row, dest any) error {
	if row == nil {
		return fmt.Errorf("row cannot be nil")
	}

	if row.Err() != nil {
		return row.Err()
	}

	// Get the destination value
	destVal := reflect.ValueOf(dest)
	if destVal.Kind() != reflect.Ptr || destVal.IsNil() {
		return fmt.Errorf("destination must be a non-nil pointer to a struct, got %T", dest)
	}

	destVal = destVal.Elem()
	if destVal.Kind() != reflect.Struct {
		return fmt.Errorf("destination must be a pointer to a struct, got pointer to %s", destVal.Kind())
	}

	return db.scanStructInstance(destVal, row)
}

// ScanStructs scans multiple rows into a slice of structs
func (db *database) ScanStructs(rows *sql.Rows, destSlice any) error {
	if rows == nil {
		return fmt.Errorf("rows cannot be nil")
	}
	defer rows.Close()

	// Get the slice value and element type
	sliceVal := reflect.ValueOf(destSlice)
	if sliceVal.Kind() != reflect.Ptr || sliceVal.IsNil() {
		return fmt.Errorf("destination must be a non-nil pointer to a slice, got %T", destSlice)
	}

	sliceVal = sliceVal.Elem()
	if sliceVal.Kind() != reflect.Slice {
		return fmt.Errorf("destination must be a pointer to a slice, got pointer to %s", sliceVal.Kind())
	}

	// Get the element type of the slice
	elemType := sliceVal.Type().Elem()

	// Check if we have a direct struct type or a pointer to struct
	isPtr := elemType.Kind() == reflect.Ptr
	structType := elemType
	if isPtr {
		structType = elemType.Elem()
	}
	if structType.Kind() != reflect.Struct {
		return fmt.Errorf("slice element type must be a struct or pointer to struct, got %s", elemType.String())
	}

	// Process each row
	for rows.Next() {
		// Create a new instance of the struct for each row
		newElem := reflect.New(structType).Elem()

		// Scan this row into the new element
		if err := db.scanStructInstance(newElem, rows); err != nil {
			return err
		}

		// Add the new element to the result slice
		if isPtr {
			sliceVal.Set(reflect.Append(sliceVal, newElem.Addr()))
		} else {
			sliceVal.Set(reflect.Append(sliceVal, newElem))
		}
	}

	// Check for errors from iterating over rows
	if err := rows.Err(); err != nil {
		return err
	}

	return nil
}
