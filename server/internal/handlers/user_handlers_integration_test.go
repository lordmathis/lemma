//go:build integration

package handlers_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"novamd/internal/handlers"
	"novamd/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserHandlers_Integration(t *testing.T) {
	h := setupTestHarness(t)
	defer h.teardown(t)

	currentEmail := h.RegularUser.Email
	currentPassword := "user123"

	t.Run("get current user", func(t *testing.T) {
		t.Run("successful get", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/auth/me", nil, h.RegularSession, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var user models.User
			err := json.NewDecoder(rr.Body).Decode(&user)
			require.NoError(t, err)

			assert.Equal(t, h.RegularUser.ID, user.ID)
			assert.Equal(t, h.RegularUser.Email, user.Email)
			assert.Equal(t, h.RegularUser.DisplayName, user.DisplayName)
			assert.Equal(t, h.RegularUser.Role, user.Role)
			assert.Empty(t, user.PasswordHash, "Password hash should not be included in response")
		})

		t.Run("unauthorized", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/auth/me", nil, nil, nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})
	})

	t.Run("update profile", func(t *testing.T) {
		t.Run("update display name only", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				DisplayName: "Updated Name",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularSession, nil)
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

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularSession, nil)
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

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularSession, nil)
			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})

		t.Run("update email with wrong password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				Email:           "wrongpass@test.com",
				CurrentPassword: "wrongpassword",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularSession, nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("update password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				CurrentPassword: currentPassword,
				NewPassword:     "newpassword123",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularSession, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			// Verify can login with new password
			loginReq := handlers.LoginRequest{
				Email:    currentEmail,
				Password: "newpassword123",
			}

			rr = h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", loginReq, nil, nil)
			assert.Equal(t, http.StatusOK, rr.Code)

			currentPassword = updateReq.NewPassword
		})

		t.Run("update password without current password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				NewPassword: "newpass123",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularSession, nil)
			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})

		t.Run("update password with wrong current password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				CurrentPassword: "wrongpassword",
				NewPassword:     "newpass123",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularSession, nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("update with short password", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				CurrentPassword: currentPassword,
				NewPassword:     "short",
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularSession, nil)
			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})

		t.Run("duplicate email", func(t *testing.T) {
			updateReq := handlers.UpdateProfileRequest{
				Email:           h.AdminUser.Email,
				CurrentPassword: currentPassword,
			}

			rr := h.makeRequest(t, http.MethodPut, "/api/v1/profile", updateReq, h.RegularSession, nil)
			assert.Equal(t, http.StatusConflict, rr.Code)
		})
	})

	t.Run("delete account", func(t *testing.T) {
		// Create a new user that we can delete
		createReq := handlers.CreateUserRequest{
			Email:       "todelete@test.com",
			DisplayName: "To Delete",
			Password:    "password123",
			Role:        models.RoleEditor,
		}

		rr := h.makeRequest(t, http.MethodPost, "/api/v1/admin/users", createReq, h.AdminSession, nil)
		require.Equal(t, http.StatusOK, rr.Code)

		var newUser models.User
		err := json.NewDecoder(rr.Body).Decode(&newUser)
		require.NoError(t, err)

		// Get session for new user
		loginReq := handlers.LoginRequest{
			Email:    createReq.Email,
			Password: createReq.Password,
		}

		rr = h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", loginReq, nil, nil)
		require.Equal(t, http.StatusOK, rr.Code)

		var loginResp handlers.LoginResponse
		err = json.NewDecoder(rr.Body).Decode(&loginResp)
		require.NoError(t, err)

		// Create a session struct for the new user
		userSession := &models.Session{
			ID:           loginResp.SessionID,
			UserID:       newUser.ID,
			RefreshToken: "",
			ExpiresAt:    loginResp.ExpiresAt,
		}

		t.Run("successful delete", func(t *testing.T) {
			deleteReq := handlers.DeleteAccountRequest{
				Password: createReq.Password,
			}

			rr := h.makeRequest(t, http.MethodDelete, "/api/v1/profile", deleteReq, userSession, nil)
			require.Equal(t, http.StatusNoContent, rr.Code)

			// Verify user is deleted
			rr = h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", loginReq, nil, nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("delete with wrong password", func(t *testing.T) {
			deleteReq := handlers.DeleteAccountRequest{
				Password: "wrongpassword",
			}

			rr := h.makeRequest(t, http.MethodDelete, "/api/v1/profile", deleteReq, h.RegularSession, nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("prevent last admin deletion", func(t *testing.T) {
			deleteReq := handlers.DeleteAccountRequest{
				Password: "admin123", // Admin password from test harness
			}

			rr := h.makeRequest(t, http.MethodDelete, "/api/v1/profile", deleteReq, h.AdminSession, nil)
			assert.Equal(t, http.StatusForbidden, rr.Code)
		})
	})
}
