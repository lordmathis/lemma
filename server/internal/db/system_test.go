package db_test

import (
	"encoding/base64"
	"fmt"
	"strings"
	"testing"
	"time"

	"lemma/internal/db"
	"lemma/internal/models"
	_ "lemma/internal/testenv"

	"github.com/google/uuid"
)

func TestSystemOperations(t *testing.T) {
	database, err := db.NewTestSQLiteDB(&mockSecrets{})
	if err != nil {
		t.Fatalf("failed to create test database: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	t.Run("GetSystemSettings", func(t *testing.T) {
		t.Run("non-existent setting", func(t *testing.T) {
			_, err := database.GetSystemSetting("nonexistent-key")
			if err == nil {
				t.Error("expected error for non-existent key, got nil")
			}
		})

		t.Run("existing setting", func(t *testing.T) {
			// First set a value
			err := database.SetSystemSetting("test-key", "test-value")
			if err != nil {
				t.Fatalf("failed to set system setting: %v", err)
			}

			// Then get it back
			value, err := database.GetSystemSetting("test-key")
			if err != nil {
				t.Fatalf("failed to get system setting: %v", err)
			}

			if value != "test-value" {
				t.Errorf("got value %q, want %q", value, "test-value")
			}
		})
	})

	t.Run("SetSystemSettings", func(t *testing.T) {
		testCases := []struct {
			name        string
			key         string
			value       string
			wantErr     bool
			errContains string
		}{
			{
				name:    "new setting",
				key:     "new-key",
				value:   "new-value",
				wantErr: false,
			},
			{
				name:    "update existing setting",
				key:     "update-key",
				value:   "original-value",
				wantErr: false,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				err := database.SetSystemSetting(tc.key, tc.value)
				if tc.wantErr {
					if err == nil {
						t.Error("expected error, got nil")
					} else if !strings.Contains(err.Error(), tc.errContains) {
						t.Errorf("error = %v, want error containing %v", err, tc.errContains)
					}
					return
				}
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				// Verify the setting was stored
				stored, err := database.GetSystemSetting(tc.key)
				if err != nil {
					t.Fatalf("failed to retrieve stored setting: %v", err)
				}
				if stored != tc.value {
					t.Errorf("got value %q, want %q", stored, tc.value)
				}

				// For the update case, test updating the value
				if tc.name == "update existing setting" {
					newValue := "updated-value"
					err := database.SetSystemSetting(tc.key, newValue)
					if err != nil {
						t.Fatalf("failed to update setting: %v", err)
					}

					stored, err := database.GetSystemSetting(tc.key)
					if err != nil {
						t.Fatalf("failed to retrieve updated setting: %v", err)
					}
					if stored != newValue {
						t.Errorf("got updated value %q, want %q", stored, newValue)
					}
				}
			})
		}
	})

	t.Run("EnsureJWTSecret", func(t *testing.T) {
		// First call should generate a new secret
		secret1, err := database.EnsureJWTSecret()
		if err != nil {
			t.Fatalf("failed to ensure JWT secret: %v", err)
		}

		// Verify the secret is a valid base64-encoded string of sufficient length
		decoded, err := base64.StdEncoding.DecodeString(secret1)
		if err != nil {
			t.Errorf("secret is not valid base64: %v", err)
		}
		if len(decoded) < 32 {
			t.Errorf("secret length = %d, want >= 32", len(decoded))
		}

		// Second call should return the same secret
		secret2, err := database.EnsureJWTSecret()
		if err != nil {
			t.Fatalf("failed to get existing JWT secret: %v", err)
		}

		if secret2 != secret1 {
			t.Errorf("got different secret on second call")
		}
	})

	t.Run("GetSystemStats", func(t *testing.T) {
		// Create some test users and sessions
		users := []*models.User{
			{
				Email:        "user1@test.com",
				DisplayName:  "User 1",
				PasswordHash: "hash1",
				Role:         "editor",
			},
			{
				Email:        "user2@test.com",
				DisplayName:  "User 2",
				PasswordHash: "hash2",
				Role:         "viewer",
			},
		}

		for _, u := range users {
			createdUser, err := database.CreateUser(u)
			if err != nil {
				t.Fatalf("failed to create test user: %v", err)
			}

			// Create multiple workspaces per user
			// Each user has one default workspace
			for i := 0; i < 2; i++ {
				workspace := &models.Workspace{
					UserID: createdUser.ID,
					Name:   fmt.Sprintf("Workspace %d", i),
				}
				if err := database.CreateWorkspace(workspace); err != nil {
					t.Fatalf("failed to create test workspace: %v", err)
				}
			}

			// Create an active session for the first user
			if createdUser.Email == "user1@test.com" {
				session := &models.Session{
					ID:           uuid.New().String(),
					UserID:       createdUser.ID,
					RefreshToken: "test-token",
					ExpiresAt:    time.Now().Add(24 * time.Hour),
					CreatedAt:    time.Now(),
				}
				if err := database.CreateSession(session); err != nil {
					t.Fatalf("failed to create test session: %v", err)
				}
			}
		}

		stats, err := database.GetSystemStats()
		if err != nil {
			t.Fatalf("failed to get system stats: %v", err)
		}

		// Verify stats
		if stats.TotalUsers != 2 {
			t.Errorf("TotalUsers = %d, want 2", stats.TotalUsers)
		}
		if stats.TotalWorkspaces != 6 { // 2 + 1 default workspace per user
			t.Errorf("TotalWorkspaces = %d, want 6", stats.TotalWorkspaces)
		}
		if stats.ActiveUsers != 1 { // Only user1 has an active session
			t.Errorf("ActiveUsers = %d, want 1", stats.ActiveUsers)
		}
	})
}
