package app_test

import (
	"lemma/internal/app"
	"lemma/internal/db"
	"os"
	"testing"
	"time"

	_ "lemma/internal/testenv"
)

func TestDefaultConfig(t *testing.T) {
	cfg := app.DefaultConfig()

	tests := []struct {
		name     string
		got      any
		expected any
	}{
		{"DBPath", cfg.DBURL, "sqlite://lemma.db"},
		{"WorkDir", cfg.WorkDir, "./data"},
		{"StaticPath", cfg.StaticPath, "../app/dist"},
		{"Port", cfg.Port, "8080"},
		{"RateLimitRequests", cfg.RateLimitRequests, 100},
		{"RateLimitWindow", cfg.RateLimitWindow, time.Minute * 15},
		{"IsDevelopment", cfg.IsDevelopment, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("DefaultConfig().%s = %v, want %v", tt.name, tt.got, tt.expected)
			}
		})
	}
}

// setEnv is a helper function to set environment variables and check for errors
func setEnv(t *testing.T, key, value string) {
	if err := os.Setenv(key, value); err != nil {
		t.Fatalf("Failed to set environment variable %s: %v", key, err)
	}
}

func TestLoad(t *testing.T) {
	// Helper function to reset environment variables
	cleanup := func() {
		envVars := []string{
			"LEMMA_ENV",
			"LEMMA_DB_URL",
			"LEMMA_WORKDIR",
			"LEMMA_STATIC_PATH",
			"LEMMA_PORT",
			"LEMMA_DOMAIN",
			"LEMMA_CORS_ORIGINS",
			"LEMMA_ADMIN_EMAIL",
			"LEMMA_ADMIN_PASSWORD",
			"LEMMA_ENCRYPTION_KEY",
			"LEMMA_JWT_SIGNING_KEY",
			"LEMMA_RATE_LIMIT_REQUESTS",
			"LEMMA_RATE_LIMIT_WINDOW",
		}
		for _, env := range envVars {
			if err := os.Unsetenv(env); err != nil {
				t.Fatalf("Failed to unset environment variable %s: %v", env, err)
			}
		}
	}

	t.Run("load with defaults", func(t *testing.T) {
		cleanup()
		defer cleanup()

		// Set required env vars
		setEnv(t, "LEMMA_ADMIN_EMAIL", "admin@example.com")
		setEnv(t, "LEMMA_ADMIN_PASSWORD", "password123")
		setEnv(t, "LEMMA_ENCRYPTION_KEY", "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=") // 32 bytes base64 encoded

		cfg, err := app.LoadConfig()
		if err != nil {
			t.Fatalf("Load() error = %v", err)
		}

		if cfg.DBURL != "sqlite://lemma.db" {
			t.Errorf("default DBPath = %v, want %v", cfg.DBURL, "sqlite://lemma.db")
		}
	})

	t.Run("load with custom values", func(t *testing.T) {
		cleanup()
		defer cleanup()

		// Set all environment variables
		envs := map[string]string{
			"LEMMA_ENV":                 "development",
			"LEMMA_DB_URL":              "sqlite:///custom/db/path.db",
			"LEMMA_WORKDIR":             "/custom/work/dir",
			"LEMMA_STATIC_PATH":         "/custom/static/path",
			"LEMMA_PORT":                "3000",
			"LEMMA_ROOT_URL":            "http://localhost:3000",
			"LEMMA_CORS_ORIGINS":        "http://localhost:3000,http://localhost:3001",
			"LEMMA_ADMIN_EMAIL":         "admin@example.com",
			"LEMMA_ADMIN_PASSWORD":      "password123",
			"LEMMA_ENCRYPTION_KEY":      "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=",
			"LEMMA_JWT_SIGNING_KEY":     "secret-key",
			"LEMMA_RATE_LIMIT_REQUESTS": "200",
			"LEMMA_RATE_LIMIT_WINDOW":   "30m",
		}

		for k, v := range envs {
			setEnv(t, k, v)
		}

		cfg, err := app.LoadConfig()
		if err != nil {
			t.Fatalf("Load() error = %v", err)
		}

		tests := []struct {
			name     string
			got      any
			expected any
		}{
			{"IsDevelopment", cfg.IsDevelopment, true},
			{"DBURL", cfg.DBURL, "/custom/db/path.db"},
			{"DBType", cfg.DBType, db.DBTypeSQLite},
			{"WorkDir", cfg.WorkDir, "/custom/work/dir"},
			{"StaticPath", cfg.StaticPath, "/custom/static/path"},
			{"Port", cfg.Port, "3000"},
			{"AdminEmail", cfg.AdminEmail, "admin@example.com"},
			{"AdminPassword", cfg.AdminPassword, "password123"},
			{"JWTSigningKey", cfg.JWTSigningKey, "secret-key"},
			{"RateLimitRequests", cfg.RateLimitRequests, 200},
			{"RateLimitWindow", cfg.RateLimitWindow, 30 * time.Minute},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				if tt.got != tt.expected {
					t.Errorf("%s = %v, want %v", tt.name, tt.got, tt.expected)
				}
			})
		}

		// Test CORS origins separately as it's a slice
		expectedOrigins := []string{"http://localhost:3000", "http://localhost:3001"}
		if len(cfg.CORSOrigins) != len(expectedOrigins) {
			t.Errorf("CORSOrigins length = %v, want %v", len(cfg.CORSOrigins), len(expectedOrigins))
		}
		for i, origin := range cfg.CORSOrigins {
			if origin != expectedOrigins[i] {
				t.Errorf("CORSOrigins[%d] = %v, want %v", i, origin, expectedOrigins[i])
			}
		}
	})

	t.Run("validation failures", func(t *testing.T) {
		testCases := []struct {
			name          string
			setupEnv      func(*testing.T)
			expectedError string
		}{
			{
				name: "missing admin email",
				setupEnv: func(t *testing.T) {
					cleanup()
					setEnv(t, "LEMMA_ADMIN_PASSWORD", "password123")
					setEnv(t, "LEMMA_ENCRYPTION_KEY", "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=")
				},
				expectedError: "LEMMA_ADMIN_EMAIL and LEMMA_ADMIN_PASSWORD must be set",
			},
			{
				name: "missing admin password",
				setupEnv: func(t *testing.T) {
					cleanup()
					setEnv(t, "LEMMA_ADMIN_EMAIL", "admin@example.com")
					setEnv(t, "LEMMA_ENCRYPTION_KEY", "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=")
				},
				expectedError: "LEMMA_ADMIN_EMAIL and LEMMA_ADMIN_PASSWORD must be set",
			},
			{
				name: "invalid encryption key",
				setupEnv: func(t *testing.T) {
					cleanup()
					setEnv(t, "LEMMA_ADMIN_EMAIL", "admin@example.com")
					setEnv(t, "LEMMA_ADMIN_PASSWORD", "password123")
					setEnv(t, "LEMMA_ENCRYPTION_KEY", "invalid-key")
				},
				expectedError: "invalid LEMMA_ENCRYPTION_KEY: invalid base64 encoding: illegal base64 data at input byte 7",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				tc.setupEnv(t)
				_, err := app.LoadConfig()
				if err == nil {
					t.Error("expected error, got nil")
					return
				}
				if err.Error() != tc.expectedError {
					t.Errorf("error = %v, want error containing %v", err, tc.expectedError)
				}
			})
		}
	})
}
