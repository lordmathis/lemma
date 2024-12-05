// Package app provides application-level functionality for initializing and running the server
package app

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"

	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/models"
	"novamd/internal/secrets"
	"novamd/internal/storage"
)

// initSecretsService initializes the secrets service
func initSecretsService(cfg *Config) (secrets.Service, error) {
	secretsService, err := secrets.NewService(cfg.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize secrets service: %w", err)
	}
	return secretsService, nil
}

// initDatabase initializes and migrates the database
func initDatabase(cfg *Config, secretsService secrets.Service) (db.Database, error) {
	database, err := db.Init(cfg.DBPath, secretsService)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	if err := database.Migrate(); err != nil {
		return nil, fmt.Errorf("failed to apply database migrations: %w", err)
	}

	return database, nil
}

// initAuth initializes JWT and session services
func initAuth(cfg *Config, database db.Database) (auth.JWTManager, *auth.SessionService, auth.CookieService, error) {
	// Get or generate JWT signing key
	signingKey := cfg.JWTSigningKey
	if signingKey == "" {
		var err error
		signingKey, err = database.EnsureJWTSecret()
		if err != nil {
			return nil, nil, nil, fmt.Errorf("failed to ensure JWT secret: %w", err)
		}
	}

	// Initialize JWT service
	jwtManager, err := auth.NewJWTService(auth.JWTConfig{
		SigningKey:         signingKey,
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 7 * 24 * time.Hour,
	})
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to initialize JWT service: %w", err)
	}

	// Initialize session service
	sessionService := auth.NewSessionService(database, jwtManager)

	// Cookie service
	cookieService := auth.NewCookieService(cfg.IsDevelopment, cfg.Domain)

	return jwtManager, sessionService, cookieService, nil
}

// setupAdminUser creates the admin user if it doesn't exist
func setupAdminUser(database db.Database, storageManager storage.Manager, cfg *Config) error {
	adminEmail := cfg.AdminEmail
	adminPassword := cfg.AdminPassword

	// Check if admin user exists
	adminUser, err := database.GetUserByEmail(adminEmail)
	if adminUser != nil {
		return nil // Admin user already exists
	} else if err != sql.ErrNoRows {
		return err
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Create admin user
	adminUser = &models.User{
		Email:        adminEmail,
		DisplayName:  "Admin",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleAdmin,
	}

	createdUser, err := database.CreateUser(adminUser)
	if err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	// Initialize workspace directory
	err = storageManager.InitializeUserWorkspace(createdUser.ID, createdUser.LastWorkspaceID)
	if err != nil {
		return fmt.Errorf("failed to initialize admin workspace: %w", err)
	}

	log.Printf("Created admin user with ID: %d and default workspace with ID: %d", createdUser.ID, createdUser.LastWorkspaceID)

	return nil
}
