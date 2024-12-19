package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"lemma/internal/auth"
	"lemma/internal/context"
	"lemma/internal/logging"
	"lemma/internal/models"
	"net/http"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// LoginRequest represents a user login request
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse represents a user login response
type LoginResponse struct {
	User      *models.User `json:"user"`
	SessionID string       `json:"sessionId,omitempty"`
	ExpiresAt time.Time    `json:"expiresAt,omitempty"`
}

func getAuthLogger() logging.Logger {
	return getHandlersLogger().WithGroup("auth")
}

// Login godoc
// @Summary Login
// @Description Logs in a user and returns a session with access and refresh tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param body body LoginRequest true "Login request"
// @Success 200 {object} LoginResponse
// @Header 200 {string} X-CSRF-Token "CSRF token for future requests"
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 400 {object} ErrorResponse "Email and password are required"
// @Failure 401 {object} ErrorResponse "Invalid credentials"
// @Failure 500 {object} ErrorResponse "Failed to create session"
// @Failure 500 {object} ErrorResponse "Failed to generate CSRF token"
// @Router /auth/login [post]
func (h *Handler) Login(authManager auth.SessionManager, cookieService auth.CookieManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log := getAuthLogger().With(
			"handler", "Login",
			"clientIP", r.RemoteAddr,
		)

		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Debug("failed to decode request body",
				"error", err.Error(),
			)
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.Email == "" || req.Password == "" {
			log.Debug("missing required fields",
				"hasEmail", req.Email != "",
				"hasPassword", req.Password != "",
			)
			respondError(w, "Email and password are required", http.StatusBadRequest)
			return
		}

		user, err := h.DB.GetUserByEmail(req.Email)
		if err != nil {
			log.Debug("user not found",
				"email", req.Email,
				"error", err.Error(),
			)
			respondError(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
		if err != nil {
			log.Warn("invalid password attempt",
				"userID", user.ID,
				"email", user.Email,
			)
			respondError(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		session, accessToken, err := authManager.CreateSession(user.ID, string(user.Role))
		if err != nil {
			log.Error("failed to create session",
				"error", err.Error(),
				"userID", user.ID,
			)
			respondError(w, "Failed to create session", http.StatusInternalServerError)
			return
		}

		csrfToken := make([]byte, 32)
		if _, err := rand.Read(csrfToken); err != nil {
			log.Error("failed to generate CSRF token",
				"error", err.Error(),
				"userID", user.ID,
			)
			respondError(w, "Failed to generate CSRF token", http.StatusInternalServerError)
			return
		}
		csrfTokenString := hex.EncodeToString(csrfToken)

		http.SetCookie(w, cookieService.GenerateAccessTokenCookie(accessToken))
		http.SetCookie(w, cookieService.GenerateRefreshTokenCookie(session.RefreshToken))
		http.SetCookie(w, cookieService.GenerateCSRFCookie(csrfTokenString))

		w.Header().Set("X-CSRF-Token", csrfTokenString)

		response := LoginResponse{
			User:      user,
			SessionID: session.ID,
			ExpiresAt: session.ExpiresAt,
		}

		log.Debug("user logged in",
			"userID", user.ID,
			"email", user.Email,
			"role", user.Role,
			"sessionID", session.ID,
		)
		respondJSON(w, response)
	}
}

// Logout godoc
// @Summary Logout
// @Description Log out invalidates the user's session
// @Tags auth
// @ID logout
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse "Session ID required"
// @Failure 500 {object} ErrorResponse "Failed to logout"
// @Router /auth/logout [post]
func (h *Handler) Logout(authManager auth.SessionManager, cookieService auth.CookieManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getAuthLogger().With(
			"handler", "Logout",
			"userID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		sessionCookie, err := r.Cookie("access_token")
		if err != nil {
			log.Debug("missing access token cookie",
				"error", err.Error(),
			)
			respondError(w, "Access token required", http.StatusBadRequest)
			return
		}

		if err := authManager.InvalidateSession(sessionCookie.Value); err != nil {
			log.Error("failed to invalidate session",
				"error", err.Error(),
				"sessionID", sessionCookie.Value,
			)
			respondError(w, "Failed to invalidate session", http.StatusInternalServerError)
			return
		}

		http.SetCookie(w, cookieService.InvalidateCookie("access_token"))
		http.SetCookie(w, cookieService.InvalidateCookie("refresh_token"))
		http.SetCookie(w, cookieService.InvalidateCookie("csrf_token"))

		log.Info("user logged out successfully",
			"sessionID", sessionCookie.Value,
		)
		w.WriteHeader(http.StatusNoContent)
	}
}

// RefreshToken godoc
// @Summary Refresh token
// @Description Refreshes the access token using the refresh token
// @Tags auth
// @ID refreshToken
// @Accept json
// @Produce json
// @Success 200
// @Header 200 {string} X-CSRF-Token "New CSRF token"
// @Failure 400 {object} ErrorResponse "Refresh token required"
// @Failure 401 {object} ErrorResponse "Invalid refresh token"
// @Failure 500 {object} ErrorResponse "Failed to generate CSRF token"
// @Router /auth/refresh [post]
func (h *Handler) RefreshToken(authManager auth.SessionManager, cookieService auth.CookieManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log := getAuthLogger().With(
			"handler", "RefreshToken",
			"clientIP", r.RemoteAddr,
		)

		refreshCookie, err := r.Cookie("refresh_token")
		if err != nil {
			log.Debug("missing refresh token cookie",
				"error", err.Error(),
			)
			respondError(w, "Refresh token required", http.StatusBadRequest)
			return
		}

		accessToken, err := authManager.RefreshSession(refreshCookie.Value)
		if err != nil {
			log.Error("failed to refresh session",
				"error", err.Error(),
			)
			respondError(w, "Invalid refresh token", http.StatusUnauthorized)
			return
		}

		csrfToken := make([]byte, 32)
		if _, err := rand.Read(csrfToken); err != nil {
			log.Error("failed to generate CSRF token",
				"error", err.Error(),
			)
			respondError(w, "Failed to generate CSRF token", http.StatusInternalServerError)
			return
		}
		csrfTokenString := hex.EncodeToString(csrfToken)

		http.SetCookie(w, cookieService.GenerateAccessTokenCookie(accessToken))
		http.SetCookie(w, cookieService.GenerateCSRFCookie(csrfTokenString))

		w.Header().Set("X-CSRF-Token", csrfTokenString)
		w.WriteHeader(http.StatusOK)
	}
}

// GetCurrentUser godoc
// @Summary Get current user
// @Description Returns the current authenticated user
// @Tags auth
// @ID getCurrentUser
// @Security CookieAuth
// @Produce json
// @Success 200 {object} models.User
// @Failure 404 {object} ErrorResponse "User not found"
// @Router /auth/me [get]
func (h *Handler) GetCurrentUser() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getAuthLogger().With(
			"handler", "GetCurrentUser",
			"userID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		user, err := h.DB.GetUserByID(ctx.UserID)
		if err != nil {
			log.Error("failed to fetch user",
				"error", err.Error(),
			)
			respondError(w, "User not found", http.StatusNotFound)
			return
		}

		respondJSON(w, user)
	}
}
