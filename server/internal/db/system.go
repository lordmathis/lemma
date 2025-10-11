package db

import (
	"fmt"
)

// UserStats represents system-wide statistics
type UserStats struct {
	TotalUsers      int `json:"totalUsers"`
	TotalWorkspaces int `json:"totalWorkspaces"`
	ActiveUsers     int `json:"activeUsers"` // Users with activity in last 30 days
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
