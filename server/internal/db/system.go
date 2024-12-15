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
	log := getLogger().WithGroup("system")
	log.Debug("ensuring JWT secret exists")

	// First, try to get existing secret
	secret, err := db.GetSystemSetting(JWTSecretKey)
	if err == nil {
		log.Debug("existing JWT secret found")
		return secret, nil
	}

	log.Info("no existing JWT secret found, generating new secret")

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

	log.Info("new JWT secret generated and stored successfully")
	return newSecret, nil
}

// GetSystemSetting retrieves a system setting by key
func (db *database) GetSystemSetting(key string) (string, error) {
	log := getLogger().WithGroup("system")
	log.Debug("retrieving system setting", "key", key)

	var value string
	err := db.QueryRow("SELECT value FROM system_settings WHERE key = ?", key).Scan(&value)
	if err != nil {
		return "", err
	}

	log.Debug("system setting retrieved successfully", "key", key)
	return value, nil
}

// SetSystemSetting stores or updates a system setting
func (db *database) SetSystemSetting(key, value string) error {
	log := getLogger().WithGroup("system")
	log.Debug("storing system setting", "key", key)

	_, err := db.Exec(`
        INSERT INTO system_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?`,
		key, value, value)

	if err != nil {
		return fmt.Errorf("failed to store system setting: %w", err)
	}

	log.Info("system setting stored successfully", "key", key)
	return nil
}

// generateRandomSecret generates a cryptographically secure random string
func generateRandomSecret(bytes int) (string, error) {
	log := getLogger().WithGroup("system")
	log.Debug("generating random secret", "bytes", bytes)

	b := make([]byte, bytes)
	_, err := rand.Read(b)
	if err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	secret := base64.StdEncoding.EncodeToString(b)
	log.Debug("random secret generated successfully", "bytes", bytes)
	return secret, nil
}

// GetSystemStats returns system-wide statistics
func (db *database) GetSystemStats() (*UserStats, error) {
	log := getLogger().WithGroup("system")
	log.Debug("collecting system statistics")

	stats := &UserStats{}

	// Get total users
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to get total users count: %w", err)
	}
	log.Debug("got total users count", "count", stats.TotalUsers)

	// Get total workspaces
	err = db.QueryRow("SELECT COUNT(*) FROM workspaces").Scan(&stats.TotalWorkspaces)
	if err != nil {
		return nil, fmt.Errorf("failed to get total workspaces count: %w", err)
	}
	log.Debug("got total workspaces count", "count", stats.TotalWorkspaces)

	// Get active users (users with activity in last 30 days)
	err = db.QueryRow(`
        SELECT COUNT(DISTINCT user_id)
        FROM sessions
        WHERE created_at > datetime('now', '-30 days')`).
		Scan(&stats.ActiveUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to get active users count: %w", err)
	}
	log.Debug("got active users count", "count", stats.ActiveUsers)
	return stats, nil
}
