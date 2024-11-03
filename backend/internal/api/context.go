// api/context.go
package api

import (
	"context"
	"net/http"
	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/filesystem"
	"novamd/internal/models"

	"github.com/go-chi/chi/v5"
)

type HandlerContext struct {
	UserID    int
	UserRole  string
	Workspace *models.Workspace
}

type contextKey string

const handlerContextKey contextKey = "handlerContext"

// Middleware to populate handler context
func WithHandlerContext(db *db.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get user claims from auth context
			claims, err := auth.GetUserFromContext(r.Context())
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Get workspace name from URL if it exists
			workspaceName := chi.URLParam(r, "workspaceName")

			var workspace *models.Workspace
			// Only look up workspace if name is provided
			if workspaceName != "" {
				workspace, err = db.GetWorkspaceByName(claims.UserID, workspaceName)
				if err != nil {
					http.Error(w, "Workspace not found", http.StatusNotFound)
					return
				}
			}

			// Create handler context
			ctx := &HandlerContext{
				UserID:    claims.UserID,
				UserRole:  claims.Role,
				Workspace: workspace,
			}

			// Add to request context
			reqCtx := context.WithValue(r.Context(), handlerContextKey, ctx)
			next.ServeHTTP(w, r.WithContext(reqCtx))
		})
	}
}

// Helper function to get handler context
func GetHandlerContext(r *http.Request) *HandlerContext {
	ctx := r.Context().Value(handlerContextKey)
	if ctx == nil {
		return nil
	}
	return ctx.(*HandlerContext)
}

type BaseHandler struct {
	DB *db.DB
	FS *filesystem.FileSystem
}

// Helper method to get context and handle errors
func (h *BaseHandler) getContext(w http.ResponseWriter, r *http.Request) (*HandlerContext, bool) {
	ctx := GetHandlerContext(r)
	if ctx == nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return nil, false
	}
	return ctx, true
}
