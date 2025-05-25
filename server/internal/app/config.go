package app

import (
	"fmt"
	"lemma/internal/db"
	"lemma/internal/logging"
	"lemma/internal/secrets"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Config holds the configuration for the application
type Config struct {
	DBURL             string
	DBType            db.DBType
	WorkDir           string
	StaticPath        string
	Port              string
	Domain            string
	CORSOrigins       []string
	AdminEmail        string
	AdminPassword     string
	EncryptionKey     string
	JWTSigningKey     string
	RateLimitRequests int
	RateLimitWindow   time.Duration
	IsDevelopment     bool
	LogLevel          logging.LogLevel
}

// DefaultConfig returns a new Config instance with default values
func DefaultConfig() *Config {
	return &Config{
		DBURL:             "sqlite://lemma.db",
		DBType:            db.DBTypeSQLite,
		WorkDir:           "./data",
		StaticPath:        "../app/dist",
		Port:              "8080",
		RateLimitRequests: 100,
		RateLimitWindow:   time.Minute * 15,
		IsDevelopment:     false,
	}
}

// validate checks if the configuration is valid
func (c *Config) validate() error {
	if c.AdminEmail == "" || c.AdminPassword == "" {
		return fmt.Errorf("LEMMA_ADMIN_EMAIL and LEMMA_ADMIN_PASSWORD must be set")
	}

	// Validate encryption key
	if err := secrets.ValidateKey(c.EncryptionKey); err != nil {
		return fmt.Errorf("invalid LEMMA_ENCRYPTION_KEY: %w", err)
	}

	return nil
}

// Redact redacts sensitive fields from a Config instance
func (c *Config) Redact() *Config {
	redacted := *c
	redacted.AdminPassword = "[REDACTED]"
	redacted.AdminEmail = "[REDACTED]"
	redacted.EncryptionKey = "[REDACTED]"
	redacted.JWTSigningKey = "[REDACTED]"
	return &redacted
}

// ParseDBURL parses a database URL and returns the driver name and data source
func ParseDBURL(dbURL string) (db.DBType, string, error) {
	if strings.HasPrefix(dbURL, "sqlite://") || strings.HasPrefix(dbURL, "sqlite3://") {

		path := strings.TrimPrefix(dbURL, "sqlite://")
		path = strings.TrimPrefix(path, "sqlite3://")

		if path == ":memory:" {
			return db.DBTypeSQLite, path, nil
		}

		if !filepath.IsAbs(path) {
			path = filepath.Clean(path)
		}
		return db.DBTypeSQLite, path, nil
	}

	// Try to parse as postgres URL
	if strings.HasPrefix(dbURL, "postgres://") || strings.HasPrefix(dbURL, "postgresql://") {
		return db.DBTypePostgres, dbURL, nil
	}

	return "", "", fmt.Errorf("unsupported database URL format: %s", dbURL)
}

// LoadConfig creates a new Config instance with values from environment variables
func LoadConfig() (*Config, error) {
	config := DefaultConfig()

	if env := os.Getenv("LEMMA_ENV"); env != "" {
		config.IsDevelopment = env == "development"
	}

	if dbURL := os.Getenv("LEMMA_DB_URL"); dbURL != "" {
		dbType, dataSource, err := ParseDBURL(dbURL)
		if err != nil {
			return nil, err
		}
		config.DBURL = dataSource
		config.DBType = dbType
	}

	if workDir := os.Getenv("LEMMA_WORKDIR"); workDir != "" {
		config.WorkDir = workDir
	}

	if staticPath := os.Getenv("LEMMA_STATIC_PATH"); staticPath != "" {
		config.StaticPath = staticPath
	}

	if port := os.Getenv("LEMMA_PORT"); port != "" {
		config.Port = port
	}

	if domain := os.Getenv("LEMMA_DOMAIN"); domain != "" {
		config.Domain = domain
	}

	if corsOrigins := os.Getenv("LEMMA_CORS_ORIGINS"); corsOrigins != "" {
		config.CORSOrigins = strings.Split(corsOrigins, ",")
	}

	config.AdminEmail = os.Getenv("LEMMA_ADMIN_EMAIL")
	config.AdminPassword = os.Getenv("LEMMA_ADMIN_PASSWORD")
	config.EncryptionKey = os.Getenv("LEMMA_ENCRYPTION_KEY")
	config.JWTSigningKey = os.Getenv("LEMMA_JWT_SIGNING_KEY")

	// Configure rate limiting
	if reqStr := os.Getenv("LEMMA_RATE_LIMIT_REQUESTS"); reqStr != "" {
		parsed, err := strconv.Atoi(reqStr)
		if err == nil {
			config.RateLimitRequests = parsed
		}
	}

	if windowStr := os.Getenv("LEMMA_RATE_LIMIT_WINDOW"); windowStr != "" {
		parsed, err := time.ParseDuration(windowStr)
		if err == nil {
			config.RateLimitWindow = parsed
		}
	}

	// Configure log level, if isDevelopment is set, default to debug
	if logLevel := os.Getenv("LEMMA_LOG_LEVEL"); logLevel != "" {
		parsed := logging.ParseLogLevel(logLevel)
		config.LogLevel = parsed
	} else if config.IsDevelopment {
		config.LogLevel = logging.DEBUG
	} else {
		config.LogLevel = logging.INFO
	}

	// Validate all settings
	if err := config.validate(); err != nil {
		return nil, err
	}

	return config, nil
}
