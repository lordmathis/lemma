//go:build test

package db

import (
	"database/sql"
	"lemma/internal/secrets"
)

type TestDatabase interface {
	Database
	TestDB() *sql.DB
}

func NewTestDB(secretsService secrets.Service) (TestDatabase, error) {
	db, err := Init(DBTypeSQLite, ":memory:", secretsService)
	if err != nil {
		return nil, err
	}

	return &testDatabase{db.(*database)}, nil
}

type testDatabase struct {
	*database
}

func (td *testDatabase) TestDB() *sql.DB {
	return td.DB
}
