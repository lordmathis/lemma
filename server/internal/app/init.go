// Package app provides application-level functionality for initializing and running the server
package app

import (
	"database/sql"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/logging"
	"novamd/internal/models"
	"novamd/internal/secrets"
	"novamd/internal/storage"
)

// initSecretsService initializes the secrets service
func initSecretsService(cfg *Config) (secrets.Service, error) {
	logging.Debug("initializing secrets service")
	secretsService, err := secrets.NewService(cfg.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize secrets service: %w", err)
	}
	logging.Debug("secrets service initialized")
	return secretsService, nil
}

// initDatabase initializes and migrates the database
func initDatabase(cfg *Config, secretsService secrets.Service) (db.Database, error) {
	logging.Debug("initializing database", "path", cfg.DBPath)

	database, err := db.Init(cfg.DBPath, secretsService)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	logging.Debug("running database migrations")
	if err := database.Migrate(); err != nil {
		return nil, fmt.Errorf("failed to apply database migrations: %w", err)
	}

	logging.Debug("database initialization complete")
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
		logging.Debug("no JWT signing key provided, generating new key")
		var err error
		signingKey, err = database.EnsureJWTSecret()
		if err != nil {
			return nil, nil, nil, fmt.Errorf("failed to ensure JWT secret: %w", err)
		}
		logging.Debug("JWT signing key generated")
	}

	logging.Debug("initializing JWT service",
		"accessTokenExpiry", accessTokeExpiry.String(),
		"refreshTokenExpiry", refreshTokenExpiry.String())

	// Initialize JWT service
	jwtManager, err := auth.NewJWTService(auth.JWTConfig{
		SigningKey:         signingKey,
		AccessTokenExpiry:  accessTokeExpiry,
		RefreshTokenExpiry: refreshTokenExpiry,
	})
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to initialize JWT service: %w", err)
	}

	// Initialize session service
	logging.Debug("initializing session service")
	sessionManager := auth.NewSessionService(database, jwtManager)

	// Initialize cookie service
	logging.Debug("initializing cookie service",
		"isDevelopment", cfg.IsDevelopment,
		"domain", cfg.Domain)
	cookieService := auth.NewCookieService(cfg.IsDevelopment, cfg.Domain)

	logging.Debug("authentication services initialized")
	return jwtManager, sessionManager, cookieService, nil
}

// setupAdminUser creates the admin user if it doesn't exist
func setupAdminUser(database db.Database, storageManager storage.Manager, cfg *Config) error {
	logging.Debug("checking for existing admin user", "email", cfg.AdminEmail)

	// Check if admin user exists
	adminUser, err := database.GetUserByEmail(cfg.AdminEmail)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("failed to check for existing admin user: %w", err)
	}

	if adminUser != nil {
		logging.Debug("admin user already exists", "userId", adminUser.ID)
		return nil
	}

	logging.Debug("creating new admin user")

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
	}

	createdUser, err := database.CreateUser(adminUser)
	if err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	logging.Debug("admin user created",
		"userId", createdUser.ID,
		"workspaceId", createdUser.LastWorkspaceID)

	// Initialize workspace directory
	logging.Debug("initializing admin workspace directory",
		"userId", createdUser.ID,
		"workspaceId", createdUser.LastWorkspaceID)

	err = storageManager.InitializeUserWorkspace(createdUser.ID, createdUser.LastWorkspaceID)
	if err != nil {
		return fmt.Errorf("failed to initialize admin workspace: %w", err)
	}

	logging.Info("admin user setup completed",
		"userId", createdUser.ID,
		"workspaceId", createdUser.LastWorkspaceID)

	return nil
}
