package app

import (
	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/storage"
)

// Options holds all dependencies and configuration for the server
type Options struct {
	Config         *Config
	Database       db.Database
	Storage        storage.Manager
	JWTManager     auth.JWTManager
	SessionService *auth.SessionService
}

// DefaultOptions creates server options with default configuration
func DefaultOptions(cfg *Config) (*Options, error) {
	// Initialize secrets service
	secretsService, err := initSecretsService(cfg)
	if err != nil {
		return nil, err
	}

	// Initialize database
	database, err := initDatabase(cfg, secretsService)
	if err != nil {
		return nil, err
	}

	// Initialize storage
	storageManager := storage.NewService(cfg.WorkDir)

	// Initialize auth services
	jwtManager, sessionService, err := initAuth(cfg, database)
	if err != nil {
		return nil, err
	}

	// Setup admin user
	if err := setupAdminUser(database, storageManager, cfg); err != nil {
		return nil, err
	}

	return &Options{
		Config:         cfg,
		Database:       database,
		Storage:        storageManager,
		JWTManager:     jwtManager,
		SessionService: sessionService,
	}, nil
}
