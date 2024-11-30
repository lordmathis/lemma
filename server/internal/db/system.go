package db

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

const (
	// JWTSecretKey is the key for the JWT secret in the system settings
	JWTSecretKey = "jwt_secret"
)

// UserStats represents system-wide statistics
type UserStats struct {
	TotalUsers      int `json:"totalUsers"`
	TotalWorkspaces int `json:"totalWorkspaces"`
	ActiveUsers     int `json:"activeUsers"` // Users with activity in last 30 days
}

// EnsureJWTSecret makes sure a JWT signing secret exists in the database
// If no secret exists, it generates and stores a new one
func (db *database) EnsureJWTSecret() (string, error) {
	// First, try to get existing secret
	secret, err := db.GetSystemSetting(JWTSecretKey)
	if err == nil {
		return secret, nil
	}

	// Generate new secret if none exists
	newSecret, err := generateRandomSecret(32) // 256 bits
	if err != nil {
		return "", fmt.Errorf("failed to generate JWT secret: %w", err)
	}

	// Store the new secret
	err = db.SetSystemSetting(JWTSecretKey, newSecret)
	if err != nil {
		return "", fmt.Errorf("failed to store JWT secret: %w", err)
	}

	return newSecret, nil
}

// GetSystemSetting retrieves a system setting by key
func (db *database) GetSystemSetting(key string) (string, error) {
	var value string
	err := db.QueryRow("SELECT value FROM system_settings WHERE key = ?", key).Scan(&value)
	if err != nil {
		return "", err
	}
	return value, nil
}

// SetSystemSetting stores or updates a system setting
func (db *database) SetSystemSetting(key, value string) error {
	_, err := db.Exec(`
		INSERT INTO system_settings (key, value)
		VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = ?`,
		key, value, value)
	return err
}

// generateRandomSecret generates a cryptographically secure random string
func generateRandomSecret(bytes int) (string, error) {
	b := make([]byte, bytes)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

// GetSystemStats returns system-wide statistics
func (db *database) GetSystemStats() (*UserStats, error) {
	stats := &UserStats{}

	// Get total users
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)
	if err != nil {
		return nil, err
	}

	// Get total workspaces
	err = db.QueryRow("SELECT COUNT(*) FROM workspaces").Scan(&stats.TotalWorkspaces)
	if err != nil {
		return nil, err
	}

	// Get active users (users with activity in last 30 days)
	err = db.QueryRow(`
		SELECT COUNT(DISTINCT user_id) 
		FROM sessions 
		WHERE created_at > datetime('now', '-30 days')`).
		Scan(&stats.ActiveUsers)
	if err != nil {
		return nil, err
	}

	return stats, nil
}
