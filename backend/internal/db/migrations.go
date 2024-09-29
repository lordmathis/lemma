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
