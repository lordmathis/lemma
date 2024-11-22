// Package context provides functions for managing request context
package context

import (
	"context"
	"fmt"
	"net/http"
	"novamd/internal/models"
)

type contextKey string

const (
	// HandlerContextKey is the key used to store handler context in the request context
	HandlerContextKey contextKey = "handlerContext"
)

// UserClaims represents user information from authentication
type UserClaims struct {
	UserID int
	Role   string
}

// HandlerContext holds the request-specific data available to all handlers
type HandlerContext struct {
	UserID    int
	UserRole  string
	Workspace *models.Workspace // Optional, only set for workspace routes
}

// GetRequestContext retrieves the handler context from the request
func GetRequestContext(w http.ResponseWriter, r *http.Request) (*HandlerContext, bool) {
	ctx := r.Context().Value(HandlerContextKey)
	if ctx == nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return nil, false
	}
	return ctx.(*HandlerContext), true
}

// WithHandlerContext adds handler context to the request
func WithHandlerContext(r *http.Request, hctx *HandlerContext) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), HandlerContextKey, hctx))
}

// GetUserFromContext retrieves user claims from the context
func GetUserFromContext(ctx context.Context) (*UserClaims, error) {
	val := ctx.Value(HandlerContextKey)
	if val == nil {
		return nil, fmt.Errorf("no user found in context")
	}

	hctx, ok := val.(*HandlerContext)
	if !ok {
		return nil, fmt.Errorf("invalid context type")
	}

	return &UserClaims{
		UserID: hctx.UserID,
		Role:   hctx.UserRole,
	}, nil
}
