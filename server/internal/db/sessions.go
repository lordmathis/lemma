package db

import (
	"database/sql"
	"fmt"
	"time"

	"novamd/internal/models"
)

// CreateSession inserts a new session record into the database
func (db *database) CreateSession(session *models.Session) error {
	log := getLogger().WithGroup("sessions")
	log.Debug("creating new session",
		"session_id", session.ID,
		"user_id", session.UserID,
		"expires_at", session.ExpiresAt)

	_, err := db.Exec(`
        INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)`,
		session.ID, session.UserID, session.RefreshToken, session.ExpiresAt, session.CreatedAt,
	)
	if err != nil {
		log.Error("failed to store session",
			"error", err,
			"session_id", session.ID,
			"user_id", session.UserID)
		return fmt.Errorf("failed to store session: %w", err)
	}

	log.Info("session created successfully",
		"session_id", session.ID,
		"user_id", session.UserID)
	return nil
}

// GetSessionByRefreshToken retrieves a session by its refresh token
func (db *database) GetSessionByRefreshToken(refreshToken string) (*models.Session, error) {
	log := getLogger().WithGroup("sessions")
	log.Debug("fetching session by refresh token")

	session := &models.Session{}
	err := db.QueryRow(`
        SELECT id, user_id, refresh_token, expires_at, created_at
        FROM sessions
        WHERE refresh_token = ? AND expires_at > ?`,
		refreshToken, time.Now(),
	).Scan(&session.ID, &session.UserID, &session.RefreshToken, &session.ExpiresAt, &session.CreatedAt)

	if err == sql.ErrNoRows {
		log.Debug("session not found or expired")
		return nil, fmt.Errorf("session not found or expired")
	}
	if err != nil {
		log.Error("failed to fetch session by refresh token", "error", err)
		return nil, fmt.Errorf("failed to fetch session: %w", err)
	}

	log.Debug("session retrieved successfully",
		"session_id", session.ID,
		"user_id", session.UserID)
	return session, nil
}

// GetSessionByID retrieves a session by its ID
func (db *database) GetSessionByID(sessionID string) (*models.Session, error) {
	log := getLogger().WithGroup("sessions")
	log.Debug("fetching session by ID", "session_id", sessionID)

	session := &models.Session{}
	err := db.QueryRow(`
        SELECT id, user_id, refresh_token, expires_at, created_at
        FROM sessions
        WHERE id = ? AND expires_at > ?`,
		sessionID, time.Now(),
	).Scan(&session.ID, &session.UserID, &session.RefreshToken, &session.ExpiresAt, &session.CreatedAt)

	if err == sql.ErrNoRows {
		log.Debug("session not found", "session_id", sessionID)
		return nil, fmt.Errorf("session not found")
	}
	if err != nil {
		log.Error("failed to fetch session by ID",
			"error", err,
			"session_id", sessionID)
		return nil, fmt.Errorf("failed to fetch session: %w", err)
	}

	log.Debug("session retrieved successfully",
		"session_id", session.ID,
		"user_id", session.UserID)
	return session, nil
}

// DeleteSession removes a session from the database
func (db *database) DeleteSession(sessionID string) error {
	log := getLogger().WithGroup("sessions")
	log.Debug("deleting session", "session_id", sessionID)

	result, err := db.Exec("DELETE FROM sessions WHERE id = ?", sessionID)
	if err != nil {
		log.Error("failed to delete session",
			"error", err,
			"session_id", sessionID)
		return fmt.Errorf("failed to delete session: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Error("failed to get rows affected after session deletion",
			"error", err,
			"session_id", sessionID)
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		log.Debug("no session found to delete", "session_id", sessionID)
		return fmt.Errorf("session not found")
	}

	log.Info("session deleted successfully", "session_id", sessionID)
	return nil
}

// CleanExpiredSessions removes all expired sessions from the database
func (db *database) CleanExpiredSessions() error {
	log := getLogger().WithGroup("sessions")
	log.Info("cleaning expired sessions")

	result, err := db.Exec("DELETE FROM sessions WHERE expires_at <= ?", time.Now())
	if err != nil {
		log.Error("failed to clean expired sessions", "error", err)
		return fmt.Errorf("failed to clean expired sessions: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Error("failed to get count of cleaned sessions", "error", err)
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	log.Info("expired sessions cleaned successfully", "sessions_removed", rowsAffected)
	return nil
}
