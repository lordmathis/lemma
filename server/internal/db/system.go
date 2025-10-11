package db

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

// UserStats represents system-wide statistics
type UserStats struct {
	TotalUsers      int `json:"totalUsers"`
	TotalWorkspaces int `json:"totalWorkspaces"`
	ActiveUsers     int `json:"activeUsers"` // Users with activity in last 30 days
}

// GetSystemSetting retrieves a system setting by key
func (db *database) GetSystemSetting(key string) (string, error) {
	var value string
	query := db.NewQuery().
		Select("value").
		From("system_settings").
		Where("key = ").
		Placeholder(key)
	err := db.QueryRow(query.String(), query.args...).Scan(&value)
	if err != nil {
		return "", err
	}

	return value, nil
}

// SetSystemSetting stores or updates a system setting
func (db *database) SetSystemSetting(key, value string) error {
	query := db.NewQuery().
		Insert("system_settings", "key", "value").
		Values(2).
		AddArgs(key, value).
		Write("ON CONFLICT(key) DO UPDATE SET value = ").
		Placeholder(value)

	_, err := db.Exec(query.String(), query.args...)

	if err != nil {
		return fmt.Errorf("failed to store system setting: %w", err)
	}

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
	return secret, nil
}

// GetSystemStats returns system-wide statistics
func (db *database) GetSystemStats() (*UserStats, error) {
	stats := &UserStats{}

	// Get total users
	query := db.NewQuery().
		Select("COUNT(*)").
		From("users")
	err := db.QueryRow(query.String()).Scan(&stats.TotalUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to get total users count: %w", err)
	}

	// Get total workspaces
	query = db.NewQuery().
		Select("COUNT(*)").
		From("workspaces")
	err = db.QueryRow(query.String()).Scan(&stats.TotalWorkspaces)
	if err != nil {
		return nil, fmt.Errorf("failed to get total workspaces count: %w", err)
	}

	// Get active users (users with activity in last 30 days)
	query = db.NewQuery().
		Select("COUNT(DISTINCT user_id)").
		From("sessions").
		Where("created_at >").
		TimeSince(30)
	err = db.QueryRow(query.String()).
		Scan(&stats.ActiveUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to get active users count: %w", err)
	}
	return stats, nil
}
