package db

import (
	"novamd/internal/models"
)

func (db *DB) CreateWorkspace(workspace *models.Workspace) error {
	result, err := db.Exec("INSERT INTO workspaces (user_id, name) VALUES (?, ?, ?)",
		workspace.UserID, workspace.Name)
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
	err := db.QueryRow("SELECT id, user_id, name, created_at FROM workspaces WHERE id = ?", id).
		Scan(&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt)
	if err != nil {
		return nil, err
	}
	return workspace, nil
}

func (db *DB) GetWorkspacesByUserID(userID int) ([]*models.Workspace, error) {
	rows, err := db.Query("SELECT id, user_id, name, created_at FROM workspaces WHERE user_id = ?", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []*models.Workspace
	for rows.Next() {
		workspace := &models.Workspace{}
		err := rows.Scan(&workspace.ID, &workspace.UserID, &workspace.Name, &workspace.CreatedAt)
		if err != nil {
			return nil, err
		}
		workspaces = append(workspaces, workspace)
	}
	return workspaces, nil
}

func (db *DB) UpdateWorkspace(workspace *models.Workspace) error {
	_, err := db.Exec("UPDATE workspaces SET name = ? WHERE id = ? AND user_id = ?",
		workspace.Name, workspace.ID, workspace.UserID)
	return err
}

func (db *DB) DeleteWorkspace(id int) error {
	_, err := db.Exec("DELETE FROM workspaces WHERE id = ?", id)
	return err
}
