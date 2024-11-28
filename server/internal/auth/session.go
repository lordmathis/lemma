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

// NewSessionService creates a new session service with the given database and JWT manager
func NewSessionService(db db.SessionStore, jwtManager JWTManager) *SessionService {
	return &SessionService{
		db:         db,
		jwtManager: jwtManager,
	}
}

// CreateSession creates a new user session for a user with the given userID and role
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

// RefreshSession creates a new access token using a refreshToken
func (s *SessionService) RefreshSession(refreshToken string) (string, error) {
	// Get session from database first
	session, err := s.db.GetSessionByRefreshToken(refreshToken)
	if err != nil {
		return "", fmt.Errorf("invalid session: %w", err)
	}

	// Validate the refresh token
	claims, err := s.jwtManager.ValidateToken(refreshToken)
	if err != nil {
		return "", fmt.Errorf("invalid refresh token: %w", err)
	}

	// Double check that the claims match the session
	if claims.UserID != session.UserID {
		return "", fmt.Errorf("token does not match session")
	}

	// Generate a new access token
	return s.jwtManager.GenerateAccessToken(claims.UserID, claims.Role)
}

// InvalidateSession removes a session with the given sessionID from the database
func (s *SessionService) InvalidateSession(sessionID string) error {
	return s.db.DeleteSession(sessionID)
}

// CleanExpiredSessions removes all expired sessions from the database
func (s *SessionService) CleanExpiredSessions() error {
	return s.db.CleanExpiredSessions()
}
