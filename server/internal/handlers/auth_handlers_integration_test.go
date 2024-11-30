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

func TestAuthHandlers_Integration(t *testing.T) {
	h := setupTestHarness(t)
	defer h.teardown(t)

	t.Run("login", func(t *testing.T) {
		t.Run("successful login - admin user", func(t *testing.T) {
			loginReq := handlers.LoginRequest{
				Email:    "admin@test.com",
				Password: "admin123",
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", loginReq, "", nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var resp handlers.LoginResponse
			err := json.NewDecoder(rr.Body).Decode(&resp)
			require.NoError(t, err)

			assert.NotEmpty(t, resp.AccessToken)
			assert.NotEmpty(t, resp.RefreshToken)
			assert.NotNil(t, resp.User)
			assert.Equal(t, loginReq.Email, resp.User.Email)
			assert.Equal(t, models.RoleAdmin, resp.User.Role)
		})

		t.Run("successful login - regular user", func(t *testing.T) {
			loginReq := handlers.LoginRequest{
				Email:    "user@test.com",
				Password: "user123",
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", loginReq, "", nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var resp handlers.LoginResponse
			err := json.NewDecoder(rr.Body).Decode(&resp)
			require.NoError(t, err)

			assert.NotEmpty(t, resp.AccessToken)
			assert.NotEmpty(t, resp.RefreshToken)
			assert.NotNil(t, resp.User)
			assert.Equal(t, loginReq.Email, resp.User.Email)
			assert.Equal(t, models.RoleEditor, resp.User.Role)
		})

		t.Run("login failures", func(t *testing.T) {
			tests := []struct {
				name     string
				request  handlers.LoginRequest
				wantCode int
			}{
				{
					name: "wrong password",
					request: handlers.LoginRequest{
						Email:    "user@test.com",
						Password: "wrongpassword",
					},
					wantCode: http.StatusUnauthorized,
				},
				{
					name: "non-existent user",
					request: handlers.LoginRequest{
						Email:    "nonexistent@test.com",
						Password: "password123",
					},
					wantCode: http.StatusUnauthorized,
				},
				{
					name: "empty email",
					request: handlers.LoginRequest{
						Email:    "",
						Password: "password123",
					},
					wantCode: http.StatusBadRequest,
				},
				{
					name: "empty password",
					request: handlers.LoginRequest{
						Email:    "user@test.com",
						Password: "",
					},
					wantCode: http.StatusBadRequest,
				},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					rr := h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", tt.request, "", nil)
					assert.Equal(t, tt.wantCode, rr.Code)
				})
			}
		})
	})

	t.Run("refresh token", func(t *testing.T) {
		t.Run("successful token refresh", func(t *testing.T) {
			// First login to get refresh token
			loginReq := handlers.LoginRequest{
				Email:    "user@test.com",
				Password: "user123",
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", loginReq, "", nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var loginResp handlers.LoginResponse
			err := json.NewDecoder(rr.Body).Decode(&loginResp)
			require.NoError(t, err)

			// Now try to refresh the token
			refreshReq := handlers.RefreshRequest{
				RefreshToken: loginResp.RefreshToken,
			}

			rr = h.makeRequest(t, http.MethodPost, "/api/v1/auth/refresh", refreshReq, "", nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var refreshResp handlers.RefreshResponse
			err = json.NewDecoder(rr.Body).Decode(&refreshResp)
			require.NoError(t, err)
			assert.NotEmpty(t, refreshResp.AccessToken)
		})

		t.Run("refresh failures", func(t *testing.T) {
			tests := []struct {
				name     string
				request  handlers.RefreshRequest
				wantCode int
			}{
				{
					name: "invalid refresh token",
					request: handlers.RefreshRequest{
						RefreshToken: "invalid-token",
					},
					wantCode: http.StatusUnauthorized,
				},
				{
					name: "empty refresh token",
					request: handlers.RefreshRequest{
						RefreshToken: "",
					},
					wantCode: http.StatusBadRequest,
				},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					rr := h.makeRequest(t, http.MethodPost, "/api/v1/auth/refresh", tt.request, "", nil)
					assert.Equal(t, tt.wantCode, rr.Code)
				})
			}
		})
	})

	t.Run("logout", func(t *testing.T) {
		t.Run("successful logout", func(t *testing.T) {
			// First login to get session
			loginReq := handlers.LoginRequest{
				Email:    "user@test.com",
				Password: "user123",
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", loginReq, "", nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var loginResp handlers.LoginResponse
			err := json.NewDecoder(rr.Body).Decode(&loginResp)
			require.NoError(t, err)

			// Now logout using session ID from login response
			headers := map[string]string{
				"X-Session-ID": loginResp.Session.ID,
			}
			rr = h.makeRequest(t, http.MethodPost, "/api/v1/auth/logout", nil, loginResp.AccessToken, headers)
			require.Equal(t, http.StatusOK, rr.Code)

			// Try to use the refresh token - should fail
			refreshReq := handlers.RefreshRequest{
				RefreshToken: loginResp.RefreshToken,
			}

			rr = h.makeRequest(t, http.MethodPost, "/api/v1/auth/refresh", refreshReq, "", nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("logout without session ID", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodPost, "/api/v1/auth/logout", nil, h.RegularToken, nil)
			assert.Equal(t, http.StatusBadRequest, rr.Code)
		})
	})

	t.Run("get current user", func(t *testing.T) {
		t.Run("successful get current user", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/auth/me", nil, h.RegularToken, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			var user models.User
			err := json.NewDecoder(rr.Body).Decode(&user)
			require.NoError(t, err)

			assert.Equal(t, h.RegularUser.ID, user.ID)
			assert.Equal(t, h.RegularUser.Email, user.Email)
			assert.Equal(t, h.RegularUser.Role, user.Role)
		})

		t.Run("get current user without token", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/auth/me", nil, "", nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("get current user with invalid token", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/auth/me", nil, "invalid-token", nil)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})
	})
}
