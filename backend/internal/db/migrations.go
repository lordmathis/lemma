package db

import (
	"fmt"
	"log"
)

type Migration struct {
	Version int
	SQL     string
}

var migrations = []Migration{
	{
		Version: 1,
		SQL: `CREATE TABLE IF NOT EXISTS settings (
			user_id INTEGER PRIMARY KEY,
			settings JSON NOT NULL
		)`,
	},
	{
		Version: 2,
		SQL: `
		-- Create users table
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		-- Create workspaces table
		CREATE TABLE IF NOT EXISTS workspaces (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users (id)
		);

		-- Create workspace_settings table
		CREATE TABLE IF NOT EXISTS workspace_settings (
			workspace_id INTEGER PRIMARY KEY,
			settings JSON NOT NULL,
			FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
		);

		-- Migrate existing settings to a default user and workspace
		INSERT INTO users (username, email, password_hash) 
		VALUES ('default_user', 'default@example.com', 'placeholder_hash');

		INSERT INTO workspaces (user_id, name, root_path) 
		SELECT 1, 'Default Workspace'
		WHERE NOT EXISTS (SELECT 1 FROM workspaces);

		INSERT INTO workspace_settings (workspace_id, settings)
		SELECT w.id, s.settings
		FROM workspaces w
		CROSS JOIN settings s
		WHERE w.name = 'Default Workspace'
		  AND NOT EXISTS (SELECT 1 FROM workspace_settings);

		-- Drop the old settings table
		DROP TABLE IF EXISTS settings;
		`,
	},
}

func (db *DB) Migrate() error {
	// Create migrations table if it doesn't exist
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS migrations (
		version INTEGER PRIMARY KEY
	)`)
	if err != nil {
		return err
	}

	// Get current version
	var currentVersion int
	err = db.QueryRow("SELECT COALESCE(MAX(version), 0) FROM migrations").Scan(&currentVersion)
	if err != nil {
		return err
	}

	// Apply new migrations
	for _, migration := range migrations {
		if migration.Version > currentVersion {
			log.Printf("Applying migration %d", migration.Version)

			tx, err := db.Begin()
			if err != nil {
				return err
			}

			_, err = tx.Exec(migration.SQL)
			if err != nil {
				if rbErr := tx.Rollback(); rbErr != nil {
					return fmt.Errorf("migration %d failed: %v, rollback failed: %v", migration.Version, err, rbErr)
				}
				return fmt.Errorf("migration %d failed: %v", migration.Version, err)
			}

			_, err = tx.Exec("INSERT INTO migrations (version) VALUES (?)", migration.Version)
			if err != nil {
				if rbErr := tx.Rollback(); rbErr != nil {
					return fmt.Errorf("failed to update migration version: %v, rollback failed: %v", err, rbErr)
				}
				return fmt.Errorf("failed to update migration version: %v", err)
			}

			err = tx.Commit()
			if err != nil {
				return fmt.Errorf("failed to commit migration %d: %v", migration.Version, err)
			}

			currentVersion = migration.Version
		}
	}

	log.Printf("Database is at version %d", currentVersion)
	return nil
}
