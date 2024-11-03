package httpcontext

import (
	"context"
	"net/http"
	"novamd/internal/models"
)

// HandlerContext holds the request-specific data available to all handlers
type HandlerContext struct {
	UserID    int
	UserRole  string
	Workspace *models.Workspace // Will be nil for non-workspace endpoints
}

type contextKey string

const HandlerContextKey contextKey = "handlerContext"

func GetRequestContext(w http.ResponseWriter, r *http.Request) (*HandlerContext, bool) {
	ctx := r.Context().Value(HandlerContextKey)
	if ctx == nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return nil, false
	}
	return ctx.(*HandlerContext), true
}

func WithHandlerContext(r *http.Request, hctx *HandlerContext) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), HandlerContextKey, hctx))
}
