package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"novamd/internal/auth"
	"novamd/internal/context"
	"novamd/internal/models"
)

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
	middleware := auth.NewMiddleware(jwtService)

	testCases := []struct {
		name           string
		setupAuth      func() string
		wantStatusCode int
	}{
		{
			name: "valid token",
			setupAuth: func() string {
				token, _ := jwtService.GenerateAccessToken(1, "admin")
				return token
			},
			wantStatusCode: http.StatusOK,
		},
		{
			name: "missing auth header",
			setupAuth: func() string {
				return ""
			},
			wantStatusCode: http.StatusUnauthorized,
		},
		{
			name: "invalid auth format",
			setupAuth: func() string {
				return "InvalidFormat token"
			},
			wantStatusCode: http.StatusUnauthorized,
		},
		{
			name: "invalid token",
			setupAuth: func() string {
				return "Bearer invalid.token.here"
			},
			wantStatusCode: http.StatusUnauthorized,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create test request
			req := httptest.NewRequest("GET", "/test", nil)
			if token := tc.setupAuth(); token != "" {
				req.Header.Set("Authorization", "Bearer "+token)
			}

			// Create response recorder
			w := newMockResponseWriter()

			// Create test handler
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			})

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
	middleware := auth.NewMiddleware(jwtService)

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
	middleware := auth.NewMiddleware(jwtService)

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
