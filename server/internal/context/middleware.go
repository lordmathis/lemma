package context

import (
	"net/http"
	"novamd/internal/db"

	"github.com/go-chi/chi/v5"
)

// WithUserContextMiddleware extracts user information from JWT claims
// and adds it to the request context
func WithUserContextMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := GetUserFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		hctx := &HandlerContext{
			UserID:   claims.UserID,
			UserRole: claims.Role,
		}

		r = WithHandlerContext(r, hctx)
		next.ServeHTTP(w, r)
	})
}

// WithWorkspaceContextMiddleware adds workspace information to the request context
func WithWorkspaceContextMiddleware(db db.WorkspaceReader) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx, ok := GetRequestContext(w, r)
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
			r = WithHandlerContext(r, ctx)
			next.ServeHTTP(w, r)
		})
	}
}
