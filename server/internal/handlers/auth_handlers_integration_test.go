//go:build integration

package handlers_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"lemma/internal/handlers"
	"lemma/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuthHandlers_Integration(t *testing.T) {
	runWithDatabases(t, testAuthHandlers)
}

func testAuthHandlers(t *testing.T, dbConfig DatabaseConfig) {
	h := setupTestHarness(t, dbConfig)
	defer h.teardown(t)

	t.Run("login", func(t *testing.T) {
		t.Run("successful login - admin user", func(t *testing.T) {
			loginReq := handlers.LoginRequest{
				Email:    "admin@test.com",
				Password: "admin123",
			}

			rr := h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", loginReq, nil)
			require.Equal(t, http.StatusOK, rr.Code)

			// Verify all required cookies are present with correct attributes
			cookies := rr.Result().Cookies()
			var foundAccessToken, foundRefreshToken, foundCSRF bool
			for _, cookie := range cookies {
				switch cookie.Name {
				case "access_token":
					foundAccessToken = true
					assert.True(t, cookie.HttpOnly, "access_token cookie must be HttpOnly")
					assert.Equal(t, http.SameSiteLaxMode, cookie.SameSite)
					assert.Equal(t, 900, cookie.MaxAge) // 15 minutes
				case "refresh_token":
					foundRefreshToken = true
					assert.True(t, cookie.HttpOnly, "refresh_token cookie must be HttpOnly")
					assert.Equal(t, http.SameSiteLaxMode, cookie.SameSite)
					assert.Equal(t, 604800, cookie.MaxAge) // 7 days
				case "csrf_token":
					foundCSRF = true
					assert.False(t, cookie.HttpOnly, "csrf_token cookie must not be HttpOnly")
					assert.Equal(t, http.SameSiteLaxMode, cookie.SameSite)
					assert.Equal(t, 900, cookie.MaxAge) // 15 minutes
				}
			}
			assert.True(t, foundAccessToken, "access_token cookie not found")
			assert.True(t, foundRefreshToken, "refresh_token cookie not found")
			assert.True(t, foundCSRF, "csrf_token cookie not found")

			// Verify CSRF token is in both cookie and header, and they match
			var csrfCookie *http.Cookie
			for _, cookie := range rr.Result().Cookies() {
				if cookie.Name == "csrf_token" {
					csrfCookie = cookie
					break
				}
			}
			require.NotNil(t, csrfCookie, "csrf_token cookie not found")
			csrfHeader := rr.Header().Get("X-CSRF-Token")
			assert.Equal(t, csrfCookie.Value, csrfHeader)

			// Verify response body
			var resp handlers.LoginResponse
			err := json.NewDecoder(rr.Body).Decode(&resp)
			require.NoError(t, err)
			assert.NotEmpty(t, resp.SessionID)
			assert.False(t, resp.ExpiresAt.IsZero())
			assert.NotNil(t, resp.User)
			assert.Equal(t, loginReq.Email, resp.User.Email)
			assert.Equal(t, models.RoleAdmin, resp.User.Role)
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
				{
					name:     "malformed JSON",
					request:  handlers.LoginRequest{}, // Will be overridden with bad JSON
					wantCode: http.StatusBadRequest,
				},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					var rr *httptest.ResponseRecorder
					if tt.name == "malformed JSON" {
						// Need lower level helper to send malformed JSON
						req := h.newRequest(t, http.MethodPost, "/api/v1/auth/login", nil)
						req.Body = io.NopCloser(strings.NewReader("{bad json"))
						rr = h.executeRequest(req)
					} else {
						rr = h.makeRequest(t, http.MethodPost, "/api/v1/auth/login", tt.request, nil)
					}
					assert.Equal(t, tt.wantCode, rr.Code)
					assert.Empty(t, rr.Result().Cookies(), "failed login should not set cookies")
				})
			}
		})
	})

	t.Run("refresh token", func(t *testing.T) {
		t.Run("successful token refresh", func(t *testing.T) {
			// Need lower level helpers for precise cookie control
			req := h.newRequest(t, http.MethodPost, "/api/v1/auth/refresh", nil)
			h.addAuthCookies(t, req, h.RegularTestUser) // Adds both tokens
			h.addCSRFCookie(t, req)
			rr := h.executeRequest(req)
			require.Equal(t, http.StatusOK, rr.Code)

			// Verify new cookies
			cookies := rr.Result().Cookies()
			var foundAccessToken, foundCSRF bool
			for _, cookie := range cookies {
				switch cookie.Name {
				case "access_token":
					foundAccessToken = true
					assert.Equal(t, 900, cookie.MaxAge)
				case "csrf_token":
					foundCSRF = true
					assert.Equal(t, 900, cookie.MaxAge)
				case "refresh_token":
					t.Error("refresh token should not be renewed")
				}
			}
			assert.True(t, foundAccessToken, "new access_token cookie not found")
			assert.True(t, foundCSRF, "new csrf_token cookie not found")
		})

		t.Run("refresh token edge cases", func(t *testing.T) {
			tests := []struct {
				name     string
				setup    func(*http.Request)
				wantCode int
			}{
				{
					name: "missing refresh token cookie",
					setup: func(req *http.Request) {
						// Only add access token
						req.AddCookie(h.CookieManager.GenerateAccessTokenCookie(h.RegularTestUser.accessToken))
					},
					wantCode: http.StatusBadRequest,
				},
				{
					name: "expired refresh token",
					setup: func(req *http.Request) {
						expiredSession := &models.Session{
							ID:           "expired",
							UserID:       h.RegularTestUser.session.UserID,
							RefreshToken: "expired-token",
							ExpiresAt:    time.Now().Add(-1 * time.Hour),
						}
						expiredSessionUser := &testUser{
							userModel:   h.RegularTestUser.userModel,
							accessToken: h.RegularTestUser.accessToken,
							session:     expiredSession,
						}
						h.addAuthCookies(t, req, expiredSessionUser)
					},
					wantCode: http.StatusUnauthorized,
				},
				{
					name: "invalid refresh token format",
					setup: func(req *http.Request) {
						req.AddCookie(&http.Cookie{
							Name:  "refresh_token",
							Value: "invalid-format",
						})
					},
					wantCode: http.StatusUnauthorized,
				},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					req := h.newRequest(t, http.MethodPost, "/api/v1/auth/refresh", nil)
					tt.setup(req)
					rr := h.executeRequest(req)
					assert.Equal(t, tt.wantCode, rr.Code)
				})
			}
		})
	})

	t.Run("logout", func(t *testing.T) {
		t.Run("successful logout", func(t *testing.T) {
			// Need CSRF token for POST request
			req := h.newRequest(t, http.MethodPost, "/api/v1/auth/logout", nil)
			h.addAuthCookies(t, req, h.RegularTestUser)
			csrfToken := h.addCSRFCookie(t, req)
			req.Header.Set("X-CSRF-Token", csrfToken)
			rr := h.executeRequest(req)
			require.Equal(t, http.StatusNoContent, rr.Code)

			// Verify cookies are properly invalidated
			for _, cookie := range rr.Result().Cookies() {
				assert.True(t, cookie.MaxAge < 0, "cookie should be invalidated")
				assert.True(t, cookie.Expires.Before(time.Now()), "cookie should be expired")
			}

			// Verify session is actually invalidated
			rr = h.makeRequest(t, http.MethodGet, "/api/v1/auth/me", nil, h.RegularTestUser)
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
		})

		t.Run("logout edge cases", func(t *testing.T) {
			tests := []struct {
				name     string
				setup    func(*http.Request, *testUser)
				wantCode int
			}{
				{
					name: "missing CSRF token",
					setup: func(req *http.Request, tu *testUser) {
						h.addAuthCookies(t, req, tu)
						h.addCSRFCookie(t, req)
						// Deliberately not setting X-CSRF-Token header
					},
					wantCode: http.StatusForbidden,
				},
				{
					name: "mismatched CSRF token",
					setup: func(req *http.Request, tu *testUser) {
						h.addAuthCookies(t, req, tu)
						h.addCSRFCookie(t, req)
						req.Header.Set("X-CSRF-Token", "wrong-token")
					},
					wantCode: http.StatusForbidden,
				},
				{
					name: "missing auth cookies",
					setup: func(req *http.Request, tu *testUser) {
						// No setup - testing completely unauthenticated request
					},
					wantCode: http.StatusUnauthorized,
				},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					// Create a unique user for each test case
					// Construct a unique email address from test name
					uniqueUserEmail := strings.Replace(tt.name, " ", "", -1) + "@test.com"
					logoutTestUser := h.createTestUser(t, uniqueUserEmail, "password123", models.RoleEditor)
					req := h.newRequest(t, http.MethodPost, "/api/v1/auth/logout", nil)
					tt.setup(req, logoutTestUser)
					rr := h.executeRequest(req)
					assert.Equal(t, tt.wantCode, rr.Code)
				})
			}
		})
	})

	t.Run("get current user", func(t *testing.T) {

		getTestUser := h.createTestUser(t, "testgetuser@test.com", "password123", models.RoleEditor)

		t.Run("successful get current user", func(t *testing.T) {
			rr := h.makeRequest(t, http.MethodGet, "/api/v1/auth/me", nil, getTestUser)
			require.Equal(t, http.StatusOK, rr.Code)

			var user models.User
			err := json.NewDecoder(rr.Body).Decode(&user)
			require.NoError(t, err)
			assert.Equal(t, getTestUser.userModel.Email, user.Email)
		})

		t.Run("auth edge cases", func(t *testing.T) {
			tests := []struct {
				name     string
				setup    func(*http.Request)
				wantCode int
			}{
				{
					name: "missing auth cookie",
					setup: func(req *http.Request) {
						// No setup - testing unauthenticated request
					},
					wantCode: http.StatusUnauthorized,
				},
				{
					name: "invalid session ID",
					setup: func(req *http.Request) {
						invalidSession := &models.Session{
							ID:           "invalid",
							UserID:       999,
							RefreshToken: "invalid",
							ExpiresAt:    time.Now().Add(time.Hour),
						}
						invalidSessionUser := &testUser{
							userModel:   h.RegularTestUser.userModel,
							accessToken: h.RegularTestUser.accessToken,
							session:     invalidSession,
						}
						h.addAuthCookies(t, req, invalidSessionUser)
					},
					wantCode: http.StatusUnauthorized,
				},
				{
					name: "expired session",
					setup: func(req *http.Request) {
						expiredSession := &models.Session{
							ID:           "expired",
							UserID:       h.RegularTestUser.session.UserID,
							RefreshToken: "expired-token",
							ExpiresAt:    time.Now().Add(-1 * time.Hour),
						}
						expiredSessionUser := &testUser{
							userModel:   h.RegularTestUser.userModel,
							accessToken: h.RegularTestUser.accessToken,
							session:     expiredSession,
						}
						h.addAuthCookies(t, req, expiredSessionUser)
					},
					wantCode: http.StatusUnauthorized,
				},
				{
					name: "malformed access token",
					setup: func(req *http.Request) {
						req.AddCookie(&http.Cookie{
							Name:  "access_token",
							Value: "malformed-token",
						})
					},
					wantCode: http.StatusUnauthorized,
				},
			}

			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					req := h.newRequest(t, http.MethodGet, "/api/v1/auth/me", nil)
					tt.setup(req)
					rr := h.executeRequest(req)
					assert.Equal(t, tt.wantCode, rr.Code)
				})
			}
		})
	})
}
