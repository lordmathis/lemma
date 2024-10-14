package db

import (
	"novamd/internal/models"
)

func (db *DB) CreateUser(user *models.User) error {
	_, err := db.Exec("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
		user.Username, user.Email, user.PasswordHash)
	return err
}

func (db *DB) GetUserByID(id int) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow("SELECT id, username, email, created_at FROM users WHERE id = ?", id).
		Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (db *DB) GetUserByUsername(username string) (*models.User, error) {
	user := &models.User{}
	err := db.QueryRow("SELECT id, username, email, password_hash, created_at FROM users WHERE username = ?", username).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}