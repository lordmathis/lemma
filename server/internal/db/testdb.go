//go:build test

package db

import (
	"database/sql"
	"fmt"
	"lemma/internal/secrets"
	"log"
	"time"
)

type TestDatabase interface {
	Database
	TestDB() *sql.DB
}

func NewTestSQLiteDB(secretsService secrets.Service) (TestDatabase, error) {
	db, err := Init(DBTypeSQLite, ":memory:", secretsService)
	if err != nil {
		return nil, err
	}

	return &testSQLiteDatabase{db.(*database)}, nil
}

type testSQLiteDatabase struct {
	*database
}

func (td *testSQLiteDatabase) TestDB() *sql.DB {
	return td.DB
}

// NewPostgresTestDB creates a test database using PostgreSQL
func NewPostgresTestDB(dbURL string, secretsSvc secrets.Service) (TestDatabase, error) {
	if dbURL == "" {
		return nil, fmt.Errorf("postgres URL cannot be empty")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping postgres database: %w", err)
	}

	// Create a unique schema name for this test run to avoid conflicts
	schemaName := fmt.Sprintf("lemma_test_%d", time.Now().UnixNano())
	_, err = db.Exec(fmt.Sprintf("CREATE SCHEMA %s", schemaName))
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create schema: %w", err)
	}

	// Set search path to use our schema
	_, err = db.Exec(fmt.Sprintf("SET search_path TO %s", schemaName))
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to set search path: %w", err)
	}

	// Create database instance
	database := &postgresTestDatabase{
		database:   &database{DB: db, secretsService: secretsSvc, dbType: DBTypePostgres},
		schemaName: schemaName,
	}

	return database, nil
}

// postgresTestDatabase extends the regular postgres database to add test-specific cleanup
type postgresTestDatabase struct {
	*database
	schemaName string
}

// Close closes the database connection and drops the test schema
func (db *postgresTestDatabase) Close() error {
	_, err := db.TestDB().Exec(fmt.Sprintf("DROP SCHEMA %s CASCADE", db.schemaName))
	if err != nil {
		log.Printf("Failed to drop schema %s: %v", db.schemaName, err)
	}

	return db.TestDB().Close()
}

// TestDB returns the underlying *sql.DB instance
func (db *postgresTestDatabase) TestDB() *sql.DB {
	return db.DB
}
