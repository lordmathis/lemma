// Package db provides the database access layer for the application. It contains methods for interacting with the database, such as creating, updating, and deleting records.
package db

import "novamd/internal/models"

// SystemStats represents system-wide statistics
type SystemStats struct {
	TotalUsers      int `json:"totalUsers"`
	TotalWorkspaces int `json:"totalWorkspaces"`
	ActiveUsers     int `json:"activeUsers"` // Users with activity in last 30 days
}

// GetAllUsers returns a list of all users in the system
func (db *DB) GetAllUsers() ([]*models.User, error) {
	rows, err := db.Query(`
		SELECT 
			id, email, display_name, role, created_at,
			last_workspace_id
		FROM users
		ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user := &models.User{}
		err := rows.Scan(
			&user.ID, &user.Email, &user.DisplayName, &user.Role,
			&user.CreatedAt, &user.LastWorkspaceID,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, nil
}

// GetSystemStats returns system-wide statistics
func (db *DB) GetSystemStats() (*SystemStats, error) {
	stats := &SystemStats{}

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
