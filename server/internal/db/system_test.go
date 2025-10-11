package db_test

import (
	"fmt"
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
