package db

import (
	"fmt"
)

// Migration represents a database migration
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
				git_commit_name TEXT,
                git_commit_email TEXT,
                show_hidden_files BOOLEAN NOT NULL DEFAULT 0,
                created_by INTEGER REFERENCES users(id),
                updated_by INTEGER REFERENCES users(id),
                updated_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            -- Create sessions table for authentication
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                refresh_token TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );

            -- Create system_settings table for application settings
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create indexes for performance
            CREATE INDEX idx_sessions_user_id ON sessions(user_id);
            CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
            CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
        `,
	},
}

// Migrate applies all database migrations
func (db *database) Migrate() error {
	log := getLogger().WithGroup("migrations")
	log.Info("starting database migration")

	// Create migrations table if it doesn't exist
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY
    )`)
	if err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Get current version
	var currentVersion int
	err = db.QueryRow("SELECT COALESCE(MAX(version), 0) FROM migrations").Scan(&currentVersion)
	if err != nil {
		return fmt.Errorf("failed to get current migration version: %w", err)
	}

	// Apply new migrations
	for _, migration := range migrations {
		if migration.Version > currentVersion {
			log := log.With("migration_version", migration.Version)
			tx, err := db.Begin()
			if err != nil {
				return fmt.Errorf("failed to begin transaction for migration %d: %w", migration.Version, err)
			}

			// Execute migration SQL
			_, err = tx.Exec(migration.SQL)
			if err != nil {
				if rbErr := tx.Rollback(); rbErr != nil {
					return fmt.Errorf("migration %d failed: %v, rollback failed: %v",
						migration.Version, err, rbErr)
				}
				return fmt.Errorf("migration %d failed: %w", migration.Version, err)
			}

			// Update migrations table
			_, err = tx.Exec("INSERT INTO migrations (version) VALUES (?)", migration.Version)
			if err != nil {
				if rbErr := tx.Rollback(); rbErr != nil {
					return fmt.Errorf("failed to update migration version: %v, rollback failed: %v",
						err, rbErr)
				}
				return fmt.Errorf("failed to update migration version: %w", err)
			}

			// Commit transaction
			err = tx.Commit()
			if err != nil {
				return fmt.Errorf("failed to commit migration %d: %w", migration.Version, err)
			}

			currentVersion = migration.Version
			log.Debug("migration applied", "new_version", currentVersion)
		}
	}

	log.Info("database migration completed", "final_version", currentVersion)
	return nil
}
