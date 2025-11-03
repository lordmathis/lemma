// Package app provides application-level functionality for initializing and running the server
package app

import (
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"lemma/internal/auth"
	"lemma/internal/db"
	"lemma/internal/logging"
	"lemma/internal/models"
	"lemma/internal/secrets"
	"lemma/internal/storage"
)

// initSecretsService initializes the secrets service
func initSecretsService(cfg *Config) (secrets.Service, error) {
	logging.Debug("initializing secrets service")

	// Get or generate encryption key
	encryptionKey := cfg.EncryptionKey
	if encryptionKey == "" {
		logging.Debug("no encryption key provided, loading/generating from file")

		// Load or generate key from file
		secretsDir := cfg.WorkDir + "/secrets"
		var err error
		encryptionKey, err = secrets.EnsureEncryptionKey(secretsDir)
		if err != nil {
			return nil, fmt.Errorf("failed to ensure encryption key: %w", err)
		}
	}

	secretsService, err := secrets.NewService(encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize secrets service: %w", err)
	}
	return secretsService, nil
}

// initDatabase initializes and migrates the database
func initDatabase(cfg *Config, secretsService secrets.Service) (db.Database, error) {
	logging.Debug("initializing database", "path", cfg.DBURL)

	database, err := db.Init(cfg.DBType, cfg.DBURL, secretsService)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	if err := database.Migrate(); err != nil {
		return nil, fmt.Errorf("failed to apply database migrations: %w", err)
	}

	return database, nil
}

// initAuth initializes JWT and session services
func initAuth(cfg *Config, database db.Database) (auth.JWTManager, auth.SessionManager, auth.CookieManager, error) {
	logging.Debug("initializing authentication services")

	accessTokeExpiry := 15 * time.Minute
	refreshTokenExpiry := 7 * 24 * time.Hour

	// Get or generate JWT signing key
	signingKey := cfg.JWTSigningKey
	if signingKey == "" {
		logging.Debug("no JWT signing key provided, loading/generating from file")

		// Load or generate key from file
		secretsDir := cfg.WorkDir + "/secrets"
		var err error
		signingKey, err = secrets.EnsureJWTSigningKey(secretsDir)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("failed to ensure JWT signing key: %w", err)
		}
	}

	jwtManager, err := auth.NewJWTService(auth.JWTConfig{
		SigningKey:         signingKey,
		AccessTokenExpiry:  accessTokeExpiry,
		RefreshTokenExpiry: refreshTokenExpiry,
	})
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to initialize JWT service: %w", err)
	}

	sessionManager := auth.NewSessionService(database, jwtManager)
	cookieService := auth.NewCookieService(cfg.IsDevelopment, cfg.Domain)

	return jwtManager, sessionManager, cookieService, nil
}

// setupAdminUser creates the admin user if it doesn't exist
func setupAdminUser(database db.Database, storageManager storage.Manager, cfg *Config) error {
	// Check if admin user exists
	adminUser, err := database.GetUserByEmail(cfg.AdminEmail)
	if err != nil && !strings.Contains(err.Error(), "user not found") {
		return fmt.Errorf("failed to check for existing admin user: %w", err)
	}

	if adminUser != nil {
		logging.Debug("admin user already exists", "userId", adminUser.ID)
		return nil
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	// Create admin user
	adminUser = &models.User{
		Email:        cfg.AdminEmail,
		DisplayName:  "Admin",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleAdmin,
		Theme:        "dark", // default theme
	}

	createdUser, err := database.CreateUser(adminUser)
	if err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	err = storageManager.InitializeUserWorkspace(createdUser.ID, createdUser.LastWorkspaceID)
	if err != nil {
		return fmt.Errorf("failed to initialize admin workspace: %w", err)
	}

	logging.Info("admin user setup completed",
		"userId", createdUser.ID,
		"workspaceId", createdUser.LastWorkspaceID,
		"theme", createdUser.Theme)

	return nil
}
