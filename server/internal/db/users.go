package db

import (
	"database/sql"
	"novamd/internal/models"
)

// CreateUser inserts a new user record into the database
func (db *database) CreateUser(user *models.User) (*models.User, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	result, err := tx.Exec(`
		INSERT INTO users (email, display_name, password_hash, role)
		VALUES (?, ?, ?, ?)`,
		user.Email, user.DisplayName, user.PasswordHash, user.Role)
	if err != nil {
		return nil, err
	}

	userID, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}
	user.ID = int(userID)

	// Retrieve the created_at timestamp
	err = tx.QueryRow("SELECT created_at FROM users WHERE id = ?", user.ID).Scan(&user.CreatedAt)
	if err != nil {
		return nil, err
	}

	// Create default workspace with default settings
	defaultWorkspace := &models.Workspace{
		UserID: user.ID,
		Name:   "Main",
	}
	defaultWorkspace.SetDefaultSettings() // Initialize default settings

	// Create workspace with settings
	err = db.createWorkspaceTx(tx, defaultWorkspace)
	if err != nil {
		return nil, err
	}

	// Update user's last workspace ID
	_, err = tx.Exec("UPDATE users SET last_workspace_id = ? WHERE id = ?", defaultWorkspace.ID, user.ID)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	user.LastWorkspaceID = defaultWorkspace.ID
	return user, nil
}

// Helper function to create a workspace in a transaction
func (db *database) createWorkspaceTx(tx *sql.Tx, workspace *models.Workspace) error {
	result, err := tx.Exec(`
		INSERT INTO workspaces (
			user_id, name,
			theme, auto_save, show_hidden_files,
			git_enabled, git_url, git_user, git_token,
			git_auto_commit, git_commit_msg_template
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		workspace.UserID, workspace.Name,
		workspace.Theme, workspace.AutoSave, workspace.ShowHiddenFiles,
		workspace.GitEnabled, workspace.GitURL, workspace.GitUser, workspace.GitToken,
		workspace.GitAutoCommit, workspace.GitCommitMsgTemplate,
	)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	workspace.ID = int(id)
	return nil
}

// GetUserByID retrieves a user by ID
func (db *database) GetUserByID(id int) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow(`
        SELECT 
            id, email, display_name, password_hash, role, created_at, 
            last_workspace_id
        FROM users
        WHERE id = ?`, id).
		Scan(&user.ID, &user.Email, &user.DisplayName, &user.PasswordHash, &user.Role, &user.CreatedAt,
			&user.LastWorkspaceID)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// GetUserByEmail retrieves a user by email
func (db *database) GetUserByEmail(email string) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow(`
        SELECT 
            id, email, display_name, password_hash, role, created_at, 
            last_workspace_id
        FROM users
        WHERE email = ?`, email).
		Scan(&user.ID, &user.Email, &user.DisplayName, &user.PasswordHash, &user.Role, &user.CreatedAt,
			&user.LastWorkspaceID)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// UpdateUser updates a user's information
func (db *database) UpdateUser(user *models.User) error {
	_, err := db.Exec(`
		UPDATE users
		SET email = ?, display_name = ?, password_hash = ?, role = ?, last_workspace_id = ?
		WHERE id = ?`,
		user.Email, user.DisplayName, user.PasswordHash, user.Role, user.LastWorkspaceID, user.ID)
	return err
}

// GetAllUsers returns a list of all users in the system
func (db *database) GetAllUsers() ([]*models.User, error) {
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

// UpdateLastWorkspace updates the last workspace the user accessed
func (db *database) UpdateLastWorkspace(userID int, workspaceName string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var workspaceID int

	err = tx.QueryRow("SELECT id FROM workspaces WHERE user_id = ? AND name = ?", userID, workspaceName).Scan(&workspaceID)
	if err != nil {
		return err
	}

	_, err = tx.Exec("UPDATE users SET last_workspace_id = ? WHERE id = ?", workspaceID, userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// DeleteUser deletes a user and all their workspaces
func (db *database) DeleteUser(id int) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete all user's workspaces first
	_, err = tx.Exec("DELETE FROM workspaces WHERE user_id = ?", id)
	if err != nil {
		return err
	}

	// Delete the user
	_, err = tx.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// GetLastWorkspaceName returns the name of the last workspace the user accessed
func (db *database) GetLastWorkspaceName(userID int) (string, error) {
	var workspaceName string
	err := db.QueryRow(`
        SELECT 
            w.name
        FROM workspaces w
        JOIN users u ON u.last_workspace_id = w.id
        WHERE u.id = ?`, userID).
		Scan(&workspaceName)
	return workspaceName, err
}

// CountAdminUsers returns the number of admin users in the system
func (db *database) CountAdminUsers() (int, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'admin'").Scan(&count)
	return count, err
}
