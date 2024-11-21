package middleware

import (
	"net/http"
	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/httpcontext"

	"github.com/go-chi/chi/v5"
)

// User ID and User Role context
func WithUserContext(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := auth.GetUserFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		hctx := &httpcontext.HandlerContext{
			UserID:   claims.UserID,
			UserRole: claims.Role,
		}

		r = httpcontext.WithHandlerContext(r, hctx)
		next.ServeHTTP(w, r)
	})
}

// Workspace context
func WithWorkspaceContext(db db.Database) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx, ok := httpcontext.GetRequestContext(w, r)
			if !ok {
				return
			}

			workspaceName := chi.URLParam(r, "workspaceName")
			workspace, err := db.GetWorkspaceByName(ctx.UserID, workspaceName)
			if err != nil {
				http.Error(w, "Workspace not found", http.StatusNotFound)
				return
			}

			// Update existing context with workspace
			ctx.Workspace = workspace
			r = httpcontext.WithHandlerContext(r, ctx)
			next.ServeHTTP(w, r)
		})
	}
}
