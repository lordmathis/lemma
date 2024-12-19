package auth_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"novamd/internal/auth"
	"novamd/internal/context"
	"novamd/internal/models"
	_ "novamd/internal/testenv"
)

// Mock SessionManager
type mockSessionManager struct {
	sessions map[string]*models.Session
}

func newMockSessionManager() *mockSessionManager {
	return &mockSessionManager{
		sessions: make(map[string]*models.Session),
	}
}

func (m *mockSessionManager) CreateSession(_ int, _ string) (*models.Session, string, error) {
	return nil, "", nil // Not needed for these tests
}

func (m *mockSessionManager) RefreshSession(_ string) (string, error) {
	return "", nil // Not needed for these tests
}

func (m *mockSessionManager) ValidateSession(sessionID string) (*models.Session, error) {
	session, exists := m.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session not found")
	}
	return session, nil
}

func (m *mockSessionManager) InvalidateSession(token string) error {
	delete(m.sessions, token)
	return nil
}

func (m *mockSessionManager) CleanExpiredSessions() error {
	return nil
}

// Complete mockResponseWriter implementation
type mockResponseWriter struct {
	headers    http.Header
	statusCode int
	written    []byte
}

func newMockResponseWriter() *mockResponseWriter {
	return &mockResponseWriter{
		headers: make(http.Header),
	}
}

func (m *mockResponseWriter) Header() http.Header {
	return m.headers
}

func (m *mockResponseWriter) Write(b []byte) (int, error) {
	m.written = b
	return len(b), nil
}

func (m *mockResponseWriter) WriteHeader(statusCode int) {
	m.statusCode = statusCode
}

func TestAuthenticateMiddleware(t *testing.T) {
	config := auth.JWTConfig{
		SigningKey:         "test-key",
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 24 * time.Hour,
	}
	jwtService, _ := auth.NewJWTService(config)
	sessionManager := newMockSessionManager()
	cookieManager := auth.NewCookieService(true, "localhost")
	middleware := auth.NewMiddleware(jwtService, sessionManager, cookieManager)

	testCases := []struct {
		name           string
		setupRequest   func(sessionID string) *http.Request
		setupSession   func(sessionID string)
		method         string
		wantStatusCode int
	}{
		{
			name: "valid token with valid session",
			setupRequest: func(sessionID string) *http.Request {
				req := httptest.NewRequest("GET", "/test", nil)
				token, _ := jwtService.GenerateAccessToken(1, "admin", sessionID)
				cookie := cookieManager.GenerateAccessTokenCookie(token)
				req.AddCookie(cookie)
				return req
			},
			setupSession: func(sessionID string) {
				sessionManager.sessions[sessionID] = &models.Session{
					ID:        sessionID,
					UserID:    1,
					ExpiresAt: time.Now().Add(15 * time.Minute),
				}
			},
			method:         "GET",
			wantStatusCode: http.StatusOK,
		},
		{
			name: "valid token but invalid session",
			setupRequest: func(sessionID string) *http.Request {
				req := httptest.NewRequest("GET", "/test", nil)
				token, _ := jwtService.GenerateAccessToken(1, "admin", sessionID)
				cookie := cookieManager.GenerateAccessTokenCookie(token)
				req.AddCookie(cookie)
				return req
			},
			setupSession:   func(_ string) {}, // No session setup
			method:         "GET",
			wantStatusCode: http.StatusUnauthorized,
		},
		{
			name: "missing auth cookie",
			setupRequest: func(_ string) *http.Request {
				return httptest.NewRequest("GET", "/test", nil)
			},
			setupSession:   func(_ string) {},
			method:         "GET",
			wantStatusCode: http.StatusUnauthorized,
		},
		{
			name: "POST request without CSRF token",
			setupRequest: func(sessionID string) *http.Request {
				req := httptest.NewRequest("POST", "/test", nil)
				token, _ := jwtService.GenerateAccessToken(1, "admin", sessionID)
				cookie := cookieManager.GenerateAccessTokenCookie(token)
				req.AddCookie(cookie)
				return req
			},
			setupSession: func(sessionID string) {
				sessionManager.sessions[sessionID] = &models.Session{
					ID:        sessionID,
					UserID:    1,
					ExpiresAt: time.Now().Add(15 * time.Minute),
				}
			},
			method:         "POST",
			wantStatusCode: http.StatusForbidden,
		},
		{
			name: "POST request with valid CSRF token",
			setupRequest: func(sessionID string) *http.Request {
				req := httptest.NewRequest("POST", "/test", nil)
				token, _ := jwtService.GenerateAccessToken(1, "admin", sessionID)
				cookie := cookieManager.GenerateAccessTokenCookie(token)
				req.AddCookie(cookie)

				csrfToken := "test-csrf-token"
				csrfCookie := cookieManager.GenerateCSRFCookie(csrfToken)
				req.AddCookie(csrfCookie)
				req.Header.Set("X-CSRF-Token", csrfToken)
				return req
			},
			setupSession: func(sessionID string) {
				sessionManager.sessions[sessionID] = &models.Session{
					ID:        sessionID,
					UserID:    1,
					ExpiresAt: time.Now().Add(15 * time.Minute),
				}
			},
			method:         "POST",
			wantStatusCode: http.StatusOK,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			sessionID := tc.name

			req := tc.setupRequest(sessionID)
			w := newMockResponseWriter()

			// Create test handler
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			})

			// If we have a valid token, set up the session
			if cookie, err := req.Cookie("access_token"); err == nil {
				if claims, err := jwtService.ValidateToken(cookie.Value); err == nil {
					tc.setupSession(claims.ID)
				}
			}

			// Execute middleware
			middleware.Authenticate(next).ServeHTTP(w, req)

			// Check status code
			if w.statusCode != tc.wantStatusCode {
				t.Errorf("status code = %v, want %v", w.statusCode, tc.wantStatusCode)
			}

			// Check if next handler was called when expected
			if tc.wantStatusCode == http.StatusOK && !nextCalled {
				t.Error("next handler was not called")
			}
			if tc.wantStatusCode != http.StatusOK && nextCalled {
				t.Error("next handler was called when it shouldn't have been")
			}

			// For unauthorized responses, check if cookies were invalidated
			if w.statusCode == http.StatusUnauthorized {
				for _, cookie := range w.Header()["Set-Cookie"] {
					if strings.Contains(cookie, "Max-Age=0") {
						t.Error("cookies were not properly invalidated")
					}
				}
			}
		})
	}
}

func TestRequireRole(t *testing.T) {
	config := auth.JWTConfig{
		SigningKey:         "test-key",
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 24 * time.Hour,
	}
	jwtService, _ := auth.NewJWTService(config)
	middleware := auth.NewMiddleware(jwtService, &mockSessionManager{}, auth.NewCookieService(true, "localhost"))

	testCases := []struct {
		name           string
		userRole       string
		requiredRole   string
		wantStatusCode int
	}{
		{
			name:           "matching role",
			userRole:       "admin",
			requiredRole:   "admin",
			wantStatusCode: http.StatusOK,
		},
		{
			name:           "admin accessing other role",
			userRole:       "admin",
			requiredRole:   "editor",
			wantStatusCode: http.StatusOK,
		},
		{
			name:           "insufficient role",
			userRole:       "editor",
			requiredRole:   "admin",
			wantStatusCode: http.StatusForbidden,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create handler context with user info
			hctx := &context.HandlerContext{
				UserID:   1,
				UserRole: tc.userRole,
			}

			// Create request with handler context
			req := httptest.NewRequest("GET", "/test", nil)
			req = context.WithHandlerContext(req, hctx)
			w := newMockResponseWriter()

			// Create test handler
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			})

			// Execute middleware
			middleware.RequireRole(tc.requiredRole)(next).ServeHTTP(w, req)

			// Check status code
			if w.statusCode != tc.wantStatusCode {
				t.Errorf("status code = %v, want %v", w.statusCode, tc.wantStatusCode)
			}

			// Check if next handler was called when expected
			if tc.wantStatusCode == http.StatusOK && !nextCalled {
				t.Error("next handler was not called")
			}
			if tc.wantStatusCode != http.StatusOK && nextCalled {
				t.Error("next handler was called when it shouldn't have been")
			}
		})
	}
}

func TestRequireWorkspaceAccess(t *testing.T) {
	config := auth.JWTConfig{
		SigningKey: "test-key",
	}
	jwtService, _ := auth.NewJWTService(config)
	middleware := auth.NewMiddleware(jwtService, &mockSessionManager{}, auth.NewCookieService(true, "localhost"))

	testCases := []struct {
		name           string
		setupContext   func() *context.HandlerContext
		wantStatusCode int
	}{
		{
			name: "workspace owner access",
			setupContext: func() *context.HandlerContext {
				return &context.HandlerContext{
					UserID:   1,
					UserRole: "editor",
					Workspace: &models.Workspace{
						ID:     1,
						UserID: 1, // Same as context UserID
					},
				}
			},
			wantStatusCode: http.StatusOK,
		},
		{
			name: "admin access to other's workspace",
			setupContext: func() *context.HandlerContext {
				return &context.HandlerContext{
					UserID:   2,
					UserRole: "admin",
					Workspace: &models.Workspace{
						ID:     1,
						UserID: 1, // Different from context UserID
					},
				}
			},
			wantStatusCode: http.StatusOK,
		},
		{
			name: "unauthorized access attempt",
			setupContext: func() *context.HandlerContext {
				return &context.HandlerContext{
					UserID:   2,
					UserRole: "editor",
					Workspace: &models.Workspace{
						ID:     1,
						UserID: 1, // Different from context UserID
					},
				}
			},
			wantStatusCode: http.StatusNotFound,
		},
		{
			name: "no workspace in context",
			setupContext: func() *context.HandlerContext {
				return &context.HandlerContext{
					UserID:    1,
					UserRole:  "editor",
					Workspace: nil,
				}
			},
			wantStatusCode: http.StatusOK,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create request with context
			req := httptest.NewRequest("GET", "/test", nil)
			req = context.WithHandlerContext(req, tc.setupContext())
			w := newMockResponseWriter()

			// Create test handler
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			})

			// Execute middleware
			middleware.RequireWorkspaceAccess(next).ServeHTTP(w, req)

			// Check status code
			if w.statusCode != tc.wantStatusCode {
				t.Errorf("status code = %v, want %v", w.statusCode, tc.wantStatusCode)
			}

			// Check if next handler was called when expected
			if tc.wantStatusCode == http.StatusOK && !nextCalled {
				t.Error("next handler was not called")
			}
			if tc.wantStatusCode != http.StatusOK && nextCalled {
				t.Error("next handler was called when it shouldn't have been")
			}
		})
	}
}
