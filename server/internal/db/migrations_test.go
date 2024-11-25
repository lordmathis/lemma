package db_test

import (
	"testing"

	"novamd/internal/db"

	_ "github.com/mattn/go-sqlite3"
)

func TestMigrate(t *testing.T) {
	database, err := db.NewTestDB(":memory:", &mockSecrets{})
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer database.Close()

	t.Run("migrations are applied in order", func(t *testing.T) {
		if err := database.Migrate(); err != nil {
			t.Fatalf("failed to run initial migrations: %v", err)
		}

		// Check migration version
		var version int
		err := database.TestDB().QueryRow("SELECT MAX(version) FROM migrations").Scan(&version)
		if err != nil {
			t.Fatalf("failed to get migration version: %v", err)
		}

		if version != 2 { // Current number of migrations in production code
			t.Errorf("expected migration version 2, got %d", version)
		}

		// Verify number of migration entries matches versions applied
		var count int
		err = database.TestDB().QueryRow("SELECT COUNT(*) FROM migrations").Scan(&count)
		if err != nil {
			t.Fatalf("failed to count migrations: %v", err)
		}

		if count != 2 {
			t.Errorf("expected 2 migration entries, got %d", count)
		}
	})

	t.Run("migrations create expected schema", func(t *testing.T) {
		// Verify tables exist
		tables := []string{"users", "workspaces", "sessions", "system_settings", "migrations"}
		for _, table := range tables {
			if !tableExists(t, database, table) {
				t.Errorf("table %q does not exist", table)
			}
		}

		// Verify indexes
		indexes := []struct {
			table string
			name  string
		}{
			{"sessions", "idx_sessions_user_id"},
			{"sessions", "idx_sessions_expires_at"},
			{"sessions", "idx_sessions_refresh_token"},
		}

		for _, idx := range indexes {
			if !indexExists(t, database, idx.table, idx.name) {
				t.Errorf("index %q on table %q does not exist", idx.name, idx.table)
			}
		}
	})

	t.Run("migrations are idempotent", func(t *testing.T) {
		// Run migrations again
		if err := database.Migrate(); err != nil {
			t.Fatalf("failed to re-run migrations: %v", err)
		}

		// Verify migration count hasn't changed
		var count int
		err = database.TestDB().QueryRow("SELECT COUNT(*) FROM migrations").Scan(&count)
		if err != nil {
			t.Fatalf("failed to count migrations: %v", err)
		}

		if count != 2 {
			t.Errorf("expected 2 migration entries, got %d", count)
		}
	})

	t.Run("rollback on migration failure", func(t *testing.T) {
		// Create a test table that would conflict with a failing migration
		_, err := database.TestDB().Exec("CREATE TABLE test_rollback (id INTEGER PRIMARY KEY)")
		if err != nil {
			t.Fatalf("failed to create test table: %v", err)
		}

		// Start transaction
		tx, err := database.Begin()
		if err != nil {
			t.Fatalf("failed to start transaction: %v", err)
		}

		// Try operations that should fail and rollback
		_, err = tx.Exec(`
			CREATE TABLE test_rollback (id INTEGER PRIMARY KEY);
			INSERT INTO nonexistent_table VALUES (1);
		`)
		if err == nil {
			tx.Rollback()
			t.Fatal("expected migration to fail")
		}
		tx.Rollback()

		// Verify the migration version hasn't changed
		var version int
		err = database.TestDB().QueryRow("SELECT MAX(version) FROM migrations").Scan(&version)
		if err != nil {
			t.Fatalf("failed to get migration version: %v", err)
		}

		if version != 2 {
			t.Errorf("expected migration version to remain at 2, got %d", version)
		}
	})
}

func tableExists(t *testing.T, database db.TestDatabase, tableName string) bool {
	t.Helper()

	var name string
	err := database.TestDB().QueryRow(`
		SELECT name FROM sqlite_master 
		WHERE type='table' AND name=?`,
		tableName,
	).Scan(&name)

	return err == nil
}

func indexExists(t *testing.T, database db.TestDatabase, tableName, indexName string) bool {
	t.Helper()

	var name string
	err := database.TestDB().QueryRow(`
		SELECT name FROM sqlite_master 
		WHERE type='index' AND tbl_name=? AND name=?`,
		tableName, indexName,
	).Scan(&name)

	return err == nil
}
