// Package db provides the database access layer for the application. It contains methods for interacting with the database, such as creating, updating, and deleting records.
package db

import (
	"database/sql"

	"novamd/internal/models"
	"novamd/internal/secrets"

	_ "github.com/mattn/go-sqlite3" // SQLite driver
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

// database represents the database connection
type database struct {
	*sql.DB
	secretsService secrets.Service
}

// Init initializes the database connection
func Init(dbPath string, secretsService secrets.Service) (Database, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	database := &database{
		DB:             db,
		secretsService: secretsService,
	}

	return database, nil
}

// Close closes the database connection
func (db *database) Close() error {
	return db.DB.Close()
}

// Helper methods for token encryption/decryption
func (db *database) encryptToken(token string) (string, error) {
	if token == "" {
		return "", nil
	}
	return db.secretsService.Encrypt(token)
}

func (db *database) decryptToken(token string) (string, error) {
	if token == "" {
		return "", nil
	}
	return db.secretsService.Decrypt(token)
}
