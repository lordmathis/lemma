package db

import (
	"database/sql"
	"fmt"
	"reflect"
	"regexp"
	"strings"
)

// Scanner provides methods for scanning rows into structs
type Scanner struct {
	db     *sql.DB
	dbType DBType
}

// NewScanner creates a new Scanner instance
func NewScanner(db *sql.DB, dbType DBType) *Scanner {
	return &Scanner{
		db:     db,
		dbType: dbType,
	}
}

// QueryRow executes a query and scans the result into a struct
func (s *Scanner) QueryRow(dest any, q *Query) error {
	row := s.db.QueryRow(q.String(), q.Args()...)

	// Handle primitive types
	v := reflect.ValueOf(dest)
	if v.Kind() != reflect.Ptr {
		return fmt.Errorf("dest must be a pointer")
	}

	elem := v.Elem()
	switch elem.Kind() {
	case reflect.Struct:
		return scanStruct(row, dest)
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
		reflect.Float32, reflect.Float64, reflect.Bool, reflect.String:
		return row.Scan(dest)
	default:
		return fmt.Errorf("unsupported dest type: %T", dest)
	}
}

// Query executes a query and scans multiple results into a slice of structs
func (s *Scanner) Query(dest any, q *Query) error {
	rows, err := s.db.Query(q.String(), q.Args()...)
	if err != nil {
		return err
	}
	defer rows.Close()

	return scanStructs(rows, dest)
}

// scanStruct scans a single row into a struct
func scanStruct(row *sql.Row, dest any) error {
	v := reflect.ValueOf(dest)
	if v.Kind() != reflect.Ptr {
		return fmt.Errorf("dest must be a pointer")
	}
	v = v.Elem()
	if v.Kind() != reflect.Struct {
		return fmt.Errorf("dest must be a pointer to a struct")
	}

	fields := make([]any, 0, v.NumField())

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		if field.CanSet() {
			fields = append(fields, field.Addr().Interface())
		}
	}

	return row.Scan(fields...)
}

// scanStructs scans multiple rows into a slice of structs
func scanStructs(rows *sql.Rows, dest any) error {
	v := reflect.ValueOf(dest)
	if v.Kind() != reflect.Ptr {
		return fmt.Errorf("dest must be a pointer")
	}

	sliceVal := v.Elem()
	if sliceVal.Kind() != reflect.Slice {
		return fmt.Errorf("dest must be a pointer to a slice")
	}

	elemType := sliceVal.Type().Elem()

	for rows.Next() {
		newElem := reflect.New(elemType).Elem()
		fields := make([]any, 0, newElem.NumField())

		for i := 0; i < newElem.NumField(); i++ {
			field := newElem.Field(i)
			if field.CanSet() {
				fields = append(fields, field.Addr().Interface())
			}
		}

		if err := rows.Scan(fields...); err != nil {
			return err
		}

		sliceVal.Set(reflect.Append(sliceVal, newElem))
	}

	return rows.Err()
}

// ScannerEx is an extended version of Scanner with more features
type ScannerEx struct {
	db     *sql.DB
	dbType DBType
}

// NewScannerEx creates a new ScannerEx instance
func NewScannerEx(db *sql.DB, dbType DBType) *ScannerEx {
	return &ScannerEx{
		db:     db,
		dbType: dbType,
	}
}

// QueryRow executes a query and scans the result into a struct
func (s *ScannerEx) QueryRow(dest any, q *Query) error {
	row := s.db.QueryRow(q.String(), q.Args()...)

	// Get column names
	// Note: This is a workaround since sql.Row doesn't expose column names.
	// In a real implementation, you'd likely need to execute the query to get columns first.
	// For simplicity, we'll infer them from the struct tags.

	return scanStructTags(row, dest)
}

// Query executes a query and scans multiple results into a slice of structs
func (s *ScannerEx) Query(dest any, q *Query) error {
	rows, err := s.db.Query(q.String(), q.Args()...)
	if err != nil {
		return err
	}
	defer rows.Close()

	return scanStructsTags(rows, dest)
}

// getFieldMap builds a map of db column names to struct fields using struct tags
func getFieldMap(t reflect.Type) map[string]int {
	fieldMap := make(map[string]int)

	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)

		// Check db tag first
		tag := field.Tag.Get("db")
		if tag != "" && tag != "-" {
			fieldMap[tag] = i
			continue
		}

		// Check json tag next
		tag = field.Tag.Get("json")
		if tag != "" && tag != "-" {
			// Handle json tag options like omitempty
			parts := strings.Split(tag, ",")
			fieldMap[parts[0]] = i
			continue
		}

		// Default to field name with snake_case conversion
		fieldMap[toSnakeCase(field.Name)] = i
	}

	return fieldMap
}

var camelRegex = regexp.MustCompile(`([a-z0-9])([A-Z])`)

// toSnakeCase converts a camelCase string to snake_case
func toSnakeCase(s string) string {
	return strings.ToLower(camelRegex.ReplaceAllString(s, "${1}_${2}"))
}

// scanStructTags scans a single row into a struct using field tags
func scanStructTags(row *sql.Row, dest any) error {
	v := reflect.ValueOf(dest)
	if v.Kind() != reflect.Ptr {
		return fmt.Errorf("dest must be a pointer")
	}
	v = v.Elem()
	if v.Kind() != reflect.Struct {
		return fmt.Errorf("dest must be a pointer to a struct")
	}

	fields := make([]any, 0, v.NumField())

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		if field.CanSet() {
			fields = append(fields, field.Addr().Interface())
		}
	}

	return row.Scan(fields...)
}

// scanStructsTags scans multiple rows into a slice of structs using field tags
func scanStructsTags(rows *sql.Rows, dest any) error {
	v := reflect.ValueOf(dest)
	if v.Kind() != reflect.Ptr {
		return fmt.Errorf("dest must be a pointer")
	}

	sliceVal := v.Elem()
	if sliceVal.Kind() != reflect.Slice {
		return fmt.Errorf("dest must be a pointer to a slice")
	}

	elemType := sliceVal.Type().Elem()
	isPtr := elemType.Kind() == reflect.Ptr
	if isPtr {
		elemType = elemType.Elem()
	}

	if elemType.Kind() != reflect.Struct {
		return fmt.Errorf("dest must be a pointer to a slice of structs")
	}

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return err
	}

	// Build field mapping
	fieldMap := getFieldMap(elemType)

	// Prepare values slice for each scan
	values := make([]any, len(columns))
	scanFields := make([]any, len(columns))
	for i := range values {
		scanFields[i] = &values[i]
	}

	for rows.Next() {
		// Create a new struct instance
		newElem := reflect.New(elemType).Elem()

		// Scan row into values
		if err := rows.Scan(scanFields...); err != nil {
			return err
		}

		// Map values to struct fields
		for i, colName := range columns {
			if fieldIndex, ok := fieldMap[colName]; ok {
				field := newElem.Field(fieldIndex)
				if field.CanSet() {
					val := reflect.ValueOf(values[i])
					if val.Elem().Kind() == reflect.Interface {
						val = val.Elem()
					}
					if val.Kind() == reflect.Ptr && !val.IsNil() {
						field.Set(val.Elem())
					} else if !val.IsNil() {
						field.Set(val)
					}
				}
			}
		}

		// Append to result slice
		if isPtr {
			sliceVal.Set(reflect.Append(sliceVal, newElem.Addr()))
		} else {
			sliceVal.Set(reflect.Append(sliceVal, newElem))
		}
	}

	return rows.Err()
}
