package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"novamd/internal/crypto"
)

type Config struct {
	DBPath            string
	WorkDir           string
	StaticPath        string
	Port              string
	AdminEmail        string
	AdminPassword     string
	EncryptionKey     string
	JWTSigningKey     string
	RateLimitRequests int
	RateLimitWindow   time.Duration
}

func DefaultConfig() *Config {
	return &Config{
		DBPath:            "./novamd.db",
		WorkDir:           "./data",
		StaticPath:        "../frontend/dist",
		Port:              "8080",
		RateLimitRequests: int(10),
		RateLimitWindow:   time.Minute,
	}
}

func (c *Config) Validate() error {
	if c.AdminEmail == "" || c.AdminPassword == "" {
		return fmt.Errorf("NOVAMD_ADMIN_EMAIL and NOVAMD_ADMIN_PASSWORD must be set")
	}

	// Validate encryption key
	if err := crypto.ValidateKey(c.EncryptionKey); err != nil {
		return fmt.Errorf("invalid NOVAMD_ENCRYPTION_KEY: %w", err)
	}

	return nil
}

// Load creates a new Config instance with values from environment variables
func Load() (*Config, error) {
	config := DefaultConfig()

	if dbPath := os.Getenv("NOVAMD_DB_PATH"); dbPath != "" {
		config.DBPath = dbPath
	}
	if err := ensureDir(filepath.Dir(config.DBPath)); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	if workDir := os.Getenv("NOVAMD_WORKDIR"); workDir != "" {
		config.WorkDir = workDir
	}
	if err := ensureDir(config.WorkDir); err != nil {
		return nil, fmt.Errorf("failed to create work directory: %w", err)
	}

	if staticPath := os.Getenv("NOVAMD_STATIC_PATH"); staticPath != "" {
		config.StaticPath = staticPath
	}

	if port := os.Getenv("NOVAMD_PORT"); port != "" {
		config.Port = port
	}

	config.AdminEmail = os.Getenv("NOVAMD_ADMIN_EMAIL")
	config.AdminPassword = os.Getenv("NOVAMD_ADMIN_PASSWORD")
	config.EncryptionKey = os.Getenv("NOVAMD_ENCRYPTION_KEY")
	config.JWTSigningKey = os.Getenv("NOVAMD_JWT_SIGNING_KEY")

	// Configure rate limiting
	if reqStr := os.Getenv("NOVAMD_RATE_LIMIT_REQUESTS"); reqStr != "" {
		if parsed, err := strconv.Atoi(reqStr); err == nil {
			config.RateLimitRequests = parsed
		}
	}

	if windowStr := os.Getenv("NOVAMD_RATE_LIMIT_WINDOW"); windowStr != "" {
		if parsed, err := time.ParseDuration(windowStr); err == nil {
			config.RateLimitWindow = parsed
		}
	}

	// Validate all settings
	if err := config.Validate(); err != nil {
		return nil, err
	}

	return config, nil
}

func ensureDir(dir string) error {
	if dir == "" {
		return nil
	}
	return os.MkdirAll(dir, 0755)
}
