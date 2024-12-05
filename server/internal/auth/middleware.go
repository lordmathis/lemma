package auth

import (
	"crypto/subtle"
	"net/http"

	"novamd/internal/context"
)

// Middleware handles JWT authentication for protected routes
type Middleware struct {
	jwtManager JWTManager
}

// NewMiddleware creates a new authentication middleware
func NewMiddleware(jwtManager JWTManager) *Middleware {
	return &Middleware{
		jwtManager: jwtManager,
	}
}

// Authenticate middleware validates JWT tokens and sets user information in context
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		cookie, err := r.Cookie("access_token")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Validate token
		claims, err := m.jwtManager.ValidateToken(cookie.Value)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Check token type
		if claims.Type != AccessToken {
			http.Error(w, "Invalid token type", http.StatusUnauthorized)
			return
		}

		// Add CSRF check for non-GET requests
		if r.Method != http.MethodGet && r.Method != http.MethodHead && r.Method != http.MethodOptions {
			csrfCookie, err := r.Cookie("csrf_token")
			if err != nil {
				http.Error(w, "CSRF cookie not found", http.StatusForbidden)
				return
			}

			csrfHeader := r.Header.Get("X-CSRF-Token")
			if csrfHeader == "" {
				http.Error(w, "CSRF token header not found", http.StatusForbidden)
				return
			}

			if subtle.ConstantTimeCompare([]byte(csrfCookie.Value), []byte(csrfHeader)) != 1 {
				http.Error(w, "CSRF token mismatch", http.StatusForbidden)
				return
			}
		}

		// Create handler context with user information
		hctx := &context.HandlerContext{
			UserID:   claims.UserID,
			UserRole: claims.Role,
		}

		// Add context to request and continue
		next.ServeHTTP(w, context.WithHandlerContext(r, hctx))
	})
}

// RequireRole returns a middleware that ensures the user has the required role
func (m *Middleware) RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx, ok := context.GetRequestContext(w, r)
			if !ok {
				return
			}

			if ctx.UserRole != role && ctx.UserRole != "admin" {
				http.Error(w, "Insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireWorkspaceAccess returns a middleware that ensures the user has access to the workspace
func (m *Middleware) RequireWorkspaceAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		// If no workspace in context, allow the request (might be a non-workspace endpoint)
		if ctx.Workspace == nil {
			next.ServeHTTP(w, r)
			return
		}

		// Check if user has access (either owner or admin)
		if ctx.Workspace.UserID != ctx.UserID && ctx.UserRole != "admin" {
			http.Error(w, "Not Found", http.StatusNotFound)
			return
		}

		next.ServeHTTP(w, r)
	})
}
