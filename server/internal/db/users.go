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

	query, err := NewQuery(db.dbType).
		InsertStruct(user, "users")

	if err != nil {
		return nil, fmt.Errorf("failed to create query: %w", err)
	}

	query.Returning("id", "created_at")

	err = tx.QueryRow(query.String(), query.Args()...).
		Scan(&user.ID, &user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert user: %w", err)
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
	query = NewQuery(db.dbType).
		Update("users").
		Set("last_workspace_id").
		Placeholder(defaultWorkspace.ID).
		Where("id = ").
		Placeholder(user.ID)
	_, err = tx.Exec(query.String(), query.Args()...)
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

	insertQuery, err := NewQuery(db.dbType).
		InsertStruct(workspace, "workspaces")

	if err != nil {
		return fmt.Errorf("failed to create query: %w", err)
	}

	insertQuery.Returning("id")

	err = tx.QueryRow(insertQuery.String(), insertQuery.Args()...).Scan(&workspace.ID)
	if err != nil {
		return fmt.Errorf("failed to insert workspace: %w", err)
	}

	log.Debug("created user workspace",
		"workspace_id", workspace.ID,
		"user_id", workspace.UserID)
	return nil
}

// GetUserByID retrieves a user by its ID
func (db *database) GetUserByID(id int) (*models.User, error) {
	query := NewQuery(db.dbType).
		Select("id", "email", "display_name", "password_hash", "role", "created_at", "last_workspace_id").
		From("users").
		Where("id = ").Placeholder(id)

	user := &models.User{}
	err := db.QueryRow(query.String(), query.Args()...).
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

// GetUserByEmail retrieves a user by its email
func (db *database) GetUserByEmail(email string) (*models.User, error) {
	query := NewQuery(db.dbType).
		Select("id", "email", "display_name", "password_hash", "role", "created_at", "last_workspace_id").
		From("users").
		Where("email = ").Placeholder(email)

	user := &models.User{}
	err := db.QueryRow(query.String(), query.Args()...).
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

// UpdateUser updates an existing user record in the database
func (db *database) UpdateUser(user *models.User) error {
	query := NewQuery(db.dbType).
		Update("users").
		Set("email").Placeholder(user.Email).
		Set("display_name").Placeholder(user.DisplayName).
		Set("password_hash").Placeholder(user.PasswordHash).
		Set("role").Placeholder(user.Role).
		Set("last_workspace_id").Placeholder(user.LastWorkspaceID).
		Where("id = ").Placeholder(user.ID)

	result, err := db.Exec(query.String(), query.Args()...)
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

// GetAllUsers retrieves all users from the database
func (db *database) GetAllUsers() ([]*models.User, error) {
	query := NewQuery(db.dbType).
		Select("id", "email", "display_name", "role", "created_at", "last_workspace_id").
		From("users").
		OrderBy("id ASC")

	rows, err := db.Query(query.String(), query.Args()...)
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

	// Find workspace ID from name
	workspaceQuery := NewQuery(db.dbType).
		Select("id").
		From("workspaces").
		Where("user_id = ").Placeholder(userID).
		And("name = ").Placeholder(workspaceName)

	var workspaceID int
	err = tx.QueryRow(workspaceQuery.String(), workspaceQuery.Args()...).Scan(&workspaceID)
	if err != nil {
		return fmt.Errorf("failed to find workspace: %w", err)
	}

	// Update user's last workspace
	updateQuery := NewQuery(db.dbType).
		Update("users").
		Set("last_workspace_id").Placeholder(workspaceID).
		Where("id = ").Placeholder(userID)

	_, err = tx.Exec(updateQuery.String(), updateQuery.Args()...)
	if err != nil {
		return fmt.Errorf("failed to update last workspace: %w", err)
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// DeleteUser deletes a user and all their workspaces
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

	deleteWorkspacesQuery := NewQuery(db.dbType).
		Delete().
		From("workspaces").
		Where("user_id = ").Placeholder(id)

	_, err = tx.Exec(deleteWorkspacesQuery.String(), deleteWorkspacesQuery.Args()...)
	if err != nil {
		return fmt.Errorf("failed to delete workspaces: %w", err)
	}

	// Delete the user
	deleteUserQuery := NewQuery(db.dbType).
		Delete().
		From("users").
		Where("id = ").Placeholder(id)

	_, err = tx.Exec(deleteUserQuery.String(), deleteUserQuery.Args()...)
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

// GetLastWorkspaceName retrieves the name of the last workspace accessed by a user
func (db *database) GetLastWorkspaceName(userID int) (string, error) {
	query := NewQuery(db.dbType).
		Select("w.name").
		From("workspaces w").
		Join(InnerJoin, "users u", "u.last_workspace_id = w.id").
		Where("u.id = ").Placeholder(userID)

	var workspaceName string
	err := db.QueryRow(query.String(), query.Args()...).Scan(&workspaceName)

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
	query := NewQuery(db.dbType).
		Select("COUNT(*)").
		From("users").
		Where("role = ").Placeholder(models.RoleAdmin)

	var count int
	err := db.QueryRow(query.String(), query.Args()...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count admin users: %w", err)
	}

	return count, nil
}
