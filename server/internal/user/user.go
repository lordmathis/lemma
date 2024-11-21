package user

import (
	"database/sql"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"

	"novamd/internal/db"
	"novamd/internal/models"
	"novamd/internal/storage"
)

type UserService struct {
	DB      db.Database
	Storage storage.Manager
}

func NewUserService(database db.Database, s storage.Manager) *UserService {
	return &UserService{
		DB:      database,
		Storage: s,
	}
}

func (s *UserService) SetupAdminUser(adminEmail, adminPassword string) (*models.User, error) {
	// Check if admin user exists
	adminUser, err := s.DB.GetUserByEmail(adminEmail)
	if adminUser != nil {
		return adminUser, nil // Admin user already exists
	} else if err != sql.ErrNoRows {
		return nil, err
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create admin user
	adminUser = &models.User{
		Email:        adminEmail,
		DisplayName:  "Admin",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleAdmin,
	}

	createdUser, err := s.DB.CreateUser(adminUser)
	if err != nil {
		return nil, fmt.Errorf("failed to create admin user: %w", err)
	}

	// Initialize workspace directory
	err = s.Storage.InitializeUserWorkspace(createdUser.ID, createdUser.LastWorkspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize admin workspace: %w", err)
	}

	log.Printf("Created admin user with ID: %d and default workspace with ID: %d", createdUser.ID, createdUser.LastWorkspaceID)

	return adminUser, nil
}
