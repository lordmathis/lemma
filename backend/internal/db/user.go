package db

import (
	"novamd/internal/models"
)

func (db *DB) CreateUser(user *models.User) error {
	_, err := db.Exec(`
		INSERT INTO users (email, display_name, password_hash)
		VALUES (?, ?, ?)`,
		user.Email, user.DisplayName, user.PasswordHash)
	return err
}

func (db *DB) GetUserByID(id int) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow(`
		SELECT id, email, display_name, created_at, last_workspace_id, last_opened_file_path
		FROM users WHERE id = ?`, id).
		Scan(&user.ID, &user.Email, &user.DisplayName, &user.CreatedAt,
			&user.LastWorkspaceID, &user.LastOpenedFilePath)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (db *DB) GetUserByEmail(email string) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow(`
		SELECT id, email, display_name, password_hash, created_at, last_workspace_id, last_opened_file_path
		FROM users WHERE email = ?`, email).
		Scan(&user.ID, &user.Email, &user.DisplayName, &user.PasswordHash, &user.CreatedAt,
			&user.LastWorkspaceID, &user.LastOpenedFilePath)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (db *DB) UpdateUser(user *models.User) error {
	_, err := db.Exec(`
		UPDATE users
		SET email = ?, display_name = ?, last_workspace_id = ?, last_opened_file_path = ?
		WHERE id = ?`,
		user.Email, user.DisplayName, user.LastWorkspaceID, user.LastOpenedFilePath, user.ID)
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
	_, err := db.Exec("DELETE FROM users WHERE id = ?", id)
	return err
}

func (db *DB) GetLastWorkspaceID(userID int) (int, error) {
	var workspaceID int
	err := db.QueryRow("SELECT last_workspace_id FROM users WHERE id = ?", userID).Scan(&workspaceID)
	return workspaceID, err
}
