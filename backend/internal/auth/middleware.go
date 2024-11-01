package auth

import (
	"context"
	"fmt"
	"net/http"
	"novamd/internal/db"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

type contextKey string

const (
	UserContextKey contextKey = "user"
)

// UserClaims represents the user information stored in the request context
type UserClaims struct {
	UserID int
	Role   string
}

// Middleware handles JWT authentication for protected routes
type Middleware struct {
	jwtService *JWTService
}

// NewMiddleware creates a new authentication middleware
func NewMiddleware(jwtService *JWTService) *Middleware {
	return &Middleware{
		jwtService: jwtService,
	}
}

// Authenticate middleware validates JWT tokens and sets user information in context
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
		claims, err := m.jwtService.ValidateToken(parts[1])
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Check token type
		if claims.Type != AccessToken {
			http.Error(w, "Invalid token type", http.StatusUnauthorized)
			return
		}

		// Add user claims to request context
		ctx := context.WithValue(r.Context(), UserContextKey, UserClaims{
			UserID: claims.UserID,
			Role:   claims.Role,
		})

		// Call the next handler with the updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireRole returns a middleware that ensures the user has the required role
func (m *Middleware) RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(UserContextKey).(UserClaims)
			if !ok {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			if claims.Role != role && claims.Role != "admin" {
				http.Error(w, "Insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireResourceOwnership ensures users can only access their own resources
func (m *Middleware) RequireResourceOwnership(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get requesting user from context (set by auth middleware)
		claims, err := GetUserFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Get requested user ID from URL
		userIDStr := chi.URLParam(r, "userId")
		requestedUserID, err := strconv.Atoi(userIDStr)
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		// Allow if user is accessing their own resources or is an admin
		if claims.UserID != requestedUserID && claims.Role != "admin" {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequireWorkspaceOwnership ensures users can only access workspaces they own
type WorkspaceGetter interface {
	GetWorkspaceByID(id int) (*Workspace, error)
}

type Workspace struct {
	ID     int
	UserID int
}

// RequireWorkspaceOwnership ensures users can only access workspaces they own
func (m *Middleware) RequireWorkspaceOwnership(db *db.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get requesting user from context
			claims, err := GetUserFromContext(r.Context())
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Get workspace ID from URL
			workspaceID, err := strconv.Atoi(chi.URLParam(r, "workspaceId"))
			if err != nil {
				http.Error(w, "Invalid workspace ID", http.StatusBadRequest)
				return
			}

			// Get workspace from database
			workspace, err := db.GetWorkspaceByID(workspaceID)
			if err != nil {
				http.Error(w, "Workspace not found", http.StatusNotFound)
				return
			}

			// Check if user owns the workspace or is admin
			if workspace.UserID != claims.UserID && claims.Role != "admin" {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// GetUserFromContext retrieves user claims from the request context
func GetUserFromContext(ctx context.Context) (*UserClaims, error) {
	claims, ok := ctx.Value(UserContextKey).(UserClaims)
	if !ok {
		return nil, fmt.Errorf("no user found in context")
	}
	return &claims, nil
}
