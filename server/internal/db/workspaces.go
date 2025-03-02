package db

import (
	"database/sql"
	"fmt"
	"lemma/internal/models"
)

// CreateWorkspace inserts a new workspace record into the database
func (db *database) CreateWorkspace(workspace *models.Workspace) error {
	log := getLogger().WithGroup("workspaces")
	log.Debug("creating new workspace",
		"user_id", workspace.UserID,
		"name", workspace.Name,
		"git_enabled", workspace.GitEnabled)

	// Set default settings if not provided
	if workspace.Theme == "" {
		workspace.SetDefaultSettings()
	}

	query, err := db.NewQuery().
		InsertStruct(workspace, "workspaces", db.secretsService)

	if err != nil {
		return fmt.Errorf("failed to create query: %w", err)
	}

	query.Returning("id", "created_at")

	err = db.QueryRow(query.String(), query.Args()...).
		Scan(&workspace.ID, &workspace.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert workspace: %w", err)
	}

	return nil
}

// GetWorkspaceByID retrieves a workspace by its ID
func (db *database) GetWorkspaceByID(id int) (*models.Workspace, error) {
	query := db.NewQuery().
		Select(
			"id", "user_id", "name", "created_at",
			"theme", "auto_save", "show_hidden_files",
			"git_enabled", "git_url", "git_user", "git_token",
			"git_auto_commit", "git_commit_msg_template",
			"git_commit_name", "git_commit_email",
			"last_opened_file_path").
		From("workspaces").
		Where("id = ").Placeholder(id)

	workspace := &models.Workspace{}
	var encryptedToken string

	var lastOpenedFile sql.NullString

	err := db.QueryRow(query.String(), query.Args()...).Scan(
		&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt,
		&workspace.Theme, &workspace.AutoSave, &workspace.ShowHiddenFiles,
		&workspace.GitEnabled, &workspace.GitURL, &workspace.GitUser, &encryptedToken,
		&workspace.GitAutoCommit, &workspace.GitCommitMsgTemplate,
		&workspace.GitCommitName, &workspace.GitCommitEmail,
		&lastOpenedFile,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("workspace not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to fetch workspace: %w", err)
	}

	if lastOpenedFile.Valid {
		workspace.LastOpenedFilePath = lastOpenedFile.String
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
	query := db.NewQuery().
		Select(
			"id", "user_id", "name", "created_at",
			"theme", "auto_save", "show_hidden_files",
			"git_enabled", "git_url", "git_user", "git_token",
			"git_auto_commit", "git_commit_msg_template",
			"git_commit_name", "git_commit_email",
			"last_opened_file_path").
		From("workspaces").
		Where("user_id = ").Placeholder(userID).
		And("name = ").Placeholder(workspaceName)

	workspace := &models.Workspace{}
	var encryptedToken string
	var lastOpenedFile sql.NullString

	err := db.QueryRow(query.String(), query.Args()...).Scan(
		&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt,
		&workspace.Theme, &workspace.AutoSave, &workspace.ShowHiddenFiles,
		&workspace.GitEnabled, &workspace.GitURL, &workspace.GitUser, &encryptedToken,
		&workspace.GitAutoCommit, &workspace.GitCommitMsgTemplate,
		&workspace.GitCommitName, &workspace.GitCommitEmail,
		&lastOpenedFile,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("workspace not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to fetch workspace: %w", err)
	}

	if lastOpenedFile.Valid {
		workspace.LastOpenedFilePath = lastOpenedFile.String
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

	query := db.NewQuery()
	query, err := query.
		UpdateStruct(workspace, "workspaces", []string{"id =", "user_id ="}, []interface{}{workspace.ID, workspace.UserID})

	if err != nil {
		return fmt.Errorf("failed to create query: %w", err)
	}

	_, err = db.Exec(query.String(), query.Args()...)
	if err != nil {
		return fmt.Errorf("failed to update workspace: %w", err)
	}

	return nil
}

// GetWorkspacesByUserID retrieves all workspaces for a user
func (db *database) GetWorkspacesByUserID(userID int) ([]*models.Workspace, error) {
	query := db.NewQuery().
		Select(
			"id", "user_id", "name", "created_at",
			"theme", "auto_save", "show_hidden_files",
			"git_enabled", "git_url", "git_user", "git_token",
			"git_auto_commit", "git_commit_msg_template",
			"git_commit_name", "git_commit_email",
			"last_opened_file_path").
		From("workspaces").
		Where("user_id = ").Placeholder(userID)

	rows, err := db.Query(query.String(), query.Args()...)
	if err != nil {
		return nil, fmt.Errorf("failed to query workspaces: %w", err)
	}
	defer rows.Close()

	var workspaces []*models.Workspace
	for rows.Next() {
		workspace := &models.Workspace{}
		var encryptedToken string
		var lastOpenedFile sql.NullString
		err := rows.Scan(
			&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt,
			&workspace.Theme, &workspace.AutoSave, &workspace.ShowHiddenFiles,
			&workspace.GitEnabled, &workspace.GitURL, &workspace.GitUser, &encryptedToken,
			&workspace.GitAutoCommit, &workspace.GitCommitMsgTemplate,
			&workspace.GitCommitName, &workspace.GitCommitEmail,
			&lastOpenedFile,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan workspace row: %w", err)
		}

		if lastOpenedFile.Valid {
			workspace.LastOpenedFilePath = lastOpenedFile.String
		}

		// Decrypt token
		workspace.GitToken, err = db.decryptToken(encryptedToken)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt token: %w", err)
		}

		workspaces = append(workspaces, workspace)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating workspace rows: %w", err)
	}

	return workspaces, nil
}

// UpdateWorkspaceSettings updates only the settings portion of a workspace
func (db *database) UpdateWorkspaceSettings(workspace *models.Workspace) error {

	where := []string{"id ="}
	args := []interface{}{workspace.ID}

	query := db.NewQuery()
	query, err := query.
		UpdateStruct(workspace, "workspaces", where, args)

	if err != nil {
		return fmt.Errorf("failed to create query: %w", err)
	}

	_, err = db.Exec(query.String(), query.Args()...)
	if err != nil {
		return fmt.Errorf("failed to update workspace settings: %w", err)
	}

	return nil
}

// DeleteWorkspace removes a workspace record from the database
func (db *database) DeleteWorkspace(id int) error {
	log := getLogger().WithGroup("workspaces")

	query := db.NewQuery().
		Delete().
		From("workspaces").
		Where("id = ").Placeholder(id)

	_, err := db.Exec(query.String(), query.Args()...)
	if err != nil {
		return fmt.Errorf("failed to delete workspace: %w", err)
	}

	log.Debug("workspace deleted", "workspace_id", id)
	return nil
}

// DeleteWorkspaceTx removes a workspace record from the database within a transaction
func (db *database) DeleteWorkspaceTx(tx *sql.Tx, id int) error {
	log := getLogger().WithGroup("workspaces")

	query := db.NewQuery().
		Delete().
		From("workspaces").
		Where("id = ").Placeholder(id)

	result, err := tx.Exec(query.String(), query.Args()...)
	if err != nil {
		return fmt.Errorf("failed to delete workspace in transaction: %w", err)
	}

	_, err = result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected in transaction: %w", err)
	}

	log.Debug("workspace deleted", "workspace_id", id)
	return nil
}

// UpdateLastWorkspaceTx sets the last workspace for a user in a transaction
func (db *database) UpdateLastWorkspaceTx(tx *sql.Tx, userID, workspaceID int) error {
	query := db.NewQuery().
		Update("users").
		Set("last_workspace_id").Placeholder(workspaceID).
		Where("id = ").Placeholder(userID)

	result, err := tx.Exec(query.String(), query.Args()...)
	if err != nil {
		return fmt.Errorf("failed to update last workspace in transaction: %w", err)
	}

	_, err = result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected in transaction: %w", err)
	}

	return nil
}

// UpdateLastOpenedFile updates the last opened file path for a workspace
func (db *database) UpdateLastOpenedFile(workspaceID int, filePath string) error {
	query := db.NewQuery().
		Update("workspaces").
		Set("last_opened_file_path").Placeholder(filePath).
		Where("id = ").Placeholder(workspaceID)

	_, err := db.Exec(query.String(), query.Args()...)
	if err != nil {
		return fmt.Errorf("failed to update last opened file: %w", err)
	}

	return nil
}

// GetLastOpenedFile retrieves the last opened file path for a workspace
func (db *database) GetLastOpenedFile(workspaceID int) (string, error) {
	query := db.NewQuery().
		Select("last_opened_file_path").
		From("workspaces").
		Where("id = ").Placeholder(workspaceID)

	var filePath sql.NullString
	err := db.QueryRow(query.String(), query.Args()...).Scan(&filePath)

	if err == sql.ErrNoRows {
		return "", fmt.Errorf("workspace not found")
	}
	if err != nil {
		return "", fmt.Errorf("failed to fetch last opened file: %w", err)
	}

	if !filePath.Valid {
		return "", nil
	}

	return filePath.String, nil
}

// GetAllWorkspaces retrieves all workspaces in the database
func (db *database) GetAllWorkspaces() ([]*models.Workspace, error) {
	query := db.NewQuery().
		Select(
			"id", "user_id", "name", "created_at",
			"theme", "auto_save", "show_hidden_files",
			"git_enabled", "git_url", "git_user", "git_token",
			"git_auto_commit", "git_commit_msg_template",
			"git_commit_name", "git_commit_email",
			"last_opened_file_path").
		From("workspaces")

	rows, err := db.Query(query.String(), query.Args()...)
	if err != nil {
		return nil, fmt.Errorf("failed to query workspaces: %w", err)
	}
	defer rows.Close()

	var workspaces []*models.Workspace
	for rows.Next() {
		workspace := &models.Workspace{}
		var encryptedToken string
		var lastOpenedFile sql.NullString

		err := rows.Scan(
			&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt,
			&workspace.Theme, &workspace.AutoSave, &workspace.ShowHiddenFiles,
			&workspace.GitEnabled, &workspace.GitURL, &workspace.GitUser, &encryptedToken,
			&workspace.GitAutoCommit, &workspace.GitCommitMsgTemplate,
			&workspace.GitCommitName, &workspace.GitCommitEmail,
			&lastOpenedFile,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan workspace row: %w", err)
		}

		if lastOpenedFile.Valid {
			workspace.LastOpenedFilePath = lastOpenedFile.String
		}

		// Decrypt token
		workspace.GitToken, err = db.decryptToken(encryptedToken)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt token: %w", err)
		}

		workspaces = append(workspaces, workspace)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating workspace rows: %w", err)
	}

	return workspaces, nil
}
