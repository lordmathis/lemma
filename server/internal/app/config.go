package app

import (
	"fmt"
	"novamd/internal/logging"
	"novamd/internal/secrets"
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
	RootURL           string
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
		DBPath:            "./novamd.db",
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
		return fmt.Errorf("NOVAMD_ADMIN_EMAIL and NOVAMD_ADMIN_PASSWORD must be set")
	}

	// Validate encryption key
	if err := secrets.ValidateKey(c.EncryptionKey); err != nil {
		return fmt.Errorf("invalid NOVAMD_ENCRYPTION_KEY: %w", err)
	}

	return nil
}

// LoadConfig creates a new Config instance with values from environment variables
func LoadConfig() (*Config, error) {
	logging.Info("loading configuration from environment variables")
	config := DefaultConfig()

	if env := os.Getenv("NOVAMD_ENV"); env != "" {
		logging.Debug("loading config for environment", "env", env)
		config.IsDevelopment = env == "development"
	}

	if dbPath := os.Getenv("NOVAMD_DB_PATH"); dbPath != "" {
		logging.Debug("loading config for database path", "path", dbPath)
		config.DBPath = dbPath
	}

	if workDir := os.Getenv("NOVAMD_WORKDIR"); workDir != "" {
		logging.Debug("loading config for work directory", "dir", workDir)
		config.WorkDir = workDir
	}

	if staticPath := os.Getenv("NOVAMD_STATIC_PATH"); staticPath != "" {
		logging.Debug("loading config for static path", "path", staticPath)
		config.StaticPath = staticPath
	}

	if port := os.Getenv("NOVAMD_PORT"); port != "" {
		logging.Debug("loading config for port", "port", port)
		config.Port = port
	}

	if rootURL := os.Getenv("NOVAMD_ROOT_URL"); rootURL != "" {
		logging.Debug("loading config for root URL", "url", rootURL)
		config.RootURL = rootURL
	}

	if domain := os.Getenv("NOVAMD_DOMAIN"); domain != "" {
		logging.Debug("loading config for domain", "domain", domain)
		config.Domain = domain
	}

	if corsOrigins := os.Getenv("NOVAMD_CORS_ORIGINS"); corsOrigins != "" {
		logging.Debug("loading config for CORS origins", "origins", corsOrigins)
		config.CORSOrigins = strings.Split(corsOrigins, ",")
	}

	config.AdminEmail = os.Getenv("NOVAMD_ADMIN_EMAIL")
	config.AdminPassword = os.Getenv("NOVAMD_ADMIN_PASSWORD")
	config.EncryptionKey = os.Getenv("NOVAMD_ENCRYPTION_KEY")
	config.JWTSigningKey = os.Getenv("NOVAMD_JWT_SIGNING_KEY")

	logging.Debug("sensitive configuration loaded",
		"adminEmailSet", config.AdminEmail != "",
		"adminPasswordSet", config.AdminPassword != "",
		"encryptionKeySet", config.EncryptionKey != "",
		"jwtSigningKeySet", config.JWTSigningKey != "")

	// Configure rate limiting
	if reqStr := os.Getenv("NOVAMD_RATE_LIMIT_REQUESTS"); reqStr != "" {
		parsed, err := strconv.Atoi(reqStr)
		if err != nil {
			logging.Warn("invalid rate limit requests value, using default",
				"value", reqStr,
				"default", config.RateLimitRequests,
				"error", err)
		} else {
			logging.Debug("loading config for rate limit requests", "requests", parsed)
			config.RateLimitRequests = parsed
		}
	}

	if windowStr := os.Getenv("NOVAMD_RATE_LIMIT_WINDOW"); windowStr != "" {
		parsed, err := time.ParseDuration(windowStr)
		if err != nil {
			logging.Warn("invalid rate limit window value, using default",
				"value", windowStr,
				"default", config.RateLimitWindow,
				"error", err)
		} else {
			logging.Debug("loading config for rate limit window", "window", parsed)
			config.RateLimitWindow = parsed
		}
	}

	// Configure log level, if isDevelopment is set, default to debug
	if logLevel := os.Getenv("NOVAMD_LOG_LEVEL"); logLevel != "" {
		parsed := logging.ParseLogLevel(logLevel)
		logging.Debug("loading config for log level", "level", parsed)
		config.LogLevel = parsed
	} else if config.IsDevelopment {
		logging.Debug("setting log level to debug for development")
		config.LogLevel = logging.DEBUG
	} else {
		logging.Debug("setting log level to info for production")
		config.LogLevel = logging.INFO
	}

	// Validate all settings
	if err := config.validate(); err != nil {
		return nil, err
	}

	logging.Info("configuration loaded successfully")
	return config, nil
}
