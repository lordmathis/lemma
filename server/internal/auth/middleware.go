package auth

import (
	"net/http"
	"strings"

	"novamd/internal/context"
)

// Middleware handles JWT authentication for protected routes
type Middleware struct {
	jwtManager JWTManager
}

// NewMiddleware creates a new authentication middleware
// Parameters:
// - jwtManager: the JWT manager to use for token operations
// Returns:
// - *Middleware: the new middleware instance
func NewMiddleware(jwtManager JWTManager) *Middleware {
	return &Middleware{
		jwtManager: jwtManager,
	}
}

// Authenticate middleware validates JWT tokens and sets user information in context
// Parameters:
// - next: the next handler to call
// Returns:
// - http.Handler: the handler function
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		// Check Bearer token format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		// Validate token
		claims, err := m.jwtManager.ValidateToken(parts[1])
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Check token type
		if claims.Type != AccessToken {
			http.Error(w, "Invalid token type", http.StatusUnauthorized)
			return
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
// Parameters:
// - role: the required role
// Returns:
// - func(http.Handler) http.Handler: the middleware function
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
// Parameters:
// - next: the next handler to call
// Returns:
// - http.Handler: the handler function
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
