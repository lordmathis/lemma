// Package db provides the database access layer for the application. It contains methods for interacting with the database, such as creating, updating, and deleting records.
package db

import (
	"database/sql"
	"fmt"

	"lemma/internal/logging"
	"lemma/internal/models"
	"lemma/internal/secrets"

	_ "github.com/mattn/go-sqlite3" // SQLite driver
)

type DBType string

const (
	DBTypeSQLite   DBType = "sqlite3"
	DBTypePostgres DBType = "postgres"
)

// UserStore defines the methods for interacting with user data in the database
type UserStore interface {
	CreateUser(user *models.User) (*models.User, error)
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(userID int) (*models.User, error)
	GetAllUsers() ([]*models.User, error)
	UpdateUser(user *models.User) error
	DeleteUser(userID int) error
	UpdateLastWorkspace(userID int, workspaceName string) error
	GetLastWorkspaceName(userID int) (string, error)
	CountAdminUsers() (int, error)
}

// WorkspaceReader defines the methods for reading workspace data from the database
type WorkspaceReader interface {
	GetWorkspaceByID(workspaceID int) (*models.Workspace, error)
	GetWorkspaceByName(userID int, workspaceName string) (*models.Workspace, error)
	GetWorkspacesByUserID(userID int) ([]*models.Workspace, error)
	GetAllWorkspaces() ([]*models.Workspace, error)
}

// WorkspaceWriter defines the methods for writing workspace data to the database
type WorkspaceWriter interface {
	CreateWorkspace(workspace *models.Workspace) error
	UpdateWorkspace(workspace *models.Workspace) error
	DeleteWorkspace(workspaceID int) error
	UpdateWorkspaceSettings(workspace *models.Workspace) error
	DeleteWorkspaceTx(tx *sql.Tx, workspaceID int) error
	UpdateLastWorkspaceTx(tx *sql.Tx, userID, workspaceID int) error
	UpdateLastOpenedFile(workspaceID int, filePath string) error
	GetLastOpenedFile(workspaceID int) (string, error)
}

// WorkspaceStore defines the methods for interacting with workspace data in the database
type WorkspaceStore interface {
	WorkspaceReader
	WorkspaceWriter
}

// SessionStore defines the methods for interacting with jwt sessions in the database
type SessionStore interface {
	CreateSession(session *models.Session) error
	GetSessionByRefreshToken(refreshToken string) (*models.Session, error)
	GetSessionByID(sessionID string) (*models.Session, error)
	DeleteSession(sessionID string) error
	CleanExpiredSessions() error
}

// SystemStore defines the methods for interacting with system settings and stats in the database
type SystemStore interface {
	GetSystemStats() (*UserStats, error)
	EnsureJWTSecret() (string, error)
	GetSystemSetting(key string) (string, error)
	SetSystemSetting(key, value string) error
}

// Database defines the methods for interacting with the database
type Database interface {
	UserStore
	WorkspaceStore
	SessionStore
	SystemStore
	Begin() (*sql.Tx, error)
	Close() error
	Migrate() error
}

// Verify that the database implements the required interfaces
var (
	// Main Database interface
	_ Database = (*database)(nil)

	// Component interfaces
	_ UserStore      = (*database)(nil)
	_ WorkspaceStore = (*database)(nil)
	_ SessionStore   = (*database)(nil)
	_ SystemStore    = (*database)(nil)

	// Sub-interfaces
	_ WorkspaceReader = (*database)(nil)
	_ WorkspaceWriter = (*database)(nil)
)

var logger logging.Logger

func getLogger() logging.Logger {
	if logger == nil {
		logger = logging.WithGroup("db")
	}
	return logger
}

// database represents the database connection
type database struct {
	*sql.DB
	secretsService secrets.Service
	dbType         DBType
}

// Init initializes the database connection
func Init(dbPath string, secretsService secrets.Service) (Database, error) {
	log := getLogger()

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Enable foreign keys for this connection
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}
	log.Debug("foreign keys enabled")

	database := &database{
		DB:             db,
		secretsService: secretsService,
	}

	return database, nil
}

// Close closes the database connection
func (db *database) Close() error {
	log := getLogger()
	log.Info("closing database connection")

	if err := db.DB.Close(); err != nil {
		return fmt.Errorf("failed to close database: %w", err)
	}
	return nil
}

// Helper methods for token encryption/decryption
func (db *database) encryptToken(token string) (string, error) {
	if token == "" {
		return "", nil
	}

	encrypted, err := db.secretsService.Encrypt(token)
	if err != nil {
		return "", fmt.Errorf("failed to encrypt token: %w", err)
	}

	return encrypted, nil
}

func (db *database) decryptToken(token string) (string, error) {
	if token == "" {
		return "", nil
	}

	decrypted, err := db.secretsService.Decrypt(token)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt token: %w", err)
	}

	return decrypted, nil
}
