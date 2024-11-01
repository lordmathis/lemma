package auth

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Session represents a user session in the database
type Session struct {
	ID           string    // Unique session identifier
	UserID       int       // ID of the user this session belongs to
	RefreshToken string    // The refresh token associated with this session
	ExpiresAt    time.Time // When this session expires
	CreatedAt    time.Time // When this session was created
}

// SessionService manages user sessions in the database
type SessionService struct {
	db         *sql.DB     // Database connection
	jwtService *JWTService // JWT service for token operations
}

// NewSessionService creates a new session service
// Parameters:
// - db: database connection
// - jwtService: JWT service for token operations
func NewSessionService(db *sql.DB, jwtService *JWTService) *SessionService {
	return &SessionService{
		db:         db,
		jwtService: jwtService,
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
func (s *SessionService) CreateSession(userID int, role string) (*Session, string, error) {
	// Generate both access and refresh tokens
	accessToken, err := s.jwtService.GenerateAccessToken(userID, role)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.jwtService.GenerateRefreshToken(userID, role)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Validate the refresh token to get its expiry time
	claims, err := s.jwtService.ValidateToken(refreshToken)
	if err != nil {
		return nil, "", fmt.Errorf("failed to validate refresh token: %w", err)
	}

	// Create a new session record
	session := &Session{
		ID:           uuid.New().String(),
		UserID:       userID,
		RefreshToken: refreshToken,
		ExpiresAt:    claims.ExpiresAt.Time,
		CreatedAt:    time.Now(),
	}

	// Store the session in the database
	_, err = s.db.Exec(`
		INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at)
		VALUES (?, ?, ?, ?, ?)`,
		session.ID, session.UserID, session.RefreshToken, session.ExpiresAt, session.CreatedAt,
	)
	if err != nil {
		return nil, "", fmt.Errorf("failed to store session: %w", err)
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
	// Validate the refresh token
	claims, err := s.jwtService.ValidateToken(refreshToken)
	if err != nil {
		return "", fmt.Errorf("invalid refresh token: %w", err)
	}

	// Check if the session exists and is not expired
	var session Session
	err = s.db.QueryRow(`
		SELECT id, user_id, refresh_token, expires_at, created_at
		FROM sessions
		WHERE refresh_token = ? AND expires_at > ?`,
		refreshToken, time.Now(),
	).Scan(&session.ID, &session.UserID, &session.RefreshToken, &session.ExpiresAt, &session.CreatedAt)

	if err == sql.ErrNoRows {
		return "", fmt.Errorf("session not found or expired")
	}
	if err != nil {
		return "", fmt.Errorf("failed to fetch session: %w", err)
	}

	// Generate a new access token
	return s.jwtService.GenerateAccessToken(claims.UserID, claims.Role)
}

// InvalidateSession removes a session from the database
// Parameters:
// - sessionID: the ID of the session to invalidate
// Returns:
// - error: any error that occurred
func (s *SessionService) InvalidateSession(sessionID string) error {
	_, err := s.db.Exec("DELETE FROM sessions WHERE id = ?", sessionID)
	if err != nil {
		return fmt.Errorf("failed to invalidate session: %w", err)
	}
	return nil
}

// CleanExpiredSessions removes all expired sessions from the database
// Returns:
// - error: any error that occurred
func (s *SessionService) CleanExpiredSessions() error {
	_, err := s.db.Exec("DELETE FROM sessions WHERE expires_at <= ?", time.Now())
	if err != nil {
		return fmt.Errorf("failed to clean expired sessions: %w", err)
	}
	return nil
}
