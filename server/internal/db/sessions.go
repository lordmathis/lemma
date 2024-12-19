package db

import (
	"database/sql"
	"fmt"
	"time"

	"novamd/internal/models"
)

// CreateSession inserts a new session record into the database
func (db *database) CreateSession(session *models.Session) error {
	_, err := db.Exec(`
        INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)`,
		session.ID, session.UserID, session.RefreshToken, session.ExpiresAt, session.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to store session: %w", err)
	}

	return nil
}

// GetSessionByRefreshToken retrieves a session by its refresh token
func (db *database) GetSessionByRefreshToken(refreshToken string) (*models.Session, error) {
	session := &models.Session{}
	err := db.QueryRow(`
        SELECT id, user_id, refresh_token, expires_at, created_at
        FROM sessions
        WHERE refresh_token = ? AND expires_at > ?`,
		refreshToken, time.Now(),
	).Scan(&session.ID, &session.UserID, &session.RefreshToken, &session.ExpiresAt, &session.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session not found or expired")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to fetch session: %w", err)
	}

	return session, nil
}

// GetSessionByID retrieves a session by its ID
func (db *database) GetSessionByID(sessionID string) (*models.Session, error) {
	session := &models.Session{}
	err := db.QueryRow(`
        SELECT id, user_id, refresh_token, expires_at, created_at
        FROM sessions
        WHERE id = ? AND expires_at > ?`,
		sessionID, time.Now(),
	).Scan(&session.ID, &session.UserID, &session.RefreshToken, &session.ExpiresAt, &session.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("session not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to fetch session: %w", err)
	}

	return session, nil
}

// DeleteSession removes a session from the database
func (db *database) DeleteSession(sessionID string) error {
	result, err := db.Exec("DELETE FROM sessions WHERE id = ?", sessionID)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("session not found")
	}

	return nil
}

// CleanExpiredSessions removes all expired sessions from the database
func (db *database) CleanExpiredSessions() error {
	log := getLogger().WithGroup("sessions")
	result, err := db.Exec("DELETE FROM sessions WHERE expires_at <= ?", time.Now())
	if err != nil {
		return fmt.Errorf("failed to clean expired sessions: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	log.Info("cleaned expired sessions", "sessions_removed", rowsAffected)
	return nil
}
