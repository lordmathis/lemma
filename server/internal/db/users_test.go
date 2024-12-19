package db_test

import (
	"strings"
	"testing"

	"novamd/internal/db"
	"novamd/internal/models"
	_ "novamd/internal/testenv"
)

func TestUserOperations(t *testing.T) {
	database, err := db.NewTestDB(":memory:", &mockSecrets{})
	if err != nil {
		t.Fatalf("failed to create test database: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	t.Run("CreateUser", func(t *testing.T) {
		testCases := []struct {
			name        string
			user        *models.User
			wantErr     bool
			errContains string
		}{
			{
				name: "valid user",
				user: &models.User{
					Email:        "test@example.com",
					DisplayName:  "Test User",
					PasswordHash: "hashed_password",
					Role:         models.RoleEditor,
				},
				wantErr: false,
			},
			{
				name: "duplicate email",
				user: &models.User{
					Email:        "test@example.com", // Same as above
					DisplayName:  "Another User",
					PasswordHash: "different_hash",
					Role:         models.RoleViewer,
				},
				wantErr:     true,
				errContains: "UNIQUE constraint failed",
			},
			{
				name: "invalid role",
				user: &models.User{
					Email:        "invalid@example.com",
					DisplayName:  "Invalid Role User",
					PasswordHash: "hash",
					Role:         "invalid_role",
				},
				wantErr:     true,
				errContains: "CHECK constraint failed",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				user, err := database.CreateUser(tc.user)

				if tc.wantErr {
					if err == nil {
						t.Error("expected error, got nil")
					} else if !strings.Contains(err.Error(), tc.errContains) {
						t.Errorf("error = %v, want error containing %v", err, tc.errContains)
					}
					return
				}

				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				// Verify user was created properly
				if user.ID == 0 {
					t.Error("expected non-zero user ID")
				}
				if user.Email != tc.user.Email {
					t.Errorf("Email = %v, want %v", user.Email, tc.user.Email)
				}
				if user.DisplayName != tc.user.DisplayName {
					t.Errorf("DisplayName = %v, want %v", user.DisplayName, tc.user.DisplayName)
				}
				if user.Role != tc.user.Role {
					t.Errorf("Role = %v, want %v", user.Role, tc.user.Role)
				}
				if user.CreatedAt.IsZero() {
					t.Error("CreatedAt should not be zero")
				}
				if user.LastWorkspaceID == 0 {
					t.Error("expected non-zero LastWorkspaceID (default workspace)")
				}
			})
		}
	})

	t.Run("GetUserByID", func(t *testing.T) {
		// Create a test user first
		createdUser, err := database.CreateUser(&models.User{
			Email:        "getbyid@example.com",
			DisplayName:  "Get By ID User",
			PasswordHash: "hash",
			Role:         models.RoleEditor,
		})
		if err != nil {
			t.Fatalf("failed to create test user: %v", err)
		}

		testCases := []struct {
			name    string
			userID  int
			wantErr bool
		}{
			{
				name:    "existing user",
				userID:  createdUser.ID,
				wantErr: false,
			},
			{
				name:    "non-existent user",
				userID:  99999,
				wantErr: true,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				user, err := database.GetUserByID(tc.userID)

				if tc.wantErr {
					if err == nil {
						t.Error("expected error, got nil")
					}
					return
				}

				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				if user.ID != tc.userID {
					t.Errorf("ID = %v, want %v", user.ID, tc.userID)
				}
			})
		}
	})

	t.Run("GetUserByEmail", func(t *testing.T) {
		// Create a test user first
		createdUser, err := database.CreateUser(&models.User{
			Email:        "getbyemail@example.com",
			DisplayName:  "Get By Email User",
			PasswordHash: "hash",
			Role:         models.RoleEditor,
		})
		if err != nil {
			t.Fatalf("failed to create test user: %v", err)
		}

		testCases := []struct {
			name    string
			email   string
			wantErr bool
		}{
			{
				name:    "existing user",
				email:   createdUser.Email,
				wantErr: false,
			},
			{
				name:    "non-existent user",
				email:   "nonexistent@example.com",
				wantErr: true,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				user, err := database.GetUserByEmail(tc.email)

				if tc.wantErr {
					if err == nil {
						t.Error("expected error, got nil")
					}
					return
				}

				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				if user.Email != tc.email {
					t.Errorf("Email = %v, want %v", user.Email, tc.email)
				}
			})
		}
	})

	t.Run("UpdateUser", func(t *testing.T) {
		// Create a test user first
		user, err := database.CreateUser(&models.User{
			Email:        "update@example.com",
			DisplayName:  "Original Name",
			PasswordHash: "original_hash",
			Role:         models.RoleEditor,
		})
		if err != nil {
			t.Fatalf("failed to create test user: %v", err)
		}

		// Update user details
		user.DisplayName = "Updated Name"
		user.PasswordHash = "new_hash"
		user.Role = models.RoleAdmin

		if err := database.UpdateUser(user); err != nil {
			t.Fatalf("failed to update user: %v", err)
		}

		// Verify updates
		updated, err := database.GetUserByID(user.ID)
		if err != nil {
			t.Fatalf("failed to get updated user: %v", err)
		}

		if updated.DisplayName != "Updated Name" {
			t.Errorf("DisplayName = %v, want %v", updated.DisplayName, "Updated Name")
		}
		if updated.PasswordHash != "new_hash" {
			t.Errorf("PasswordHash = %v, want %v", updated.PasswordHash, "new_hash")
		}
		if updated.Role != models.RoleAdmin {
			t.Errorf("Role = %v, want %v", updated.Role, models.RoleAdmin)
		}
	})

	t.Run("GetAllUsers", func(t *testing.T) {
		// Create several test users
		testUsers := []*models.User{
			{
				Email:        "user1@example.com",
				DisplayName:  "User One",
				PasswordHash: "hash1",
				Role:         models.RoleEditor,
			},
			{
				Email:        "user2@example.com",
				DisplayName:  "User Two",
				PasswordHash: "hash2",
				Role:         models.RoleViewer,
			},
		}

		for _, u := range testUsers {
			_, err := database.CreateUser(u)
			if err != nil {
				t.Fatalf("failed to create test user: %v", err)
			}
		}

		// Get all users
		users, err := database.GetAllUsers()
		if err != nil {
			t.Fatalf("failed to get all users: %v", err)
		}

		// We should have at least as many users as we just created
		// (there might be more from previous tests)
		if len(users) < len(testUsers) {
			t.Errorf("got %d users, want at least %d", len(users), len(testUsers))
		}

		// Verify each test user exists in the result
		for _, expected := range testUsers {
			found := false
			for _, u := range users {
				if u.Email == expected.Email {
					found = true
					if u.DisplayName != expected.DisplayName {
						t.Errorf("DisplayName = %v, want %v", u.DisplayName, expected.DisplayName)
					}
					if u.Role != expected.Role {
						t.Errorf("Role = %v, want %v", u.Role, expected.Role)
					}
					break
				}
			}
			if !found {
				t.Errorf("user with email %s not found in results", expected.Email)
			}
		}
	})

	t.Run("UpdateLastWorkspace", func(t *testing.T) {
		// Create a test user with multiple workspaces
		user, err := database.CreateUser(&models.User{
			Email:        "workspace@example.com",
			DisplayName:  "Workspace User",
			PasswordHash: "hash",
			Role:         models.RoleEditor,
		})
		if err != nil {
			t.Fatalf("failed to create test user: %v", err)
		}

		// Create additional workspace
		workspace := &models.Workspace{
			UserID: user.ID,
			Name:   "Second Workspace",
		}
		if err := database.CreateWorkspace(workspace); err != nil {
			t.Fatalf("failed to create additional workspace: %v", err)
		}

		// Update last workspace
		err = database.UpdateLastWorkspace(user.ID, workspace.Name)
		if err != nil {
			t.Fatalf("failed to update last workspace: %v", err)
		}

		// Verify update
		lastWorkspace, err := database.GetLastWorkspaceName(user.ID)
		if err != nil {
			t.Fatalf("failed to get last workspace: %v", err)
		}

		if lastWorkspace != workspace.Name {
			t.Errorf("LastWorkspace = %v, want %v", lastWorkspace, workspace.Name)
		}
	})

	t.Run("DeleteUser", func(t *testing.T) {
		// Create a test user
		user, err := database.CreateUser(&models.User{
			Email:        "delete@example.com",
			DisplayName:  "Delete User",
			PasswordHash: "hash",
			Role:         models.RoleEditor,
		})
		if err != nil {
			t.Fatalf("failed to create test user: %v", err)
		}

		// Delete the user
		if err := database.DeleteUser(user.ID); err != nil {
			t.Fatalf("failed to delete user: %v", err)
		}

		// Verify user is gone
		_, err = database.GetUserByID(user.ID)
		if err == nil {
			t.Error("expected error getting deleted user, got nil")
		}

		// Verify workspaces are gone
		workspaces, err := database.GetWorkspacesByUserID(user.ID)
		if err != nil {
			t.Fatalf("unexpected error checking workspaces: %v", err)
		}
		if len(workspaces) > 0 {
			t.Error("expected no workspaces for deleted user")
		}
	})

	t.Run("CountAdminUsers", func(t *testing.T) {
		// Create users with different roles
		testUsers := []*models.User{
			{
				Email:        "admin1@example.com",
				DisplayName:  "Admin One",
				PasswordHash: "hash1",
				Role:         models.RoleAdmin,
			},
			{
				Email:        "admin2@example.com",
				DisplayName:  "Admin Two",
				PasswordHash: "hash2",
				Role:         models.RoleAdmin,
			},
			{
				Email:        "editor@example.com",
				DisplayName:  "Editor",
				PasswordHash: "hash3",
				Role:         models.RoleEditor,
			},
		}

		for _, u := range testUsers {
			_, err := database.CreateUser(u)
			if err != nil {
				t.Fatalf("failed to create test user: %v", err)
			}
		}

		// Count admin users
		count, err := database.CountAdminUsers()
		if err != nil {
			t.Fatalf("failed to count admin users: %v", err)
		}

		// We should have at least 2 admin users (from our test cases)
		// There might be more from previous tests
		if count < 2 {
			t.Errorf("AdminCount = %d, want at least 2", count)
		}
	})
}
