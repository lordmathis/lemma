package auth_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"novamd/internal/auth"
	"novamd/internal/httpcontext"
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
			// Create context with user claims
			ctx := context.WithValue(context.Background(), auth.UserContextKey, auth.UserClaims{
				UserID: 1,
				Role:   tc.userRole,
			})
			req := httptest.NewRequest("GET", "/test", nil).WithContext(ctx)
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
		setupContext   func() *httpcontext.HandlerContext
		wantStatusCode int
	}{
		{
			name: "workspace owner access",
			setupContext: func() *httpcontext.HandlerContext {
				return &httpcontext.HandlerContext{
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
			setupContext: func() *httpcontext.HandlerContext {
				return &httpcontext.HandlerContext{
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
			setupContext: func() *httpcontext.HandlerContext {
				return &httpcontext.HandlerContext{
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
			setupContext: func() *httpcontext.HandlerContext {
				return &httpcontext.HandlerContext{
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
			ctx := context.WithValue(context.Background(), httpcontext.HandlerContextKey, tc.setupContext())
			req := httptest.NewRequest("GET", "/test", nil).WithContext(ctx)
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

func TestGetUserFromContext(t *testing.T) {
	testCases := []struct {
		name        string
		setupCtx    func() context.Context
		wantUserID  int
		wantRole    string
		wantErr     bool
		errContains string
	}{
		{
			name: "valid user context",
			setupCtx: func() context.Context {
				return context.WithValue(context.Background(), auth.UserContextKey, auth.UserClaims{
					UserID: 1,
					Role:   "admin",
				})
			},
			wantUserID: 1,
			wantRole:   "admin",
			wantErr:    false,
		},
		{
			name: "missing user context",
			setupCtx: func() context.Context {
				return context.Background()
			},
			wantErr:     true,
			errContains: "no user found in context",
		},
		{
			name: "invalid context value type",
			setupCtx: func() context.Context {
				return context.WithValue(context.Background(), auth.UserContextKey, "invalid")
			},
			wantErr:     true,
			errContains: "no user found in context",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := tc.setupCtx()
			claims, err := auth.GetUserFromContext(ctx)

			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				} else if tc.errContains != "" && !strings.Contains(err.Error(), tc.errContains) {
					t.Errorf("error = %v, want error containing %v", err, tc.errContains)
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			if claims.UserID != tc.wantUserID {
				t.Errorf("UserID = %v, want %v", claims.UserID, tc.wantUserID)
			}

			if claims.Role != tc.wantRole {
				t.Errorf("Role = %v, want %v", claims.Role, tc.wantRole)
			}
		})
	}
}
