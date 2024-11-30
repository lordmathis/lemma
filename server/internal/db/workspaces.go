package db

import (
	"database/sql"
	"fmt"
	"novamd/internal/models"
)

// CreateWorkspace inserts a new workspace record into the database
func (db *database) CreateWorkspace(workspace *models.Workspace) error {
	// Set default settings if not provided
	if workspace.Theme == "" {
		workspace.SetDefaultSettings()
	}

	// Encrypt token if present
	encryptedToken, err := db.encryptToken(workspace.GitToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt token: %w", err)
	}

	result, err := db.Exec(`
		INSERT INTO workspaces (
			user_id, name, theme, auto_save, show_hidden_files,
			git_enabled, git_url, git_user, git_token, 
			git_auto_commit, git_commit_msg_template,
			git_commit_name, git_commit_email
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		workspace.UserID, workspace.Name, workspace.Theme, workspace.AutoSave, workspace.ShowHiddenFiles,
		workspace.GitEnabled, workspace.GitURL, workspace.GitUser, encryptedToken,
		workspace.GitAutoCommit, workspace.GitCommitMsgTemplate, workspace.GitCommitName, workspace.GitCommitEmail,
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

// GetWorkspaceByID retrieves a workspace by its ID
func (db *database) GetWorkspaceByID(id int) (*models.Workspace, error) {
	workspace := &models.Workspace{}
	var encryptedToken string

	err := db.QueryRow(`
		SELECT 
			id, user_id, name, created_at, 
			theme, auto_save, show_hidden_files,
			git_enabled, git_url, git_user, git_token, 
			git_auto_commit, git_commit_msg_template,
			git_commit_name, git_commit_email
		FROM workspaces 
		WHERE id = ?`,
		id,
	).Scan(
		&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt,
		&workspace.Theme, &workspace.AutoSave, &workspace.ShowHiddenFiles,
		&workspace.GitEnabled, &workspace.GitURL, &workspace.GitUser, &encryptedToken,
		&workspace.GitAutoCommit, &workspace.GitCommitMsgTemplate, &workspace.GitCommitName, &workspace.GitCommitEmail,
	)
	if err != nil {
		return nil, err
	}

	// Decrypt token
	workspace.GitToken, err = db.decryptToken(encryptedToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt token: %w", err)
	}

	return workspace, nil
}

// GetWorkspaceByName retrieves a workspace by its name and user ID
func (db *database) GetWorkspaceByName(userID int, workspaceName string) (*models.Workspace, error) {
	workspace := &models.Workspace{}
	var encryptedToken string

	err := db.QueryRow(`
		SELECT 
			id, user_id, name, created_at, 
			theme, auto_save, show_hidden_files,
			git_enabled, git_url, git_user, git_token, 
			git_auto_commit, git_commit_msg_template,
			git_commit_name, git_commit_email
		FROM workspaces 
		WHERE user_id = ? AND name = ?`,
		userID, workspaceName,
	).Scan(
		&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt,
		&workspace.Theme, &workspace.AutoSave, &workspace.ShowHiddenFiles,
		&workspace.GitEnabled, &workspace.GitURL, &workspace.GitUser, &encryptedToken,
		&workspace.GitAutoCommit, &workspace.GitCommitMsgTemplate,
		&workspace.GitCommitName, &workspace.GitCommitEmail,
	)
	if err != nil {
		return nil, err
	}

	// Decrypt token
	workspace.GitToken, err = db.decryptToken(encryptedToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt token: %w", err)
	}

	return workspace, nil
}

// UpdateWorkspace updates a workspace record in the database
func (db *database) UpdateWorkspace(workspace *models.Workspace) error {
	// Encrypt token before storing
	encryptedToken, err := db.encryptToken(workspace.GitToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt token: %w", err)
	}

	_, err = db.Exec(`
		UPDATE workspaces 
		SET 
			name = ?,
			theme = ?,
			auto_save = ?,
			show_hidden_files = ?,
			git_enabled = ?,
			git_url = ?,
			git_user = ?,
			git_token = ?,
			git_auto_commit = ?,
			git_commit_msg_template = ?,
			git_commit_name = ?,
			git_commit_email = ?
		WHERE id = ? AND user_id = ?`,
		workspace.Name,
		workspace.Theme,
		workspace.AutoSave,
		workspace.ShowHiddenFiles,
		workspace.GitEnabled,
		workspace.GitURL,
		workspace.GitUser,
		encryptedToken,
		workspace.GitAutoCommit,
		workspace.GitCommitMsgTemplate,
		workspace.GitCommitName,
		workspace.GitCommitEmail,
		workspace.ID,
		workspace.UserID,
	)
	return err
}

// GetWorkspacesByUserID retrieves all workspaces for a user
func (db *database) GetWorkspacesByUserID(userID int) ([]*models.Workspace, error) {
	rows, err := db.Query(`
		SELECT 
			id, user_id, name, created_at,
			theme, auto_save, show_hidden_files,
			git_enabled, git_url, git_user, git_token, 
			git_auto_commit, git_commit_msg_template,
			git_commit_name, git_commit_email
		FROM workspaces 
		WHERE user_id = ?`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []*models.Workspace
	for rows.Next() {
		workspace := &models.Workspace{}
		var encryptedToken string
		err := rows.Scan(
			&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt,
			&workspace.Theme, &workspace.AutoSave, &workspace.ShowHiddenFiles,
			&workspace.GitEnabled, &workspace.GitURL, &workspace.GitUser, &encryptedToken,
			&workspace.GitAutoCommit, &workspace.GitCommitMsgTemplate,
			&workspace.GitCommitName, &workspace.GitCommitEmail,
		)
		if err != nil {
			return nil, err
		}

		// Decrypt token
		workspace.GitToken, err = db.decryptToken(encryptedToken)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt token: %w", err)
		}

		workspaces = append(workspaces, workspace)
	}
	return workspaces, nil
}

// UpdateWorkspaceSettings updates only the settings portion of a workspace
// This is useful when you don't want to modify the name or other core workspace properties
func (db *database) UpdateWorkspaceSettings(workspace *models.Workspace) error {
	_, err := db.Exec(`
		UPDATE workspaces 
		SET 
			theme = ?,
			auto_save = ?,
			show_hidden_files = ?,
			git_enabled = ?,
			git_url = ?,
			git_user = ?,
			git_token = ?,
			git_auto_commit = ?,
			git_commit_msg_template = ?,
			git_commit_name = ?,
			git_commit_email = ?
		WHERE id = ?`,
		workspace.Theme,
		workspace.AutoSave,
		workspace.ShowHiddenFiles,
		workspace.GitEnabled,
		workspace.GitURL,
		workspace.GitUser,
		workspace.GitToken,
		workspace.GitAutoCommit,
		workspace.GitCommitMsgTemplate,
		workspace.GitCommitName,
		workspace.GitCommitEmail,
		workspace.ID,
	)
	return err
}

// DeleteWorkspace removes a workspace record from the database
func (db *database) DeleteWorkspace(id int) error {
	_, err := db.Exec("DELETE FROM workspaces WHERE id = ?", id)
	return err
}

// DeleteWorkspaceTx removes a workspace record from the database within a transaction
func (db *database) DeleteWorkspaceTx(tx *sql.Tx, id int) error {
	_, err := tx.Exec("DELETE FROM workspaces WHERE id = ?", id)
	return err
}

// UpdateLastWorkspaceTx sets the last workspace for a user in with a transaction
func (db *database) UpdateLastWorkspaceTx(tx *sql.Tx, userID, workspaceID int) error {
	_, err := tx.Exec("UPDATE users SET last_workspace_id = ? WHERE id = ?", workspaceID, userID)
	return err
}

// UpdateLastOpenedFile updates the last opened file path for a workspace
func (db *database) UpdateLastOpenedFile(workspaceID int, filePath string) error {
	_, err := db.Exec("UPDATE workspaces SET last_opened_file_path = ? WHERE id = ?", filePath, workspaceID)
	return err
}

// GetLastOpenedFile retrieves the last opened file path for a workspace
func (db *database) GetLastOpenedFile(workspaceID int) (string, error) {
	var filePath sql.NullString
	err := db.QueryRow("SELECT last_opened_file_path FROM workspaces WHERE id = ?", workspaceID).Scan(&filePath)
	if err != nil {
		return "", err
	}
	if !filePath.Valid {
		return "", nil
	}
	return filePath.String, nil
}

// GetAllWorkspaces retrieves all workspaces in the database
func (db *database) GetAllWorkspaces() ([]*models.Workspace, error) {
	rows, err := db.Query(`
		SELECT 
			id, user_id, name, created_at,
			theme, auto_save, show_hidden_files,
			git_enabled, git_url, git_user, git_token, 
			git_auto_commit, git_commit_msg_template,
			git_commit_name, git_commit_email
		FROM workspaces`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []*models.Workspace
	for rows.Next() {
		workspace := &models.Workspace{}
		var encryptedToken string
		err := rows.Scan(
			&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt,
			&workspace.Theme, &workspace.AutoSave, &workspace.ShowHiddenFiles,
			&workspace.GitEnabled, &workspace.GitURL, &workspace.GitUser, &encryptedToken,
			&workspace.GitAutoCommit, &workspace.GitCommitMsgTemplate,
			&workspace.GitCommitName, &workspace.GitCommitEmail,
		)
		if err != nil {
			return nil, err
		}

		// Decrypt token
		workspace.GitToken, err = db.decryptToken(encryptedToken)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt token: %w", err)
		}

		workspaces = append(workspaces, workspace)
	}
	return workspaces, nil
}
