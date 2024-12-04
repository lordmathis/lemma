package handlers

import (
	"encoding/json"
	"net/http"
	"novamd/internal/auth"
	"novamd/internal/context"
	"novamd/internal/models"

	"golang.org/x/crypto/bcrypt"
)

// LoginRequest represents a user login request
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse represents a user login response
type LoginResponse struct {
	AccessToken  string          `json:"accessToken"`
	RefreshToken string          `json:"refreshToken"`
	User         *models.User    `json:"user"`
	Session      *models.Session `json:"session"`
}

// RefreshRequest represents a refresh token request
type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

// RefreshResponse represents a refresh token response
type RefreshResponse struct {
	AccessToken string `json:"accessToken"`
}

// Login godoc
// @Summary Login
// @Description Logs in a user
// @Tags auth
// @ID login
// @Accept json
// @Produce json
// @Param body body LoginRequest true "Login request"
// @Success 200 {object} LoginResponse
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 400 {object} ErrorResponse "Email and password are required"
// @Failure 401 {object} ErrorResponse "Invalid credentials"
// @Failure 500 {object} ErrorResponse "Failed to create session"
// @Router /auth/login [post]
func (h *Handler) Login(authService *auth.SessionService) http.HandlerFunc {
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
		session, accessToken, err := authService.CreateSession(user.ID, string(user.Role))
		if err != nil {
			respondError(w, "Failed to create session", http.StatusInternalServerError)
			return
		}

		// Prepare response
		response := LoginResponse{
			AccessToken:  accessToken,
			RefreshToken: session.RefreshToken,
			User:         user,
			Session:      session,
		}

		respondJSON(w, response)
	}
}

// Logout godoc
// @Summary Logout
// @Description Log out invalidates the user's session
// @Tags auth
// @ID logout
// @Security BearerAuth
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse "Session ID required"
// @Failure 500 {object} ErrorResponse "Failed to logout"
// @Router /auth/logout [post]
func (h *Handler) Logout(authService *auth.SessionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionID := r.Header.Get("X-Session-ID")
		if sessionID == "" {
			respondError(w, "Session ID required", http.StatusBadRequest)
			return
		}

		err := authService.InvalidateSession(sessionID)
		if err != nil {
			respondError(w, "Failed to logout", http.StatusInternalServerError)
			return
		}

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
// @Success 200 {object} RefreshResponse
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 400 {object} ErrorResponse "Refresh token required"
// @Failure 401 {object} ErrorResponse "Invalid refresh token"
// @Router /auth/refresh [post]
func (h *Handler) RefreshToken(authService *auth.SessionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.RefreshToken == "" {
			respondError(w, "Refresh token required", http.StatusBadRequest)
			return
		}

		// Generate new access token
		accessToken, err := authService.RefreshSession(req.RefreshToken)
		if err != nil {
			respondError(w, "Invalid refresh token", http.StatusUnauthorized)
			return
		}

		response := RefreshResponse{
			AccessToken: accessToken,
		}

		respondJSON(w, response)
	}
}

// GetCurrentUser godoc
// @Summary Get current user
// @Description Returns the current authenticated user
// @Tags auth
// @ID getCurrentUser
// @Security BearerAuth
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
