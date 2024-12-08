package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"novamd/internal/auth"
	"novamd/internal/context"
	"novamd/internal/models"
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
		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate request
		if req.Email == "" || req.Password == "" {
			respondError(w, "Email and password are required", http.StatusBadRequest)
			return
		}

		// Get user from database
		user, err := h.DB.GetUserByEmail(req.Email)
		if err != nil {
			respondError(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		// Verify password
		err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
		if err != nil {
			respondError(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		// Create session and generate tokens
		session, accessToken, err := authManager.CreateSession(user.ID, string(user.Role))
		if err != nil {
			respondError(w, "Failed to create session", http.StatusInternalServerError)
			return
		}

		// Generate CSRF token
		csrfToken := make([]byte, 32)
		if _, err := rand.Read(csrfToken); err != nil {
			respondError(w, "Failed to generate CSRF token", http.StatusInternalServerError)
			return
		}
		csrfTokenString := hex.EncodeToString(csrfToken)

		// Set cookies
		http.SetCookie(w, cookieService.GenerateAccessTokenCookie(accessToken))
		http.SetCookie(w, cookieService.GenerateRefreshTokenCookie(session.RefreshToken))
		http.SetCookie(w, cookieService.GenerateCSRFCookie(csrfTokenString))

		// Send CSRF token in header for initial setup
		w.Header().Set("X-CSRF-Token", csrfTokenString)

		// Only send user info in response, not tokens
		response := LoginResponse{
			User:      user,
			SessionID: session.ID,
			ExpiresAt: session.ExpiresAt,
		}

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
		// Get session ID from cookie
		sessionCookie, err := r.Cookie("access_token")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Invalidate the session in the database
		if err := authManager.InvalidateSession(sessionCookie.Value); err != nil {
			respondError(w, "Failed to invalidate session", http.StatusInternalServerError)
			return
		}

		// Clear cookies
		http.SetCookie(w, cookieService.InvalidateCookie("access_token"))
		http.SetCookie(w, cookieService.InvalidateCookie("refresh_token"))
		http.SetCookie(w, cookieService.InvalidateCookie("csrf_token"))

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
// @Param body body RefreshRequest true "Refresh request"
// @Success 200
// @Header 200 {string} X-CSRF-Token "New CSRF token"
// @Failure 400 {object} ErrorResponse "Refresh token required"
// @Failure 401 {object} ErrorResponse "Invalid refresh token"
// @Failure 500 {object} ErrorResponse "Failed to generate CSRF token"
// @Router /auth/refresh [post]
func (h *Handler) RefreshToken(authManager auth.SessionManager, cookieService auth.CookieManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		refreshCookie, err := r.Cookie("refresh_token")
		if err != nil {
			respondError(w, "Refresh token required", http.StatusBadRequest)
			return
		}

		// Generate new access token
		accessToken, err := authManager.RefreshSession(refreshCookie.Value)
		if err != nil {
			respondError(w, "Invalid refresh token", http.StatusUnauthorized)
			return
		}

		// Generate new CSRF token
		csrfToken := make([]byte, 32)
		if _, err := rand.Read(csrfToken); err != nil {
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

		// Get user from database
		user, err := h.DB.GetUserByID(ctx.UserID)
		if err != nil {
			respondError(w, "User not found", http.StatusNotFound)
			return
		}

		respondJSON(w, user)
	}
}
