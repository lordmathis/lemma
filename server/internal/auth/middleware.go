package auth

import (
	"crypto/subtle"
	"net/http"
	"novamd/internal/context"
	"novamd/internal/logging"
)

func getMiddlewareLogger() logging.Logger {
	return getAuthLogger().WithGroup("middleware")
}

// Middleware handles JWT authentication for protected routes
type Middleware struct {
	jwtManager     JWTManager
	sessionManager SessionManager
	cookieManager  CookieManager
}

// NewMiddleware creates a new authentication middleware
func NewMiddleware(jwtManager JWTManager, sessionManager SessionManager, cookieManager CookieManager) *Middleware {
	log := getMiddlewareLogger()
	log.Info("initialized auth middleware")

	return &Middleware{
		jwtManager:     jwtManager,
		sessionManager: sessionManager,
		cookieManager:  cookieManager,
	}
}

// Authenticate middleware validates JWT tokens and sets user information in context
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log := getMiddlewareLogger()

		// Extract token from cookie
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

		// Check if session is still valid in database
		session, err := m.sessionManager.ValidateSession(claims.ID)
		if err != nil || session == nil {
			m.cookieManager.InvalidateCookie("access_token")
			m.cookieManager.InvalidateCookie("refresh_token")
			m.cookieManager.InvalidateCookie("csrf_token")
			http.Error(w, "Session invalid or expired", http.StatusUnauthorized)
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

		log.Debug("authentication completed",
			"userId", claims.UserID,
			"role", claims.Role,
			"method", r.Method,
			"path", r.URL.Path)

		// Add context to request and continue
		next.ServeHTTP(w, context.WithHandlerContext(r, hctx))
	})
}

// RequireRole returns a middleware that ensures the user has the required role
func (m *Middleware) RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log := getMiddlewareLogger()

			ctx, ok := context.GetRequestContext(w, r)
			if !ok {
				return
			}

			if ctx.UserRole != role && ctx.UserRole != "admin" {
				http.Error(w, "Insufficient permissions", http.StatusForbidden)
				return
			}

			log.Debug("role requirement satisfied",
				"requiredRole", role,
				"userRole", ctx.UserRole,
				"path", r.URL.Path)

			next.ServeHTTP(w, r)
		})
	}
}

// RequireWorkspaceAccess returns a middleware that ensures the user has access to the workspace
func (m *Middleware) RequireWorkspaceAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log := getMiddlewareLogger()

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

		log.Debug("workspace access granted",
			"userId", ctx.UserID,
			"workspaceId", ctx.Workspace.ID,
			"path", r.URL.Path)

		next.ServeHTTP(w, r)
	})
}
