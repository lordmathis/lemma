package db

import (
	"database/sql"
	"fmt"
	"reflect"
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
func (s *Scanner) QueryRow(dest interface{}, q *Query) error {
	row := s.db.QueryRow(q.String(), q.Args()...)
	return scanStruct(row, dest)
}

// Query executes a query and scans multiple results into a slice of structs
func (s *Scanner) Query(dest interface{}, q *Query) error {
	rows, err := s.db.Query(q.String(), q.Args()...)
	if err != nil {
		return err
	}
	defer rows.Close()

	return scanStructs(rows, dest)
}

// scanStruct scans a single row into a struct
func scanStruct(row *sql.Row, dest interface{}) error {
	v := reflect.ValueOf(dest)
	if v.Kind() != reflect.Ptr {
		return fmt.Errorf("dest must be a pointer to a struct")
	}
	v = v.Elem()
	if v.Kind() != reflect.Struct {
		return fmt.Errorf("dest must be a pointer to a struct")
	}

	fields := make([]interface{}, 0, v.NumField())

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		if field.CanSet() {
			fields = append(fields, field.Addr().Interface())
		}
	}

	return row.Scan(fields...)
}

// scanStructs scans multiple rows into a slice of structs
func scanStructs(rows *sql.Rows, dest interface{}) error {
	v := reflect.ValueOf(dest)
	if v.Kind() != reflect.Ptr {
		return fmt.Errorf("dest must be a pointer to a slice")
	}
	sliceVal := v.Elem()
	if sliceVal.Kind() != reflect.Slice {
		return fmt.Errorf("dest must be a pointer to a slice")
	}

	elemType := sliceVal.Type().Elem()

	for rows.Next() {
		newElem := reflect.New(elemType).Elem()
		fields := make([]interface{}, 0, newElem.NumField())

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
