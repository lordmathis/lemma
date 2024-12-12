package app

import (
	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/logging"
	"novamd/internal/storage"
)

// Options holds all dependencies and configuration for the server
type Options struct {
	Config         *Config
	Database       db.Database
	Storage        storage.Manager
	Logger         logging.Logger
	JWTManager     auth.JWTManager
	SessionManager auth.SessionManager
	CookieService  auth.CookieManager
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

	// Initialize logger
	logger, err := logging.New(cfg.LogDir, cfg.LogLevel, cfg.ConsoleOutput)
	if err != nil {
		return nil, err
	}

	// Initialize auth services
	jwtManager, sessionService, cookieService, err := initAuth(cfg, database)
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
		Logger:         logger,
		JWTManager:     jwtManager,
		SessionManager: sessionService,
		CookieService:  cookieService,
	}, nil
}
