package db_test

import (
	"strings"
	"testing"
	"time"

	"lemma/internal/db"
	"lemma/internal/models"
	_ "lemma/internal/testenv"

	"github.com/google/uuid"
)

func TestSessionOperations(t *testing.T) {
	database, err := db.NewTestDB(&mockSecrets{})
	if err != nil {
		t.Fatalf("failed to create test database: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	// Create a test user first since sessions need a valid user ID
	user, err := database.CreateUser(&models.User{
		Email:        "test@example.com",
		DisplayName:  "Test User",
		PasswordHash: "hash",
		Role:         "editor",
	})
	if err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}

	t.Run("CreateSession", func(t *testing.T) {
		testCases := []struct {
			name        string
			session     *models.Session
			wantErr     bool
			errContains string
		}{
			{
				name: "valid session",
				session: &models.Session{
					ID:           uuid.New().String(),
					UserID:       user.ID,
					RefreshToken: "valid-token",
					ExpiresAt:    time.Now().Add(24 * time.Hour),
					CreatedAt:    time.Now(),
				},
				wantErr: false,
			},
			{
				name: "invalid user ID",
				session: &models.Session{
					ID:           uuid.New().String(),
					UserID:       99999, // Non-existent user ID
					RefreshToken: "invalid-user-token",
					ExpiresAt:    time.Now().Add(24 * time.Hour),
					CreatedAt:    time.Now(),
				},
				wantErr:     true,
				errContains: "FOREIGN KEY constraint failed",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				err := database.CreateSession(tc.session)

				if tc.wantErr {
					if err == nil {
						t.Error("expected error, got nil")
					} else if tc.errContains != "" && !strings.Contains(err.Error(), tc.errContains) {
						t.Errorf("error = %v, want error containing %v", err, tc.errContains)
					}
					return
				}

				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				// Verify session was stored
				stored, err := database.GetSessionByRefreshToken(tc.session.RefreshToken)
				if err != nil {
					t.Fatalf("failed to retrieve stored session: %v", err)
				}

				// Compare fields
				if stored.ID != tc.session.ID {
					t.Errorf("ID = %v, want %v", stored.ID, tc.session.ID)
				}
				if stored.UserID != tc.session.UserID {
					t.Errorf("UserID = %v, want %v", stored.UserID, tc.session.UserID)
				}
				if stored.RefreshToken != tc.session.RefreshToken {
					t.Errorf("RefreshToken = %v, want %v", stored.RefreshToken, tc.session.RefreshToken)
				}
				// Compare times within a reasonable threshold
				if diff := stored.ExpiresAt.Sub(tc.session.ExpiresAt); diff > time.Second || diff < -time.Second {
					t.Errorf("ExpiresAt differs by %v, want difference less than 1s", diff)
				}
			})
		}
	})

	t.Run("GetSessionByRefreshToken", func(t *testing.T) {
		// Create test sessions
		validSession := &models.Session{
			ID:           uuid.New().String(),
			UserID:       user.ID,
			RefreshToken: "valid-get-token",
			ExpiresAt:    time.Now().Add(24 * time.Hour),
			CreatedAt:    time.Now(),
		}
		expiredSession := &models.Session{
			ID:           uuid.New().String(),
			UserID:       user.ID,
			RefreshToken: "expired-token",
			ExpiresAt:    time.Now().Add(-1 * time.Hour), // Expired
			CreatedAt:    time.Now().Add(-2 * time.Hour),
		}

		if err := database.CreateSession(validSession); err != nil {
			t.Fatalf("failed to create valid session: %v", err)
		}
		if err := database.CreateSession(expiredSession); err != nil {
			t.Fatalf("failed to create expired session: %v", err)
		}

		testCases := []struct {
			name         string
			refreshToken string
			wantErr      bool
			errContains  string
		}{
			{
				name:         "valid token",
				refreshToken: "valid-get-token",
				wantErr:      false,
			},
			{
				name:         "expired token",
				refreshToken: "expired-token",
				wantErr:      true,
				errContains:  "session not found or expired",
			},
			{
				name:         "non-existent token",
				refreshToken: "nonexistent-token",
				wantErr:      true,
				errContains:  "session not found",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				session, err := database.GetSessionByRefreshToken(tc.refreshToken)

				if tc.wantErr {
					if err == nil {
						t.Error("expected error, got nil")
					} else if tc.errContains != "" && !strings.Contains(err.Error(), tc.errContains) {
						t.Errorf("error = %v, want error containing %v", err, tc.errContains)
					}
					return
				}

				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				if session.RefreshToken != tc.refreshToken {
					t.Errorf("RefreshToken = %v, want %v", session.RefreshToken, tc.refreshToken)
				}
			})
		}
	})

	t.Run("DeleteSession", func(t *testing.T) {
		session := &models.Session{
			ID:           uuid.New().String(),
			UserID:       user.ID,
			RefreshToken: "delete-token",
			ExpiresAt:    time.Now().Add(24 * time.Hour),
			CreatedAt:    time.Now(),
		}

		if err := database.CreateSession(session); err != nil {
			t.Fatalf("failed to create session: %v", err)
		}

		testCases := []struct {
			name        string
			sessionID   string
			wantErr     bool
			errContains string
		}{
			{
				name:      "valid session ID",
				sessionID: session.ID,
				wantErr:   false,
			},
			{
				name:        "non-existent session ID",
				sessionID:   "nonexistent-id",
				wantErr:     true,
				errContains: "session not found",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				err := database.DeleteSession(tc.sessionID)

				if tc.wantErr {
					if err == nil {
						t.Error("expected error, got nil")
					} else if tc.errContains != "" && !strings.Contains(err.Error(), tc.errContains) {
						t.Errorf("error = %v, want error containing %v", err, tc.errContains)
					}
					return
				}

				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				// Verify session was deleted
				_, err = database.GetSessionByRefreshToken(session.RefreshToken)
				if err == nil {
					t.Error("session still exists after deletion")
				}
			})
		}
	})

	t.Run("CleanExpiredSessions", func(t *testing.T) {
		// Create a mix of valid and expired sessions
		sessions := []*models.Session{
			{
				ID:           uuid.New().String(),
				UserID:       user.ID,
				RefreshToken: "valid-clean-token",
				ExpiresAt:    time.Now().Add(24 * time.Hour),
				CreatedAt:    time.Now(),
			},
			{
				ID:           uuid.New().String(),
				UserID:       user.ID,
				RefreshToken: "expired-clean-token-1",
				ExpiresAt:    time.Now().Add(-1 * time.Hour),
				CreatedAt:    time.Now().Add(-2 * time.Hour),
			},
			{
				ID:           uuid.New().String(),
				UserID:       user.ID,
				RefreshToken: "expired-clean-token-2",
				ExpiresAt:    time.Now().Add(-2 * time.Hour),
				CreatedAt:    time.Now().Add(-3 * time.Hour),
			},
		}

		for _, s := range sessions {
			if err := database.CreateSession(s); err != nil {
				t.Fatalf("failed to create session: %v", err)
			}
		}

		// Clean expired sessions
		if err := database.CleanExpiredSessions(); err != nil {
			t.Fatalf("failed to clean expired sessions: %v", err)
		}

		// Verify valid session still exists
		validSession, err := database.GetSessionByRefreshToken("valid-clean-token")
		if err != nil {
			t.Errorf("valid session was unexpectedly deleted: %v", err)
		}
		if validSession == nil {
			t.Error("valid session was unexpectedly deleted")
		}

		// Verify expired sessions were deleted
		expiredTokens := []string{"expired-clean-token-1", "expired-clean-token-2"}
		for _, token := range expiredTokens {
			if _, err := database.GetSessionByRefreshToken(token); err == nil {
				t.Errorf("expired session with token %s still exists", token)
			}
		}
	})
}
