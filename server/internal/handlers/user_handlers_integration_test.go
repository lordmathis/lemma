//go:build integration

package handlers_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"lemma/internal/handlers"
	"lemma/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserHandlers_Integration(t *testing.T) {
	runWithDatabases(t, testUserHandlers)
}

func testUserHandlers(t *testing.T, dbConfig DatabaseConfig) {
	h := setupTestHarness(t, dbConfig)
	defer h.teardown(t)

	currentEmail := h.RegularTestUser.userModel.Email
	currentPassword := "user123"

	t.Run("get current user", func(t *testing.T) {
		t.Run("successful get", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/auth/me", nil, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var user models.User
			err := json.NewDecoder(rr.Body).Decode(&user)
			require.NoError(t, err)

			assert.Equal(t, h.RegularTestUser.userModel.ID, user.ID)
			assert.Equal(t, h.RegularTestUser.userModel.Email, user.Email)
			assert.Equal(t, h.RegularTestUser.userModel.DisplayName, user.DisplayName)
			assert.Equal(t, h.RegularTestUser.userModel.Role, user.Role)
			assert.Empty(t, user.PasswordHash, "Password hash should not be included in response")
		})

		t.Run("unauthorized", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/auth/me", nil, nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})
	})

	t.Run("update profile", func(t *testing.T) {
		t.Run("update display name only", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				DisplayName: "Updated Name",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var user models.User
			err := json.NewDecoder(rr.Body).Decode(&user)
			require.NoError(t, err)
			assert.Equal(t, updateReq.DisplayName, user.DisplayName)
		})

		t.Run("update email", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				Email:           "newemail@test.com",
				CurrentPassword: currentPassword,
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var user models.User
			err := json.NewDecoder(rr.Body).Decode(&user)
			require.NoError(t, err)
			assert.Equal(t, updateReq.Email, user.Email)

			currentEmail = updateReq.Email
		})

		t.Run("update email without password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				Email: "anotheremail@test.com",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularTestUser)
			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})

		t.Run("update email with wrong password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				Email:           "wrongpass@test.com",
				CurrentPassword: "wrongpassword",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularTestUser)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("update password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				CurrentPassword: currentPassword,
				NewPassword:     "newpassword123",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			// Verify can login with new password
			loginReq := handlers.LoginRequest{
				Email:    currentEmail,
				Password: "newpassword123",
			}

			rr = h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", loginReq, nil)
			assert.Equal(t, http.StatusOK, rr.Code)

			currentPassword = updateReq.NewPassword
		})

		t.Run("update password without current password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				NewPassword: "newpass123",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularTestUser)
			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})

		t.Run("update password with wrong current password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				CurrentPassword: "wrongpassword",
				NewPassword:     "newpass123",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularTestUser)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("update with short password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				CurrentPassword: currentPassword,
				NewPassword:     "short",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularTestUser)
			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})

		t.Run("duplicate email", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				Email:           h.AdminTestUser.userModel.Email,
				CurrentPassword: currentPassword,
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularTestUser)
			assert.Equal(t, http.StatusConflict, rr.Code)
		})
	})

	t.Run("delete account", func(t *testing.T) {

		deleteUserPassword := "password123"
		testDeleteUser := h.createTestUser(t, "todelete@test.com", deleteUserPassword, models.RoleEditor)

		t.Run("successful delete", func(t *testing.T) {
			deleteReq := handlers.DeleteAccountRequest{
				Password: deleteUserPassword,
			}

			rr := h.makeRequest(t, http.MethodDelete, "/api/v1/profile", deleteReq, testDeleteUser)
			require.Equal(t, http.StatusNoContent, rr.Code)

			// Verify user is deleted
			loginReq := handlers.LoginRequest{
				Email:    testDeleteUser.userModel.Email,
				Password: deleteUserPassword,
			}
			rr = h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", loginReq, testDeleteUser)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("delete with wrong password", func(t *testing.T) {
			deleteReq := handlers.DeleteAccountRequest{
				Password: "wrongpassword",
			}

			rr := h.makeRequest(t, http.MethodDelete, "/api/v1/profile", deleteReq, h.RegularTestUser)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("prevent last admin deletion", func(t *testing.T) {
			deleteReq := handlers.DeleteAccountRequest{
				Password: "admin123", // Admin password from test harness
			}

			rr := h.makeRequest(t, http.MethodDelete, "/api/v1/profile", deleteReq, h.AdminTestUser)
			assert.Equal(t, http.StatusForbidden, rr.Code)
		})
	})
}
