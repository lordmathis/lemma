package app

import (
	"fmt"
	"lemma/internal/logging"
	"lemma/internal/secrets"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds the configuration for the application
type Config struct {
	DBPath            string
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
		DBPath:            "./lemma.db",
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

// LoadConfig creates a new Config instance with values from environment variables
func LoadConfig() (*Config, error) {
	config := DefaultConfig()

	if env := os.Getenv("LEMMA_ENV"); env != "" {
		config.IsDevelopment = env == "development"
	}

	if dbPath := os.Getenv("LEMMA_DB_PATH"); dbPath != "" {
		config.DBPath = dbPath
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
