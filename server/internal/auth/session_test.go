package auth_test

import (
	"errors"
	"strings"
	"testing"
	"time"

	"lemma/internal/auth"
	"lemma/internal/models"
	_ "lemma/internal/testenv"
)

// Mock SessionStore
type mockSessionStore struct {
	sessions        map[string]*models.Session
	sessionsByToken map[string]*models.Session
}

func newMockSessionStore() *mockSessionStore {
	return &mockSessionStore{
		sessions:        make(map[string]*models.Session),
		sessionsByToken: make(map[string]*models.Session),
	}
}

func (m *mockSessionStore) CreateSession(session *models.Session) error {
	m.sessions[session.ID] = session
	m.sessionsByToken[session.RefreshToken] = session
	return nil
}

func (m *mockSessionStore) GetSessionByID(sessionID string) (*models.Session, error) {
	session, exists := m.sessions[sessionID]
	if !exists {
		return nil, errors.New("session not found")
	}
	if session.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("session expired")
	}
	return session, nil
}

func (m *mockSessionStore) GetSessionByRefreshToken(refreshToken string) (*models.Session, error) {
	session, exists := m.sessionsByToken[refreshToken]
	if !exists {
		return nil, errors.New("session not found")
	}
	if session.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("session expired")
	}
	return session, nil
}

func (m *mockSessionStore) DeleteSession(sessionID string) error {
	session, exists := m.sessions[sessionID]
	if !exists {
		return errors.New("session not found")
	}
	delete(m.sessionsByToken, session.RefreshToken)
	delete(m.sessions, sessionID)
	return nil
}

func (m *mockSessionStore) CleanExpiredSessions() error {
	for id, session := range m.sessions {
		if session.ExpiresAt.Before(time.Now()) {
			delete(m.sessionsByToken, session.RefreshToken)
			delete(m.sessions, id)
		}
	}
	return nil
}

func TestCreateSession(t *testing.T) {
	config := auth.JWTConfig{
		SigningKey:         "test-key",
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 24 * time.Hour,
	}
	jwtService, _ := auth.NewJWTService(config)
	mockDB := newMockSessionStore()
	sessionService := auth.NewSessionService(mockDB, jwtService)

	testCases := []struct {
		name    string
		userID  int
		role    string
		wantErr bool
	}{
		{
			name:    "successful session creation",
			userID:  1,
			role:    "admin",
			wantErr: false,
		},
		{
			name:    "another successful session",
			userID:  2,
			role:    "editor",
			wantErr: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			session, accessToken, err := sessionService.CreateSession(tc.userID, tc.role)
			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			// Verify session
			if session.UserID != tc.userID {
				t.Errorf("userID = %v, want %v", session.UserID, tc.userID)
			}

			// Verify the session was stored
			storedSession, err := mockDB.GetSessionByID(session.ID)
			if err != nil {
				t.Errorf("failed to get stored session: %v", err)
			}
			if storedSession.RefreshToken != session.RefreshToken {
				t.Error("stored refresh token doesn't match")
			}

			// Verify access token
			claims, err := jwtService.ValidateToken(accessToken)
			if err != nil {
				t.Errorf("failed to validate access token: %v", err)
				return
			}
			if claims.UserID != tc.userID {
				t.Errorf("access token userID = %v, want %v", claims.UserID, tc.userID)
			}
			if claims.Role != tc.role {
				t.Errorf("access token role = %v, want %v", claims.Role, tc.role)
			}
			if claims.Type != auth.AccessToken {
				t.Errorf("token type = %v, want access token", claims.Type)
			}
		})
	}
}

func TestValidateSession(t *testing.T) {
	config := auth.JWTConfig{
		SigningKey:         "test-key",
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 24 * time.Hour,
	}
	jwtService, _ := auth.NewJWTService(config)
	mockDB := newMockSessionStore()
	sessionService := auth.NewSessionService(mockDB, jwtService)

	testCases := []struct {
		name          string
		setupSession  func() string
		wantErr       bool
		errorContains string
	}{
		{
			name: "valid session",
			setupSession: func() string {
				session := &models.Session{
					ID:        "test-session-1",
					UserID:    1,
					ExpiresAt: time.Now().Add(24 * time.Hour),
					CreatedAt: time.Now(),
				}
				if err := mockDB.CreateSession(session); err != nil {
					t.Fatalf("failed to create session: %v", err)
				}

				return session.ID
			},
			wantErr: false,
		},
		{
			name: "expired session",
			setupSession: func() string {
				session := &models.Session{
					ID:        "test-session-2",
					UserID:    1,
					ExpiresAt: time.Now().Add(-1 * time.Hour),
					CreatedAt: time.Now().Add(-2 * time.Hour),
				}
				if err := mockDB.CreateSession(session); err != nil {
					t.Fatalf("failed to create session: %v", err)
				}
				return session.ID
			},
			wantErr:       true,
			errorContains: "session expired",
		},
		{
			name: "non-existent session",
			setupSession: func() string {
				return "non-existent-session-id"
			},
			wantErr:       true,
			errorContains: "session not found",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			sessionID := tc.setupSession()
			session, err := sessionService.ValidateSession(sessionID)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				} else if tc.errorContains != "" && !strings.Contains(err.Error(), tc.errorContains) {
					t.Errorf("error = %v, want error containing %v", err, tc.errorContains)
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			if session == nil {
				t.Error("expected session, got nil")
				return
			}

			if session.ID != sessionID {
				t.Errorf("session ID = %v, want %v", session.ID, sessionID)
			}
		})
	}
}

func TestRefreshSession(t *testing.T) {
	config := auth.JWTConfig{
		SigningKey:         "test-key",
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 24 * time.Hour,
	}
	jwtService, _ := auth.NewJWTService(config)
	mockDB := newMockSessionStore()
	sessionService := auth.NewSessionService(mockDB, jwtService)

	testCases := []struct {
		name          string
		setupSession  func() string
		wantErr       bool
		errorContains string
	}{
		{
			name: "valid refresh token",
			setupSession: func() string {
				token, _ := jwtService.GenerateRefreshToken(1, "admin", "test-session-1")
				session := &models.Session{
					ID:           "test-session-1",
					UserID:       1,
					RefreshToken: token,
					ExpiresAt:    time.Now().Add(24 * time.Hour),
					CreatedAt:    time.Now(),
				}
				if err := mockDB.CreateSession(session); err != nil {
					t.Fatalf("failed to create session: %v", err)
				}
				return token
			},
			wantErr: false,
		},
		{
			name: "expired refresh token",
			setupSession: func() string {
				token, _ := jwtService.GenerateRefreshToken(1, "admin", "test-session-2")
				session := &models.Session{
					ID:           "test-session-2",
					UserID:       1,
					RefreshToken: token,
					ExpiresAt:    time.Now().Add(-1 * time.Hour),
					CreatedAt:    time.Now().Add(-2 * time.Hour),
				}
				if err := mockDB.CreateSession(session); err != nil {
					t.Fatalf("failed to create session: %v", err)
				}
				return token
			},
			wantErr:       true,
			errorContains: "session expired",
		},
		{
			name: "non-existent refresh token",
			setupSession: func() string {
				return "non-existent-token"
			},
			wantErr:       true,
			errorContains: "session not found",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			refreshToken := tc.setupSession()
			newAccessToken, err := sessionService.RefreshSession(refreshToken)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				} else if tc.errorContains != "" && !strings.Contains(err.Error(), tc.errorContains) {
					t.Errorf("error = %v, want error containing %v", err, tc.errorContains)
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			// Verify new access token
			claims, err := jwtService.ValidateToken(newAccessToken)
			if err != nil {
				t.Errorf("failed to validate new access token: %v", err)
				return
			}
			if claims.Type != auth.AccessToken {
				t.Errorf("token type = %v, want access token", claims.Type)
			}
		})
	}
}

func TestCleanExpiredSessions(t *testing.T) {
	config := auth.JWTConfig{
		SigningKey:         "test-key",
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 24 * time.Hour,
	}
	jwtService, _ := auth.NewJWTService(config)
	mockDB := newMockSessionStore()
	sessionService := auth.NewSessionService(mockDB, jwtService)

	// Create test sessions
	validSession := &models.Session{
		ID:        "valid-session",
		UserID:    1,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		CreatedAt: time.Now(),
	}
	if err := mockDB.CreateSession(validSession); err != nil {
		t.Fatalf("failed to create valid session: %v", err)
	}

	expiredSession := &models.Session{
		ID:        "expired-session",
		UserID:    2,
		ExpiresAt: time.Now().Add(-1 * time.Hour),
		CreatedAt: time.Now().Add(-2 * time.Hour),
	}
	if err := mockDB.CreateSession(expiredSession); err != nil {
		t.Fatalf("failed to create expired session: %v", err)
	}

	// Clean expired sessions
	err := sessionService.CleanExpiredSessions()
	if err != nil {
		t.Errorf("unexpected error cleaning sessions: %v", err)
	}

	// Verify valid session still exists
	if _, err := mockDB.GetSessionByID(validSession.ID); err != nil {
		t.Error("valid session was incorrectly removed")
	}

	// Verify expired session was removed
	if _, err := mockDB.GetSessionByID(expiredSession.ID); err == nil {
		t.Error("expired session was not removed")
	}
}
