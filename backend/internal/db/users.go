package db

import (
	"database/sql"
	"novamd/internal/models"
)

func (db *DB) CreateUser(user *models.User) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	result, err := tx.Exec(`
		INSERT INTO users (email, display_name, password_hash, role)
		VALUES (?, ?, ?, ?)`,
		user.Email, user.DisplayName, user.PasswordHash, user.Role)
	if err != nil {
		return err
	}

	userID, err := result.LastInsertId()
	if err != nil {
		return err
	}
	user.ID = int(userID)

	// Create default workspace with default settings
	defaultWorkspace := &models.Workspace{
		UserID: user.ID,
		Name:   "Main",
	}
	defaultWorkspace.GetDefaultSettings() // Initialize default settings

	// Create workspace with settings
	err = db.createWorkspaceTx(tx, defaultWorkspace)
	if err != nil {
		return err
	}

	// Update user's last workspace ID
	_, err = tx.Exec("UPDATE users SET last_workspace_id = ? WHERE id = ?", defaultWorkspace.ID, user.ID)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	user.LastWorkspaceID = defaultWorkspace.ID
	return nil
}

func (db *DB) createWorkspaceTx(tx *sql.Tx, workspace *models.Workspace) error {
	result, err := tx.Exec(`
		INSERT INTO workspaces (
			user_id, name,
			theme, auto_save,
			git_enabled, git_url, git_user, git_token,
			git_auto_commit, git_commit_msg_template
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		workspace.UserID, workspace.Name,
		workspace.Theme, workspace.AutoSave,
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

func (db *DB) GetUserByID(id int) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow(`
		SELECT 
			u.id, u.email, u.display_name, u.role, u.created_at, 
			u.last_workspace_id, u.last_opened_file_path,
			COALESCE(w.id, 0) as workspace_id
		FROM users u
		LEFT JOIN workspaces w ON w.id = u.last_workspace_id
		WHERE u.id = ?`, id).
		Scan(&user.ID, &user.Email, &user.DisplayName, &user.Role, &user.CreatedAt,
			&user.LastWorkspaceID, &user.LastOpenedFilePath, &user.LastWorkspaceID)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (db *DB) GetUserByEmail(email string) (*models.User, error) {
	user := &models.User{}
	var lastOpenedFilePath sql.NullString
	err := db.QueryRow(`
		SELECT 
			u.id, u.email, u.display_name, u.password_hash, u.role, u.created_at, 
			u.last_workspace_id, u.last_opened_file_path,
			COALESCE(w.id, 0) as workspace_id
		FROM users u
		LEFT JOIN workspaces w ON w.id = u.last_workspace_id
		WHERE u.email = ?`, email).
		Scan(&user.ID, &user.Email, &user.DisplayName, &user.PasswordHash, &user.Role, &user.CreatedAt,
			&user.LastWorkspaceID, &lastOpenedFilePath, &user.LastWorkspaceID)
	if err != nil {
		return nil, err
	}
	if lastOpenedFilePath.Valid {
		user.LastOpenedFilePath = lastOpenedFilePath.String
	} else {
		user.LastOpenedFilePath = ""
	}
	return user, nil
}

func (db *DB) UpdateUser(user *models.User) error {
	_, err := db.Exec(`
		UPDATE users
		SET email = ?, display_name = ?, role = ?, last_workspace_id = ?, last_opened_file_path = ?
		WHERE id = ?`,
		user.Email, user.DisplayName, user.Role, user.LastWorkspaceID, user.LastOpenedFilePath, user.ID)
	return err
}

func (db *DB) UpdateLastWorkspace(userID, workspaceID int) error {
	_, err := db.Exec("UPDATE users SET last_workspace_id = ? WHERE id = ?", workspaceID, userID)
	return err
}

func (db *DB) UpdateLastOpenedFile(userID int, filePath string) error {
	_, err := db.Exec("UPDATE users SET last_opened_file_path = ? WHERE id = ?", filePath, userID)
	return err
}

func (db *DB) DeleteUser(id int) error {
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

func (db *DB) GetLastWorkspaceID(userID int) (int, error) {
	var workspaceID int
	err := db.QueryRow("SELECT last_workspace_id FROM users WHERE id = ?", userID).Scan(&workspaceID)
	return workspaceID, err
}
