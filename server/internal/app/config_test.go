package app_test

import (
	"novamd/internal/app"
	"os"
	"testing"
	"time"
)

func TestDefaultConfig(t *testing.T) {
	cfg := app.DefaultConfig()

	tests := []struct {
		name     string
		got      interface{}
		expected interface{}
	}{
		{"DBPath", cfg.DBPath, "./novamd.db"},
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
			"NOVAMD_ENV",
			"NOVAMD_DB_PATH",
			"NOVAMD_WORKDIR",
			"NOVAMD_STATIC_PATH",
			"NOVAMD_PORT",
			"NOVAMD_ROOT_URL",
			"NOVAMD_DOMAIN",
			"NOVAMD_CORS_ORIGINS",
			"NOVAMD_ADMIN_EMAIL",
			"NOVAMD_ADMIN_PASSWORD",
			"NOVAMD_ENCRYPTION_KEY",
			"NOVAMD_JWT_SIGNING_KEY",
			"NOVAMD_RATE_LIMIT_REQUESTS",
			"NOVAMD_RATE_LIMIT_WINDOW",
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
		setEnv(t, "NOVAMD_ADMIN_EMAIL", "admin@example.com")
		setEnv(t, "NOVAMD_ADMIN_PASSWORD", "password123")
		setEnv(t, "NOVAMD_ENCRYPTION_KEY", "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=") // 32 bytes base64 encoded

		cfg, err := app.LoadConfig()
		if err != nil {
			t.Fatalf("Load() error = %v", err)
		}

		if cfg.DBPath != "./novamd.db" {
			t.Errorf("default DBPath = %v, want %v", cfg.DBPath, "./novamd.db")
		}
	})

	t.Run("load with custom values", func(t *testing.T) {
		cleanup()
		defer cleanup()

		// Set all environment variables
		envs := map[string]string{
			"NOVAMD_ENV":                 "development",
			"NOVAMD_DB_PATH":             "/custom/db/path.db",
			"NOVAMD_WORKDIR":             "/custom/work/dir",
			"NOVAMD_STATIC_PATH":         "/custom/static/path",
			"NOVAMD_PORT":                "3000",
			"NOVAMD_ROOT_URL":            "http://localhost:3000",
			"NOVAMD_CORS_ORIGINS":        "http://localhost:3000,http://localhost:3001",
			"NOVAMD_ADMIN_EMAIL":         "admin@example.com",
			"NOVAMD_ADMIN_PASSWORD":      "password123",
			"NOVAMD_ENCRYPTION_KEY":      "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=",
			"NOVAMD_JWT_SIGNING_KEY":     "secret-key",
			"NOVAMD_RATE_LIMIT_REQUESTS": "200",
			"NOVAMD_RATE_LIMIT_WINDOW":   "30m",
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
			got      interface{}
			expected interface{}
		}{
			{"IsDevelopment", cfg.IsDevelopment, true},
			{"DBPath", cfg.DBPath, "/custom/db/path.db"},
			{"WorkDir", cfg.WorkDir, "/custom/work/dir"},
			{"StaticPath", cfg.StaticPath, "/custom/static/path"},
			{"Port", cfg.Port, "3000"},
			{"AppURL", cfg.RootURL, "http://localhost:3000"},
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
					setEnv(t, "NOVAMD_ADMIN_PASSWORD", "password123")
					setEnv(t, "NOVAMD_ENCRYPTION_KEY", "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=")
				},
				expectedError: "NOVAMD_ADMIN_EMAIL and NOVAMD_ADMIN_PASSWORD must be set",
			},
			{
				name: "missing admin password",
				setupEnv: func(t *testing.T) {
					cleanup()
					setEnv(t, "NOVAMD_ADMIN_EMAIL", "admin@example.com")
					setEnv(t, "NOVAMD_ENCRYPTION_KEY", "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=")
				},
				expectedError: "NOVAMD_ADMIN_EMAIL and NOVAMD_ADMIN_PASSWORD must be set",
			},
			{
				name: "missing encryption key",
				setupEnv: func(t *testing.T) {
					cleanup()
					setEnv(t, "NOVAMD_ADMIN_EMAIL", "admin@example.com")
					setEnv(t, "NOVAMD_ADMIN_PASSWORD", "password123")
				},
				expectedError: "invalid NOVAMD_ENCRYPTION_KEY: encryption key is required",
			},
			{
				name: "invalid encryption key",
				setupEnv: func(t *testing.T) {
					cleanup()
					setEnv(t, "NOVAMD_ADMIN_EMAIL", "admin@example.com")
					setEnv(t, "NOVAMD_ADMIN_PASSWORD", "password123")
					setEnv(t, "NOVAMD_ENCRYPTION_KEY", "invalid-key")
				},
				expectedError: "invalid NOVAMD_ENCRYPTION_KEY: invalid base64 encoding: illegal base64 data at input byte 7",
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
