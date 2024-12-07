//go:build integration

package handlers_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"novamd/internal/handlers"
	"novamd/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Helper function to check if a user exists in a slice of users
func containsUser(users []*models.User, searchUser *models.User) bool {
	for _, u := range users {
		if u.ID == searchUser.ID &&
			u.Email == searchUser.Email &&
			u.DisplayName == searchUser.DisplayName &&
			u.Role == searchUser.Role {
			return true
		}
	}
	return false
}

func TestAdminHandlers_Integration(t *testing.T) {
	h := setupTestHarness(t)
	defer h.teardown(t)

	t.Run("user management", func(t *testing.T) {
		t.Run("list users", func(t *testing.T) {
			// Test with admin session
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/admin/users", nil, h.AdminSession, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var users []*models.User
			err := json.NewDecoder(rr.Body).Decode(&users)
			require.NoError(t, err)

			// Should have at least our admin and regular test users
			assert.GreaterOrEqual(t, len(users), 2)
			assert.True(t, containsUser(users, h.AdminUser), "Admin user not found in users list")
			assert.True(t, containsUser(users, h.RegularUser), "Regular user not found in users list")

			// Test with non-admin session
			rr = h.makeRequest(t, http.MethodGet, "/api/v1/admin/users", nil, h.RegularSession, nil)
			assert.Equal(t, http.StatusForbidden, rr.Code)

			// Test without session
			rr = h.makeRequest(t, http.MethodGet, "/api/v1/admin/users", nil, nil, nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("create user", func(t *testing.T) {
			createReq := handlers.CreateUserRequest{
				Email:       "newuser@test.com",
				DisplayName: "New User",
				Password:    "password123",
				Role:        models.RoleEditor,
			}

			// Test with admin session
			rr := h.makeRequest(t, http.MethodPost, "/api/v1/admin/users", createReq, h.AdminSession, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var createdUser models.User
			err := json.NewDecoder(rr.Body).Decode(&createdUser)
			require.NoError(t, err)
			assert.Equal(t, createReq.Email, createdUser.Email)
			assert.Equal(t, createReq.DisplayName, createdUser.DisplayName)
			assert.Equal(t, createReq.Role, createdUser.Role)
			assert.NotZero(t, createdUser.LastWorkspaceID)

			// Test duplicate email
			rr = h.makeRequest(t, http.MethodPost, "/api/v1/admin/users", createReq, h.AdminSession, nil)
			assert.Equal(t, http.StatusConflict, rr.Code)

			// Test invalid request (missing required fields)
			invalidReq := handlers.CreateUserRequest{
				Email: "invalid@test.com",
				// Missing password and role
			}
			rr = h.makeRequest(t, http.MethodPost, "/api/v1/admin/users", invalidReq, h.AdminSession, nil)
			assert.Equal(t, http.StatusBadRequest, rr.Code)

			// Test with non-admin session
			rr = h.makeRequest(t, http.MethodPost, "/api/v1/admin/users", createReq, h.RegularSession, nil)
			assert.Equal(t, http.StatusForbidden, rr.Code)
		})

		t.Run("get user", func(t *testing.T) {
			path := fmt.Sprintf("/api/v1/admin/users/%d", h.RegularUser.ID)

			// Test with admin session
			rr := h.makeRequest(t, http.MethodGet, path, nil, h.AdminSession, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var user models.User
			err := json.NewDecoder(rr.Body).Decode(&user)
			require.NoError(t, err)
			assert.Equal(t, h.RegularUser.ID, user.ID)

			// Test non-existent user
			rr = h.makeRequest(t, http.MethodGet, "/api/v1/admin/users/999999", nil, h.AdminSession, nil)
			assert.Equal(t, http.StatusNotFound, rr.Code)

			// Test with non-admin session
			rr = h.makeRequest(t, http.MethodGet, path, nil, h.RegularSession, nil)
			assert.Equal(t, http.StatusForbidden, rr.Code)
		})

		t.Run("update user", func(t *testing.T) {
			path := fmt.Sprintf("/api/v1/admin/users/%d", h.RegularUser.ID)
			updateReq := handlers.UpdateUserRequest{
				DisplayName: "Updated Name",
				Role:        models.RoleViewer,
			}

			// Test with admin session
			rr := h.makeRequest(t, http.MethodPut, path, updateReq, h.AdminSession, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var updatedUser models.User
			err := json.NewDecoder(rr.Body).Decode(&updatedUser)
			require.NoError(t, err)
			assert.Equal(t, updateReq.DisplayName, updatedUser.DisplayName)
			assert.Equal(t, updateReq.Role, updatedUser.Role)

			// Test with non-admin session
			rr = h.makeRequest(t, http.MethodPut, path, updateReq, h.RegularSession, nil)
			assert.Equal(t, http.StatusForbidden, rr.Code)
		})

		t.Run("delete user", func(t *testing.T) {
			// Create a user to delete
			createReq := handlers.CreateUserRequest{
				Email:       "todelete@test.com",
				DisplayName: "To Delete",
				Password:    "password123",
				Role:        models.RoleEditor,
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/admin/users", createReq, h.AdminSession, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var createdUser models.User
			err := json.NewDecoder(rr.Body).Decode(&createdUser)
			require.NoError(t, err)

			path := fmt.Sprintf("/api/v1/admin/users/%d", createdUser.ID)

			// Test deleting own account (should fail)
			adminPath := fmt.Sprintf("/api/v1/admin/users/%d", h.AdminUser.ID)
			rr = h.makeRequest(t, http.MethodDelete, adminPath, nil, h.AdminSession, nil)
			assert.Equal(t, http.StatusBadRequest, rr.Code)

			// Test with admin session
			rr = h.makeRequest(t, http.MethodDelete, path, nil, h.AdminSession, nil)
			assert.Equal(t, http.StatusNoContent, rr.Code)

			// Verify user is deleted
			rr = h.makeRequest(t, http.MethodGet, path, nil, h.AdminSession, nil)
			assert.Equal(t, http.StatusNotFound, rr.Code)

			// Test with non-admin session
			rr = h.makeRequest(t, http.MethodDelete, path, nil, h.RegularSession, nil)
			assert.Equal(t, http.StatusForbidden, rr.Code)
		})
	})

	t.Run("workspace management", func(t *testing.T) {
		t.Run("list workspaces", func(t *testing.T) {
			// Create a test workspace first
			workspace := &models.Workspace{
				UserID: h.RegularUser.ID,
				Name:   "Test Workspace",
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", workspace, h.RegularSession, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			// Test with admin session
			rr = h.makeRequest(t, http.MethodGet, "/api/v1/admin/workspaces", nil, h.AdminSession, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var workspaces []*handlers.WorkspaceStats
			err := json.NewDecoder(rr.Body).Decode(&workspaces)
			require.NoError(t, err)

			// Should have at least the default workspaces for admin and regular users
			assert.NotEmpty(t, workspaces)

			// Verify workspace stats fields
			for _, ws := range workspaces {
				assert.NotZero(t, ws.UserID)
				assert.NotEmpty(t, ws.UserEmail)
				assert.NotZero(t, ws.WorkspaceID)
				assert.NotEmpty(t, ws.WorkspaceName)
				assert.NotZero(t, ws.WorkspaceCreatedAt)
				assert.GreaterOrEqual(t, ws.TotalFiles, 0)
				assert.GreaterOrEqual(t, ws.TotalSize, int64(0))
			}

			// Test with non-admin session
			rr = h.makeRequest(t, http.MethodGet, "/api/v1/admin/workspaces", nil, h.RegularSession, nil)
			assert.Equal(t, http.StatusForbidden, rr.Code)
		})
	})

	t.Run("system stats", func(t *testing.T) {
		// Create some test data
		workspace := &models.Workspace{
			UserID: h.RegularUser.ID,
			Name:   "Stats Test Workspace",
		}
		rr := h.makeRequest(t, http.MethodPost, "/api/v1/workspaces", workspace, h.RegularSession, nil)
		require.Equal(t, http.StatusOK, rr.Code)

		// Test with admin session
		rr = h.makeRequest(t, http.MethodGet, "/api/v1/admin/stats", nil, h.AdminSession, nil)
		require.Equal(t, http.StatusOK, rr.Code)

		var stats handlers.SystemStats
		err := json.NewDecoder(rr.Body).Decode(&stats)
		require.NoError(t, err)

		// Verify stats fields
		assert.GreaterOrEqual(t, stats.TotalUsers, 2)      // At least admin and regular user
		assert.GreaterOrEqual(t, stats.TotalWorkspaces, 2) // At least default workspaces
		assert.GreaterOrEqual(t, stats.ActiveUsers, 2)     // Our test users should be active
		assert.GreaterOrEqual(t, stats.TotalFiles, 0)
		assert.GreaterOrEqual(t, stats.TotalSize, int64(0))

		// Test with non-admin session
		rr = h.makeRequest(t, http.MethodGet, "/api/v1/admin/stats", nil, h.RegularSession, nil)
		assert.Equal(t, http.StatusForbidden, rr.Code)
	})
}
