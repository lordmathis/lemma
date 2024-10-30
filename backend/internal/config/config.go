package config

import (
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	DBPath        string
	WorkDir       string
	StaticPath    string
	Port          string
	AdminEmail    string
	AdminPassword string
}

func DefaultConfig() *Config {
	return &Config{
		DBPath:     "./novamd.db",
		WorkDir:    "./data",
		StaticPath: "../frontend/dist",
		Port:       "8080",
	}
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
	if config.AdminEmail == "" || config.AdminPassword == "" {
		return nil, fmt.Errorf("NOVAMD_ADMIN_EMAIL and NOVAMD_ADMIN_PASSWORD must be set")
	}

	return config, nil
}

func ensureDir(dir string) error {
	if dir == "" {
		return nil
	}
	return os.MkdirAll(dir, 0755)
}
