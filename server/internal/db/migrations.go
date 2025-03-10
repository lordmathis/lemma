package db

import (
	"embed"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/sqlite/*.sql migrations/postgres/*.sql
var migrationsFS embed.FS

// Migrate applies all database migrations
func (db *database) Migrate() error {
	log := getLogger().WithGroup("migrations")
	log.Info("starting database migration")

	var migrationPath string
	switch db.dbType {
	case DBTypePostgres:
		migrationPath = "migrations/postgres"
	case DBTypeSQLite:
		migrationPath = "migrations/sqlite"
	default:
		return fmt.Errorf("unsupported database driver: %s", db.dbType)
	}

	log.Debug("using migration path", "path", migrationPath)

	sourceInstance, err := iofs.New(migrationsFS, migrationPath)
	if err != nil {
		return fmt.Errorf("failed to create source instance: %w", err)
	}

	var m *migrate.Migrate

	switch db.dbType {
	case DBTypePostgres:
		driver, err := postgres.WithInstance(db.DB, &postgres.Config{})
		if err != nil {
			return fmt.Errorf("failed to create postgres driver: %w", err)
		}
		m, err = migrate.NewWithInstance("iofs", sourceInstance, "postgres", driver)
		if err != nil {
			return fmt.Errorf("failed to create migrate instance: %w", err)
		}

	case DBTypeSQLite:
		driver, err := sqlite3.WithInstance(db.DB, &sqlite3.Config{})
		if err != nil {
			return fmt.Errorf("failed to create sqlite driver: %w", err)
		}
		m, err = migrate.NewWithInstance("iofs", sourceInstance, "sqlite3", driver)
		if err != nil {
			return fmt.Errorf("failed to create migrate instance: %w", err)
		}

	default:
		return fmt.Errorf("unsupported database driver: %s", db.dbType)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Info("database migration completed")
	return nil
}
