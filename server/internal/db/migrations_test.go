package db_test

import (
	"lemma/internal/db"
	_ "lemma/internal/testenv"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestMigrate(t *testing.T) {
	database, err := db.NewTestSQLiteDB(&mockSecrets{})
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer database.Close()

	t.Run("migrations create expected schema", func(t *testing.T) {
		// Run migrations
		if err := database.Migrate(); err != nil {
			t.Fatalf("failed to run migrations: %v", err)
		}

		// Verify tables exist
		tables := []string{
			"users",
			"workspaces",
			"sessions",
			"system_settings",
			"schema_migrations",
		}

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
			{"workspaces", "idx_workspaces_user_id"},
		}
		for _, idx := range indexes {
			if !indexExists(t, database, idx.table, idx.name) {
				t.Errorf("index %q on table %q does not exist", idx.name, idx.table)
			}
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
