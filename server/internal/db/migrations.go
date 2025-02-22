package db

import (
	"embed"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Migrate applies all database migrations
func (db *database) Migrate() error {
	log := getLogger().WithGroup("migrations")
	log.Info("starting database migration")

	sourceInstance, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("failed to create source instance: %w", err)
	}

	var m *migrate.Migrate

	driverName := db.dbType
	switch driverName {
	case "postgres":
		driver, err := postgres.WithInstance(db.DB, &postgres.Config{})
		if err != nil {
			return fmt.Errorf("failed to create postgres driver: %w", err)
		}
		m, err = migrate.NewWithInstance("iofs", sourceInstance, "postgres", driver)
		if err != nil {
			return fmt.Errorf("failed to create migrate instance: %w", err)
		}

	case "sqlite3":
		driver, err := sqlite3.WithInstance(db.DB, &sqlite3.Config{})
		if err != nil {
			return fmt.Errorf("failed to create sqlite driver: %w", err)
		}
		m, err = migrate.NewWithInstance("iofs", sourceInstance, "sqlite3", driver)
		if err != nil {
			return fmt.Errorf("failed to create migrate instance: %w", err)
		}

	default:
		return fmt.Errorf("unsupported database driver: %s", driverName)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Info("database migration completed")
	return nil
}
