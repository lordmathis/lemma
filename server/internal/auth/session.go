package auth

import (
	"fmt"
	"novamd/internal/db"
	"novamd/internal/models"
	"time"

	"github.com/google/uuid"
)

// SessionService manages user sessions in the database
type SessionService struct {
	db         db.SessionStore // Database store for sessions
	jwtManager JWTManager      // JWT Manager for token operations
}

// NewSessionService creates a new session service
// Parameters:
// - db: database connection
// - jwtManager: JWT service for token operations
func NewSessionService(db db.SessionStore, jwtManager JWTManager) *SessionService {
	return &SessionService{
		db:         db,
		jwtManager: jwtManager,
	}
}

// CreateSession creates a new user session
// Parameters:
// - userID: the ID of the user
// - role: the role of the user
// Returns:
// - session: the created session
// - accessToken: a new access token
// - error: any error that occurred
func (s *SessionService) CreateSession(userID int, role string) (*models.Session, string, error) {
	// Generate both access and refresh tokens
	accessToken, err := s.jwtManager.GenerateAccessToken(userID, role)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(userID, role)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Validate the refresh token to get its expiry time
	claims, err := s.jwtManager.ValidateToken(refreshToken)
	if err != nil {
		return nil, "", fmt.Errorf("failed to validate refresh token: %w", err)
	}

	// Create a new session record
	session := &models.Session{
		ID:           uuid.New().String(),
		UserID:       userID,
		RefreshToken: refreshToken,
		ExpiresAt:    claims.ExpiresAt.Time,
		CreatedAt:    time.Now(),
	}

	// Store the session
	if err := s.db.CreateSession(session); err != nil {
		return nil, "", err
	}

	return session, accessToken, nil
}

// RefreshSession creates a new access token using a refresh token
// Parameters:
// - refreshToken: the refresh token to use
// Returns:
// - string: a new access token
// - error: any error that occurred
func (s *SessionService) RefreshSession(refreshToken string) (string, error) {
	// Get session from database
	_, err := s.db.GetSessionByRefreshToken(refreshToken)
	if err != nil {
		return "", fmt.Errorf("invalid session: %w", err)
	}

	// Validate the refresh token
	claims, err := s.jwtManager.ValidateToken(refreshToken)
	if err != nil {
		return "", fmt.Errorf("invalid refresh token: %w", err)
	}

	// Generate a new access token
	return s.jwtManager.GenerateAccessToken(claims.UserID, claims.Role)
}

// InvalidateSession removes a session from the database
// Parameters:
// - sessionID: the ID of the session to invalidate
// Returns:
// - error: any error that occurred
func (s *SessionService) InvalidateSession(sessionID string) error {
	return s.db.DeleteSession(sessionID)
}

// CleanExpiredSessions removes all expired sessions from the database
// Returns:
// - error: any error that occurred
func (s *SessionService) CleanExpiredSessions() error {
	return s.db.CleanExpiredSessions()
}
