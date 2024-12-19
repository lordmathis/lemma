package auth

import (
	"fmt"
	"lemma/internal/db"
	"lemma/internal/logging"
	"lemma/internal/models"
	"time"

	"github.com/google/uuid"
)

func getSessionLogger() logging.Logger {
	return getAuthLogger().WithGroup("session")
}

// SessionManager is an interface for managing user sessions
type SessionManager interface {
	CreateSession(userID int, role string) (*models.Session, string, error)
	RefreshSession(refreshToken string) (string, error)
	ValidateSession(sessionID string) (*models.Session, error)
	InvalidateSession(token string) error
	CleanExpiredSessions() error
}

// sessionManager manages user sessions in the database
type sessionManager struct {
	db         db.SessionStore // Database store for sessions
	jwtManager JWTManager      // JWT Manager for token operations
}

// NewSessionService creates a new session service with the given database and JWT manager
// revive:disable:unexported-return
func NewSessionService(db db.SessionStore, jwtManager JWTManager) *sessionManager {
	return &sessionManager{
		db:         db,
		jwtManager: jwtManager,
	}
}

// CreateSession creates a new user session for a user with the given userID and role
func (s *sessionManager) CreateSession(userID int, role string) (*models.Session, string, error) {
	log := getSessionLogger()

	// Generate a new session ID
	sessionID := uuid.New().String()

	// Generate both access and refresh tokens
	accessToken, err := s.jwtManager.GenerateAccessToken(userID, role, sessionID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(userID, role, sessionID)
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
		ID:           sessionID,
		UserID:       userID,
		RefreshToken: refreshToken,
		ExpiresAt:    claims.ExpiresAt.Time,
		CreatedAt:    time.Now(),
	}

	// Store the session
	if err := s.db.CreateSession(session); err != nil {
		return nil, "", err
	}

	log.Debug("created new session",
		"userId", userID,
		"role", role,
		"sessionId", sessionID,
		"expiresAt", claims.ExpiresAt.Time)

	return session, accessToken, nil
}

// RefreshSession creates a new access token using a refreshToken
func (s *sessionManager) RefreshSession(refreshToken string) (string, error) {
	// Get session from database
	session, err := s.db.GetSessionByRefreshToken(refreshToken)
	if err != nil {
		return "", fmt.Errorf("invalid session: %w", err)
	}

	// Validate the refresh token
	claims, err := s.jwtManager.ValidateToken(refreshToken)
	if err != nil {
		return "", fmt.Errorf("invalid refresh token: %w", err)
	}

	if claims.UserID != session.UserID {
		return "", fmt.Errorf("token does not match session")
	}

	// Generate a new access token
	newToken, err := s.jwtManager.GenerateAccessToken(claims.UserID, claims.Role, session.ID)
	if err != nil {
		return "", err
	}

	return newToken, nil
}

// ValidateSession checks if a session with the given sessionID is valid
func (s *sessionManager) ValidateSession(sessionID string) (*models.Session, error) {
	log := getSessionLogger()

	// Get the session from the database
	session, err := s.db.GetSessionByID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	log.Debug("validated session",
		"sessionId", sessionID,
		"userId", session.UserID,
		"expiresAt", session.ExpiresAt)

	return session, nil
}

// InvalidateSession removes a session with the given sessionID from the database
func (s *sessionManager) InvalidateSession(token string) error {
	log := getSessionLogger()

	// Parse the JWT to get the session info
	claims, err := s.jwtManager.ValidateToken(token)
	if err != nil {
		return fmt.Errorf("invalid token: %w", err)
	}

	if err := s.db.DeleteSession(claims.ID); err != nil {
		return err
	}

	log.Debug("invalidated session",
		"sessionId", claims.ID,
		"userId", claims.UserID)

	return nil
}

// CleanExpiredSessions removes all expired sessions from the database
func (s *sessionManager) CleanExpiredSessions() error {
	log := getSessionLogger()

	if err := s.db.CleanExpiredSessions(); err != nil {
		return err
	}

	log.Info("cleaned expired sessions")
	return nil
}
