package db

import (
	"database/sql"
	"fmt"
	"time"

	"lemma/internal/models"
)

// CreateSession inserts a new session record into the database
func (db *database) CreateSession(session *models.Session) error {
	query, err := NewQuery(db.dbType).
		InsertStruct(session, "sessions")
	if err != nil {
		return fmt.Errorf("failed to create query: %w", err)
	}
	_, err = db.Exec(query.String(), query.Args()...)
	if err != nil {
		return fmt.Errorf("failed to store session: %w", err)
	}

	return nil
}

// GetSessionByRefreshToken retrieves a session by its refresh token
func (db *database) GetSessionByRefreshToken(refreshToken string) (*models.Session, error) {
	session := &models.Session{}
	query := NewQuery(db.dbType).
		Select("id", "user_id", "refresh_token", "expires_at", "created_at").
		From("sessions").
		Where("refresh_token = ").
		Placeholder(refreshToken).
		And("expires_at >").
		Placeholder(time.Now())
	err := db.QueryRow(query.String(), query.Args()...).Scan(&session.ID, &session.UserID, &session.RefreshToken, &session.ExpiresAt, &session.CreatedAt)

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
	query := NewQuery(db.dbType).
		Select("id", "user_id", "refresh_token", "expires_at", "created_at").
		From("sessions").
		Where("id = ").
		Placeholder(sessionID).
		And("expires_at >").
		Placeholder(time.Now())
	err := db.QueryRow(query.String(), query.Args()...).Scan(&session.ID, &session.UserID, &session.RefreshToken, &session.ExpiresAt, &session.CreatedAt)

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
	query := NewQuery(db.dbType).
		Delete().
		From("sessions").
		Where("id = ").
		Placeholder(sessionID)

	result, err := db.Exec(query.String(), query.Args()...)
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
	query := NewQuery(db.dbType).
		Delete().
		From("sessions").
		Where("expires_at <=").
		Placeholder(time.Now())
	result, err := db.Exec(query.String(), query.Args()...)
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
