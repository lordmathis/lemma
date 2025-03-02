package db

import (
	"database/sql"
	"fmt"
	"reflect"
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

func (db *database) ScanStruct(row *sql.Row, dest any) error {
	// Get the fields of the destination struct
	fields, err := StructTagsToFields(dest)
	if err != nil {
		return fmt.Errorf("failed to extract struct fields: %w", err)
	}

	// Create a slice of pointers to hold the scan destinations
	scanDest := make([]interface{}, len(fields))
	destVal := reflect.ValueOf(dest).Elem()

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
			nullStringIndexes[i] = structField

			var ns sql.NullString
			scanDest[i] = &ns
		} else {
			scanDest[i] = structField.Addr().Interface()
		}
	}

	// Scan the row into the destination pointers
	if err := row.Scan(scanDest...); err != nil {
		return err
	}

	// Set null strings to nil if they are null
	for i, field := range nullStringIndexes {
		ns := scanDest[i].(*sql.NullString)
		if ns.Valid {
			field.SetString(ns.String)
		}
	}

	// Decrypt encrypted fields
	for _, fieldName := range fieldsToDecrypt {
		field := destVal.FieldByName(fieldName)
		decValue, err := db.secretsService.Decrypt(field.Interface().(string))
		if err != nil {
			return err
		}
		field.SetString(decValue)
	}

	return nil
}
