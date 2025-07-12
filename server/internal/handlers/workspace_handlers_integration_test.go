//go:build integration

package handlers_test

import (
	"encoding/json"
	"net/http"
	"net/url"
	"testing"

	"lemma/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWorkspaceHandlers_Integration(t *testing.T) {
	runWithDatabases(t, testWorkspaceHandlers)
}

func testWorkspaceHandlers(t *testing.T, dbConfig DatabaseConfig) {
	h := setupTestHarness(t, dbConfig)
	defer h.teardown(t)

	t.Run("list workspaces", func(t *testing.T) {
		t.Run("successful list", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/workspaces", nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var workspaces []*models.Workspace
			err := json.NewDecoder(rr.Body).Decode(&workspaces)
			require.NoError(t, err)
			assert.NotEmpty(t, workspaces, "User should have at least one default workspace")
		})

		t.Run("unauthorized", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/workspaces", nil, nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})
	})

	t.Run("create workspace", func(t *testing.T) {
		t.Run("successful create", func(t *testing.T) {
			workspace := &models.Workspace{
				Name: "Test Workspace",
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", workspace, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var created models.Workspace
			err := json.NewDecoder(rr.Body).Decode(&created)
			require.NoError(t, err)
			assert.Equal(t, workspace.Name, created.Name)
			assert.Equal(t, h.RegularTestUser.session.UserID, created.UserID)
			assert.NotZero(t, created.ID)
		})

		t.Run("create with git settings", func(t *testing.T) {
			workspace := &models.Workspace{
				Name:           "Git Workspace",
				GitEnabled:     true,
				GitURL:         "https://github.com/test/repo.git",
				GitUser:        "testuser",
				GitToken:       "testtoken",
				GitAutoCommit:  true,
				GitCommitName:  "Test User",
				GitCommitEmail: "test@example.com",
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", workspace, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var created models.Workspace
			err := json.NewDecoder(rr.Body).Decode(&created)
			require.NoError(t, err)
			assert.Equal(t, workspace.GitEnabled, created.GitEnabled)
			assert.Equal(t, workspace.GitURL, created.GitURL)
			assert.Equal(t, workspace.GitUser, created.GitUser)
			assert.Equal(t, workspace.GitToken, created.GitToken)
			assert.Equal(t, workspace.GitAutoCommit, created.GitAutoCommit)
			assert.Equal(t, workspace.GitCommitName, created.GitCommitName)
			assert.Equal(t, workspace.GitCommitEmail, created.GitCommitEmail)
		})

		t.Run("invalid workspace", func(t *testing.T) {
			workspace := &models.Workspace{
				Name:       "", // Empty name
				GitEnabled: true,
				// Missing required Git settings
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", workspace, h.RegularTestUser)
			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})
	})

	// Create a workspace for the remaining tests
	workspace := &models.Workspace{
		Name: "Test Workspace Operations",
	}
	rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", workspace, h.RegularTestUser)
	require.Equal(t, http.StatusOK, rr.Code)
	err := json.NewDecoder(rr.Body).Decode(workspace)
	require.NoError(t, err)

	escapedName := url.PathEscape(workspace.Name)
	baseURL := "/api/v1/workspaces/" + escapedName

	t.Run("get workspace", func(t *testing.T) {
		t.Run("successful get", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, baseURL, nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var got models.Workspace
			err := json.NewDecoder(rr.Body).Decode(&got)
			require.NoError(t, err)
			assert.Equal(t, workspace.ID, got.ID)
			assert.Equal(t, workspace.Name, got.Name)
		})

		t.Run("nonexistent workspace", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/workspaces/nonexistent", nil, h.RegularTestUser)
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})

		t.Run("unauthorized access", func(t *testing.T) {
			// Try accessing with another user's token
			rr := h.makeRequest(t, http.MethodGet, baseURL, nil, h.AdminTestUser)
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})
	})

	t.Run("update workspace", func(t *testing.T) {
		t.Run("update name", func(t *testing.T) {
			workspace.Name = "Updated Workspace"

			rr := h.makeRequest(t, http.MethodPut, baseURL, workspace, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var updated models.Workspace
			err := json.NewDecoder(rr.Body).Decode(&updated)
			require.NoError(t, err)
			assert.Equal(t, workspace.Name, updated.Name)

			// Update baseURL for remaining tests
			escapedName = url.PathEscape(workspace.Name)
			baseURL = "/api/v1/workspaces/" + escapedName
		})

		t.Run("update settings", func(t *testing.T) {
			update := &models.Workspace{
				Name:            workspace.Name,
				Theme:           "dark",
				AutoSave:        true,
				ShowHiddenFiles: true,
			}

			rr := h.makeRequest(t, http.MethodPut, baseURL, update, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var updated models.Workspace
			err := json.NewDecoder(rr.Body).Decode(&updated)
			require.NoError(t, err)
			assert.Equal(t, update.Theme, updated.Theme)
			assert.Equal(t, update.AutoSave, updated.AutoSave)
			assert.Equal(t, update.ShowHiddenFiles, updated.ShowHiddenFiles)
		})

		t.Run("enable git", func(t *testing.T) {
			update := &models.Workspace{
				Name:           workspace.Name,
				Theme:          "dark",
				GitEnabled:     true,
				GitURL:         "https://github.com/test/repo.git",
				GitUser:        "testuser",
				GitToken:       "testtoken",
				GitAutoCommit:  true,
				GitCommitName:  "Test User",
				GitCommitEmail: "test@example.com",
			}

			rr := h.makeRequest(t, http.MethodPut, baseURL, update, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var updated models.Workspace
			err := json.NewDecoder(rr.Body).Decode(&updated)
			require.NoError(t, err)
			assert.Equal(t, update.GitEnabled, updated.GitEnabled)
			assert.Equal(t, update.GitURL, updated.GitURL)
			assert.Equal(t, update.GitUser, updated.GitUser)
			assert.Equal(t, update.GitToken, updated.GitToken)
			assert.Equal(t, update.GitAutoCommit, updated.GitAutoCommit)
			assert.Equal(t, update.GitCommitName, updated.GitCommitName)

			// Mock should have been called to setup git
			assert.True(t, h.MockGit.IsInitialized())
		})

		t.Run("invalid git settings", func(t *testing.T) {
			update := &models.Workspace{
				Name:       workspace.Name,
				GitEnabled: true,
				// Missing required Git settings
			}

			rr := h.makeRequest(t, http.MethodPut, baseURL, update, h.RegularTestUser)
			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})
	})

	t.Run("last workspace", func(t *testing.T) {
		t.Run("get last workspace", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/workspaces/_op/last", nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var response struct {
				LastWorkspaceName string `json:"lastWorkspaceName"`
			}
			err := json.NewDecoder(rr.Body).Decode(&response)
			require.NoError(t, err)
			assert.NotEmpty(t, response.LastWorkspaceName)
		})

		t.Run("update last workspace", func(t *testing.T) {
			req := struct {
				WorkspaceName string `json:"workspaceName"`
			}{
				WorkspaceName: workspace.Name,
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/workspaces/_op/last", req, h.RegularTestUser)
			require.Equal(t, http.StatusNoContent, rr.Code)

			// Verify the update
			rr = h.makeRequest(t, http.MethodGet, "/api/v1/workspaces/_op/last", nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var response struct {
				LastWorkspaceName string `json:"lastWorkspaceName"`
			}
			err := json.NewDecoder(rr.Body).Decode(&response)
			require.NoError(t, err)
			assert.Equal(t, workspace.Name, response.LastWorkspaceName)
		})
	})

	t.Run("delete workspace", func(t *testing.T) {
		// Get current workspaces to know how many we have
		rr := h.makeRequest(t, http.MethodGet, "/api/v1/workspaces", nil, h.RegularTestUser)
		require.Equal(t, http.StatusOK, rr.Code)

		var existingWorkspaces []*models.Workspace
		err := json.NewDecoder(rr.Body).Decode(&existingWorkspaces)
		require.NoError(t, err)

		// Create a new workspace we can safely delete
		newWorkspace := &models.Workspace{
			Name: "Workspace To Delete",
		}
		rr = h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", newWorkspace, h.RegularTestUser)
		require.Equal(t, http.StatusOK, rr.Code)
		err = json.NewDecoder(rr.Body).Decode(newWorkspace)
		require.NoError(t, err)

		t.Run("successful delete", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodDelete, "/api/v1/workspaces/"+url.PathEscape(newWorkspace.Name), nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var response struct {
				NextWorkspaceName string `json:"nextWorkspaceName"`
			}
			err := json.NewDecoder(rr.Body).Decode(&response)
			require.NoError(t, err)
			assert.NotEmpty(t, response.NextWorkspaceName)

			// Verify workspace is deleted
			rr = h.makeRequest(t, http.MethodGet, "/api/v1/workspaces/"+url.PathEscape(newWorkspace.Name), nil, h.RegularTestUser)
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})

		t.Run("prevent deleting last workspace", func(t *testing.T) {
			// Delete all but one workspace
			for i := 0; i < len(existingWorkspaces)-1; i++ {
				ws := existingWorkspaces[i]
				rr := h.makeRequest(t, http.MethodDelete, "/api/v1/workspaces/"+url.PathEscape(ws.Name), nil, h.RegularTestUser)
				require.Equal(t, http.StatusOK, rr.Code)
			}

			// Try to delete the last remaining workspace
			lastWs := existingWorkspaces[len(existingWorkspaces)-1]
			rr := h.makeRequest(t, http.MethodDelete, "/api/v1/workspaces/"+url.PathEscape(lastWs.Name), nil, h.RegularTestUser)
			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})

		t.Run("unauthorized deletion", func(t *testing.T) {
			// Create a workspace to attempt unauthorized deletion
			workspace := &models.Workspace{
				Name: "Unauthorized Delete Test",
			}
			rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", workspace, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			// Try to delete with wrong user's token
			rr = h.makeRequest(t, http.MethodDelete, "/api/v1/workspaces/"+url.PathEscape(workspace.Name), nil, h.AdminTestUser)
			assert.Equal(t, http.StatusNotFound, rr.Code)
		})
	})
}
