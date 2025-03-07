package db_test

import (
	"strings"
	"testing"

	"lemma/internal/db"
	"lemma/internal/models"
	_ "lemma/internal/testenv"
)

func TestWorkspaceOperations(t *testing.T) {
	database, err := db.NewTestSQLiteDB(&mockSecrets{})
	if err != nil {
		t.Fatalf("failed to create test database: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	// Create a test user first
	user, err := database.CreateUser(&models.User{
		Email:        "test@example.com",
		DisplayName:  "Test User",
		PasswordHash: "hash",
		Role:         models.RoleEditor,
	})
	if err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}

	t.Run("CreateWorkspace", func(t *testing.T) {
		testCases := []struct {
			name        string
			workspace   *models.Workspace
			wantErr     bool
			errContains string
		}{
			{
				name: "valid workspace",
				workspace: &models.Workspace{
					UserID: user.ID,
					Name:   "Test Workspace",
				},
				wantErr: false,
			},
			{
				name: "non-existent user",
				workspace: &models.Workspace{
					UserID: 99999,
					Name:   "Invalid User",
				},
				wantErr:     true,
				errContains: "FOREIGN KEY constraint failed",
			},
			{
				name: "with git settings",
				workspace: &models.Workspace{
					UserID:               user.ID,
					Name:                 "Git Workspace",
					Theme:                "dark",
					AutoSave:             true,
					ShowHiddenFiles:      true,
					GitEnabled:           true,
					GitURL:               "https://github.com/user/repo",
					GitUser:              "username",
					GitToken:             "secret-token",
					GitAutoCommit:        true,
					GitCommitMsgTemplate: "${action} ${filename}",
					GitCommitName:        "Test User",
					GitCommitEmail:       "test@example.com",
				},
				wantErr: false,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				if tc.workspace.Theme == "" {
					tc.workspace.SetDefaultSettings()
				}

				err := database.CreateWorkspace(tc.workspace)

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

				// Verify workspace was created properly
				if tc.workspace.ID == 0 {
					t.Error("expected non-zero workspace ID")
				}

				// Retrieve and verify workspace
				stored, err := database.GetWorkspaceByID(tc.workspace.ID)
				if err != nil {
					t.Fatalf("failed to retrieve workspace: %v", err)
				}

				verifyWorkspace(t, stored, tc.workspace)
			})
		}
	})

	t.Run("GetWorkspaceByID", func(t *testing.T) {
		// Create a test workspace first
		workspace := &models.Workspace{
			UserID: user.ID,
			Name:   "Get By ID Workspace",
		}
		workspace.SetDefaultSettings()
		if err := database.CreateWorkspace(workspace); err != nil {
			t.Fatalf("failed to create test workspace: %v", err)
		}

		testCases := []struct {
			name        string
			workspaceID int
			wantErr     bool
		}{
			{
				name:        "existing workspace",
				workspaceID: workspace.ID,
				wantErr:     false,
			},
			{
				name:        "non-existent workspace",
				workspaceID: 99999,
				wantErr:     true,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				result, err := database.GetWorkspaceByID(tc.workspaceID)

				if tc.wantErr {
					if err == nil {
						t.Error("expected error, got nil")
					}
					return
				}

				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				if result.ID != tc.workspaceID {
					t.Errorf("ID = %v, want %v", result.ID, tc.workspaceID)
				}
			})
		}
	})

	t.Run("GetWorkspaceByName", func(t *testing.T) {
		// Create a test workspace first
		workspace := &models.Workspace{
			UserID: user.ID,
			Name:   "Get By Name Workspace",
		}
		workspace.SetDefaultSettings()
		if err := database.CreateWorkspace(workspace); err != nil {
			t.Fatalf("failed to create test workspace: %v", err)
		}

		testCases := []struct {
			name          string
			userID        int
			workspaceName string
			wantErr       bool
		}{
			{
				name:          "existing workspace",
				userID:        user.ID,
				workspaceName: workspace.Name,
				wantErr:       false,
			},
			{
				name:          "wrong user ID",
				userID:        99999,
				workspaceName: workspace.Name,
				wantErr:       true,
			},
			{
				name:          "non-existent workspace",
				userID:        user.ID,
				workspaceName: "Non-existent",
				wantErr:       true,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				result, err := database.GetWorkspaceByName(tc.userID, tc.workspaceName)

				if tc.wantErr {
					if err == nil {
						t.Error("expected error, got nil")
					}
					return
				}

				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				if result.Name != tc.workspaceName {
					t.Errorf("Name = %v, want %v", result.Name, tc.workspaceName)
				}
				if result.UserID != tc.userID {
					t.Errorf("UserID = %v, want %v", result.UserID, tc.userID)
				}
			})
		}
	})

	t.Run("UpdateWorkspace", func(t *testing.T) {
		// Create a test workspace first
		workspace := &models.Workspace{
			UserID: user.ID,
			Name:   "Update Workspace",
		}
		workspace.SetDefaultSettings()
		if err := database.CreateWorkspace(workspace); err != nil {
			t.Fatalf("failed to create test workspace: %v", err)
		}

		// Update workspace settings
		workspace.Theme = "dark"
		workspace.AutoSave = true
		workspace.ShowHiddenFiles = true
		workspace.GitEnabled = true
		workspace.GitURL = "https://github.com/user/repo"
		workspace.GitUser = "username"
		workspace.GitToken = "new-token"
		workspace.GitAutoCommit = true
		workspace.GitCommitMsgTemplate = "custom ${filename}"
		workspace.GitCommitName = "Test User"
		workspace.GitCommitEmail = "test@example.com"

		if err := database.UpdateWorkspace(workspace); err != nil {
			t.Fatalf("failed to update workspace: %v", err)
		}

		// Verify updates
		updated, err := database.GetWorkspaceByID(workspace.ID)
		if err != nil {
			t.Fatalf("failed to get updated workspace: %v", err)
		}

		verifyWorkspace(t, updated, workspace)
	})

	t.Run("GetWorkspacesByUserID", func(t *testing.T) {
		// Create several test workspaces
		testWorkspaces := []*models.Workspace{
			{
				UserID: user.ID,
				Name:   "User Workspace 1",
			},
			{
				UserID: user.ID,
				Name:   "User Workspace 2",
			},
		}

		for _, w := range testWorkspaces {
			w.SetDefaultSettings()
			if err := database.CreateWorkspace(w); err != nil {
				t.Fatalf("failed to create test workspace: %v", err)
			}
		}

		// Get all workspaces for user
		workspaces, err := database.GetWorkspacesByUserID(user.ID)
		if err != nil {
			t.Fatalf("failed to get workspaces: %v", err)
		}

		// We should have at least as many workspaces as we just created
		// (there might be more from previous tests)
		if len(workspaces) < len(testWorkspaces) {
			t.Errorf("got %d workspaces, want at least %d", len(workspaces), len(testWorkspaces))
		}

		// Verify each test workspace exists in the result
		for _, expected := range testWorkspaces {
			found := false
			for _, w := range workspaces {
				if w.Name == expected.Name {
					found = true
					if w.UserID != expected.UserID {
						t.Errorf("UserID = %v, want %v", w.UserID, expected.UserID)
					}
					break
				}
			}
			if !found {
				t.Errorf("workspace %s not found in results", expected.Name)
			}
		}
	})

	t.Run("UpdateLastOpenedFile", func(t *testing.T) {
		// Create a test workspace
		workspace := &models.Workspace{
			UserID: user.ID,
			Name:   "Last File Workspace",
		}
		workspace.SetDefaultSettings()
		if err := database.CreateWorkspace(workspace); err != nil {
			t.Fatalf("failed to create test workspace: %v", err)
		}

		testCases := []struct {
			name     string
			filePath string
			wantErr  bool
		}{
			{
				name:     "valid file path",
				filePath: "docs/test.md",
				wantErr:  false,
			},
			{
				name:     "empty file path",
				filePath: "",
				wantErr:  false,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				err := database.UpdateLastOpenedFile(workspace.ID, tc.filePath)
				if tc.wantErr {
					if err == nil {
						t.Error("expected error, got nil")
					}
					return
				}

				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}

				// Verify update
				path, err := database.GetLastOpenedFile(workspace.ID)
				if err != nil {
					t.Fatalf("failed to get last opened file: %v", err)
				}

				if path != tc.filePath {
					t.Errorf("LastOpenedFile = %v, want %v", path, tc.filePath)
				}
			})
		}
	})

	t.Run("DeleteWorkspace", func(t *testing.T) {
		// Create a test workspace
		workspace := &models.Workspace{
			UserID: user.ID,
			Name:   "Delete Workspace",
		}
		workspace.SetDefaultSettings()
		if err := database.CreateWorkspace(workspace); err != nil {
			t.Fatalf("failed to create test workspace: %v", err)
		}

		// Delete the workspace
		if err := database.DeleteWorkspace(workspace.ID); err != nil {
			t.Fatalf("failed to delete workspace: %v", err)
		}

		// Verify workspace is gone
		_, err = database.GetWorkspaceByID(workspace.ID)
		if !strings.Contains(err.Error(), "workspace not found") {
			t.Errorf("expected workspace not found, got %v", err)
		}
	})
}

// Helper function to verify workspace fields
func verifyWorkspace(t *testing.T, actual, expected *models.Workspace) {
	t.Helper()

	if actual.Name != expected.Name {
		t.Errorf("Name = %v, want %v", actual.Name, expected.Name)
	}
	if actual.UserID != expected.UserID {
		t.Errorf("UserID = %v, want %v", actual.UserID, expected.UserID)
	}
	if actual.Theme != expected.Theme {
		t.Errorf("Theme = %v, want %v", actual.Theme, expected.Theme)
	}
	if actual.AutoSave != expected.AutoSave {
		t.Errorf("AutoSave = %v, want %v", actual.AutoSave, expected.AutoSave)
	}
	if actual.ShowHiddenFiles != expected.ShowHiddenFiles {
		t.Errorf("ShowHiddenFiles = %v, want %v", actual.ShowHiddenFiles, expected.ShowHiddenFiles)
	}
	if actual.GitEnabled != expected.GitEnabled {
		t.Errorf("GitEnabled = %v, want %v", actual.GitEnabled, expected.GitEnabled)
	}
	if actual.GitURL != expected.GitURL {
		t.Errorf("GitURL = %v, want %v", actual.GitURL, expected.GitURL)
	}
	if actual.GitUser != expected.GitUser {
		t.Errorf("GitUser = %v, want %v", actual.GitUser, expected.GitUser)
	}
	if actual.GitToken != expected.GitToken {
		t.Errorf("GitToken = %v, want %v", actual.GitToken, expected.GitToken)
	}
	if actual.GitAutoCommit != expected.GitAutoCommit {
		t.Errorf("GitAutoCommit = %v, want %v", actual.GitAutoCommit, expected.GitAutoCommit)
	}
	if actual.GitCommitMsgTemplate != expected.GitCommitMsgTemplate {
		t.Errorf("GitCommitMsgTemplate = %v, want %v", actual.GitCommitMsgTemplate, expected.GitCommitMsgTemplate)
	}
	if actual.GitCommitName != expected.GitCommitName {
		t.Errorf("GitCommitName = %v, want %v", actual.GitCommitName, expected.GitCommitName)
	}
	if actual.GitCommitEmail != expected.GitCommitEmail {
		t.Errorf("GitCommitEmail = %v, want %v", actual.GitCommitEmail, expected.GitCommitEmail)
	}
	if actual.CreatedAt.IsZero() {
		t.Error("CreatedAt should not be zero")
	}
}
