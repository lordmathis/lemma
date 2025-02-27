package db

import (
	"fmt"
	"reflect"
	"strings"
	"unicode"
)

type DBField struct {
	Name       string
	Value      any
	Type       reflect.Type
	useDefault bool
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
				}
			}
		}

		fields = append(fields, DBField{
			Name:       tag,
			Value:      v.Field(i).Interface(),
			Type:       f.Type,
			useDefault: useDefault,
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
		if f.useDefault {
			continue
		}

		columns = append(columns, f.Name)
		values = append(values, f.Value)
	}

	if len(columns) == 0 {
		return nil, fmt.Errorf("no columns to insert")
	}

	q.Insert(table, columns...).Values(len(columns)).AddArgs(values...)
	return q, nil
}
