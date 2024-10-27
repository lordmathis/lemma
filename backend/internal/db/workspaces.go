package db

import (
	"novamd/internal/models"
)

func (db *DB) CreateWorkspace(workspace *models.Workspace) error {
	// Set default settings if not provided
	if workspace.Theme == "" {
		workspace.GetDefaultSettings()
	}

	result, err := db.Exec(`
		INSERT INTO workspaces (
			user_id, name, theme, auto_save, 
			git_enabled, git_url, git_user, git_token, 
			git_auto_commit, git_commit_msg_template
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		workspace.UserID, workspace.Name, workspace.Theme, workspace.AutoSave,
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

func (db *DB) GetWorkspaceByID(id int) (*models.Workspace, error) {
	workspace := &models.Workspace{}
	err := db.QueryRow(`
		SELECT 
			id, user_id, name, created_at, 
			theme, auto_save, 
			git_enabled, git_url, git_user, git_token, 
			git_auto_commit, git_commit_msg_template
		FROM workspaces 
		WHERE id = ?`,
		id,
	).Scan(
		&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt,
		&workspace.Theme, &workspace.AutoSave,
		&workspace.GitEnabled, &workspace.GitURL, &workspace.GitUser, &workspace.GitToken,
		&workspace.GitAutoCommit, &workspace.GitCommitMsgTemplate,
	)
	if err != nil {
		return nil, err
	}
	return workspace, nil
}

func (db *DB) GetWorkspacesByUserID(userID int) ([]*models.Workspace, error) {
	rows, err := db.Query(`
		SELECT 
			id, user_id, name, created_at,
			theme, auto_save, 
			git_enabled, git_url, git_user, git_token, 
			git_auto_commit, git_commit_msg_template
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
		err := rows.Scan(
			&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt,
			&workspace.Theme, &workspace.AutoSave,
			&workspace.GitEnabled, &workspace.GitURL, &workspace.GitUser, &workspace.GitToken,
			&workspace.GitAutoCommit, &workspace.GitCommitMsgTemplate,
		)
		if err != nil {
			return nil, err
		}
		workspaces = append(workspaces, workspace)
	}
	return workspaces, nil
}

func (db *DB) UpdateWorkspace(workspace *models.Workspace) error {
	_, err := db.Exec(`
		UPDATE workspaces 
		SET 
			name = ?,
			theme = ?,
			auto_save = ?,
			git_enabled = ?,
			git_url = ?,
			git_user = ?,
			git_token = ?,
			git_auto_commit = ?,
			git_commit_msg_template = ?
		WHERE id = ? AND user_id = ?`,
		workspace.Name,
		workspace.Theme,
		workspace.AutoSave,
		workspace.GitEnabled,
		workspace.GitURL,
		workspace.GitUser,
		workspace.GitToken,
		workspace.GitAutoCommit,
		workspace.GitCommitMsgTemplate,
		workspace.ID,
		workspace.UserID,
	)
	return err
}

// UpdateWorkspaceSettings updates only the settings portion of a workspace
// This is useful when you don't want to modify the name or other core workspace properties
func (db *DB) UpdateWorkspaceSettings(workspace *models.Workspace) error {
	_, err := db.Exec(`
		UPDATE workspaces 
		SET 
			theme = ?,
			auto_save = ?,
			git_enabled = ?,
			git_url = ?,
			git_user = ?,
			git_token = ?,
			git_auto_commit = ?,
			git_commit_msg_template = ?
		WHERE id = ?`,
		workspace.Theme,
		workspace.AutoSave,
		workspace.GitEnabled,
		workspace.GitURL,
		workspace.GitUser,
		workspace.GitToken,
		workspace.GitAutoCommit,
		workspace.GitCommitMsgTemplate,
		workspace.ID,
	)
	return err
}

func (db *DB) DeleteWorkspace(id int) error {
	_, err := db.Exec("DELETE FROM workspaces WHERE id = ?", id)
	return err
}
