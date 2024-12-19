package db

import (
	"database/sql"
	"fmt"
	"lemma/internal/models"
)

// CreateUser inserts a new user record into the database
func (db *database) CreateUser(user *models.User) (*models.User, error) {
	log := getLogger().WithGroup("users")
	log.Debug("creating user", "email", user.Email)

	tx, err := db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	result, err := tx.Exec(`
        INSERT INTO users (email, display_name, password_hash, role)
        VALUES (?, ?, ?, ?)`,
		user.Email, user.DisplayName, user.PasswordHash, user.Role)
	if err != nil {
		return nil, fmt.Errorf("failed to insert user: %w", err)
	}

	userID, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get last insert ID: %w", err)
	}
	user.ID = int(userID)

	// Retrieve the created_at timestamp
	err = tx.QueryRow("SELECT created_at FROM users WHERE id = ?", user.ID).Scan(&user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get created timestamp: %w", err)
	}

	// Create default workspace with default settings
	defaultWorkspace := &models.Workspace{
		UserID: user.ID,
		Name:   "Main",
	}
	defaultWorkspace.SetDefaultSettings()

	// Create workspace with settings
	err = db.createWorkspaceTx(tx, defaultWorkspace)
	if err != nil {
		return nil, fmt.Errorf("failed to create default workspace: %w", err)
	}

	// Update user's last workspace ID
	_, err = tx.Exec("UPDATE users SET last_workspace_id = ? WHERE id = ?", defaultWorkspace.ID, user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to update last workspace ID: %w", err)
	}

	err = tx.Commit()
	if err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Debug("created user", "user_id", user.ID)

	user.LastWorkspaceID = defaultWorkspace.ID
	return user, nil
}

// Helper function to create a workspace in a transaction
func (db *database) createWorkspaceTx(tx *sql.Tx, workspace *models.Workspace) error {
	log := getLogger().WithGroup("users")
	result, err := tx.Exec(`
        INSERT INTO workspaces (
            user_id, name,
            theme, auto_save, show_hidden_files,
            git_enabled, git_url, git_user, git_token,
            git_auto_commit, git_commit_msg_template,
            git_commit_name, git_commit_email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		workspace.UserID, workspace.Name,
		workspace.Theme, workspace.AutoSave, workspace.ShowHiddenFiles,
		workspace.GitEnabled, workspace.GitURL, workspace.GitUser, workspace.GitToken,
		workspace.GitAutoCommit, workspace.GitCommitMsgTemplate,
		workspace.GitCommitName, workspace.GitCommitEmail,
	)
	if err != nil {
		return fmt.Errorf("failed to insert workspace: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get workspace ID: %w", err)
	}
	workspace.ID = int(id)

	log.Debug("created user workspace",
		"workspace_id", workspace.ID,
		"user_id", workspace.UserID)
	return nil
}

func (db *database) GetUserByID(id int) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow(`
        SELECT 
            id, email, display_name, password_hash, role, created_at, 
            last_workspace_id
        FROM users
        WHERE id = ?`, id).
		Scan(&user.ID, &user.Email, &user.DisplayName, &user.PasswordHash,
			&user.Role, &user.CreatedAt, &user.LastWorkspaceID)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}
	return user, nil
}

func (db *database) GetUserByEmail(email string) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow(`
        SELECT 
            id, email, display_name, password_hash, role, created_at, 
            last_workspace_id
        FROM users
        WHERE email = ?`, email).
		Scan(&user.ID, &user.Email, &user.DisplayName, &user.PasswordHash,
			&user.Role, &user.CreatedAt, &user.LastWorkspaceID)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}

	return user, nil
}

func (db *database) UpdateUser(user *models.User) error {
	result, err := db.Exec(`
        UPDATE users
        SET email = ?, display_name = ?, password_hash = ?, role = ?, last_workspace_id = ?
        WHERE id = ?`,
		user.Email, user.DisplayName, user.PasswordHash, user.Role,
		user.LastWorkspaceID, user.ID)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (db *database) GetAllUsers() ([]*models.User, error) {
	rows, err := db.Query(`
        SELECT 
            id, email, display_name, role, created_at,
            last_workspace_id
        FROM users
        ORDER BY id ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
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
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

func (db *database) UpdateLastWorkspace(userID int, workspaceName string) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	var workspaceID int
	err = tx.QueryRow("SELECT id FROM workspaces WHERE user_id = ? AND name = ?",
		userID, workspaceName).Scan(&workspaceID)
	if err != nil {
		return fmt.Errorf("failed to find workspace: %w", err)
	}

	_, err = tx.Exec("UPDATE users SET last_workspace_id = ? WHERE id = ?",
		workspaceID, userID)
	if err != nil {
		return fmt.Errorf("failed to update last workspace: %w", err)
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (db *database) DeleteUser(id int) error {
	log := getLogger().WithGroup("users")
	log.Debug("deleting user", "user_id", id)

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Delete all user's workspaces first
	log.Debug("deleting user workspaces", "user_id", id)
	_, err = tx.Exec("DELETE FROM workspaces WHERE user_id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete workspaces: %w", err)
	}

	// Delete the user
	_, err = tx.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Debug("deleted user", "user_id", id)
	return nil
}

func (db *database) GetLastWorkspaceName(userID int) (string, error) {
	var workspaceName string
	err := db.QueryRow(`
        SELECT 
            w.name
        FROM workspaces w
        JOIN users u ON u.last_workspace_id = w.id
        WHERE u.id = ?`, userID).
		Scan(&workspaceName)

	if err == sql.ErrNoRows {
		return "", fmt.Errorf("no last workspace found")
	}
	if err != nil {
		return "", fmt.Errorf("failed to fetch last workspace name: %w", err)
	}

	return workspaceName, nil
}

// CountAdminUsers returns the number of admin users in the system
func (db *database) CountAdminUsers() (int, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'admin'").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count admin users: %w", err)
	}

	return count, nil
}
