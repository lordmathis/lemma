package middleware

import (
	"net/http"
	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/httpcontext"
	"novamd/internal/models"

	"github.com/go-chi/chi/v5"
)

// WithHandlerContext middleware populates the HandlerContext for the request
// This should be placed after authentication middleware
func WithHandlerContext(db *db.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get user claims from auth middleware
			claims, err := auth.GetUserFromContext(r.Context())
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Try to get workspace from URL if it exists
			workspaceName := chi.URLParam(r, "workspaceName")

			var workspace *models.Workspace
			if workspaceName != "" {
				workspace, err = db.GetWorkspaceByName(claims.UserID, workspaceName)
				if err != nil {
					http.Error(w, "Internal server error", http.StatusInternalServerError)
					return
				}
			}

			// Create handler context with user and workspace info
			hctx := &httpcontext.HandlerContext{
				UserID:    claims.UserID,
				UserRole:  claims.Role,
				Workspace: workspace,
			}

			// Add context to request
			r = httpcontext.WithHandlerContext(r, hctx)
			next.ServeHTTP(w, r)
		})
	}
}
