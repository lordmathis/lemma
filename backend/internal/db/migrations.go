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
		SQL: `
		-- Create users table
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			display_name TEXT,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL CHECK(role IN ('admin', 'editor', 'viewer')),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			last_workspace_id INTEGER
		);

		-- Create workspaces table with integrated settings
		CREATE TABLE IF NOT EXISTS workspaces (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			last_opened_file_path TEXT,
			-- Settings fields
			theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark')),
			auto_save BOOLEAN NOT NULL DEFAULT 0,
			git_enabled BOOLEAN NOT NULL DEFAULT 0,
			git_url TEXT,
			git_user TEXT,
			git_token TEXT,
			git_auto_commit BOOLEAN NOT NULL DEFAULT 0,
			git_commit_msg_template TEXT DEFAULT '${action} ${filename}',
			FOREIGN KEY (user_id) REFERENCES users (id)
		);
		`,
	},
	{
		Version: 2,
		SQL: `
		-- Create sessions table for authentication
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL,
			refresh_token TEXT NOT NULL,
			expires_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
		);

		-- Add indexes for performance
		CREATE INDEX idx_sessions_user_id ON sessions(user_id);
		CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
		CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);

		-- Add audit fields to workspaces
		ALTER TABLE workspaces ADD COLUMN created_by INTEGER REFERENCES users(id);
		ALTER TABLE workspaces ADD COLUMN updated_by INTEGER REFERENCES users(id);
		ALTER TABLE workspaces ADD COLUMN updated_at TIMESTAMP;
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
