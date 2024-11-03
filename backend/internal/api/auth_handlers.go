package api

import (
	"encoding/json"
	"net/http"
	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/models"

	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	AccessToken  string        `json:"accessToken"`
	RefreshToken string        `json:"refreshToken"`
	User         *models.User  `json:"user"`
	Session      *auth.Session `json:"session"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type RefreshResponse struct {
	AccessToken string `json:"accessToken"`
}

// Login handles user authentication and returns JWT tokens
func Login(authService *auth.SessionService, db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate request
		if req.Email == "" || req.Password == "" {
			http.Error(w, "Email and password are required", http.StatusBadRequest)
			return
		}

		// Get user from database
		user, err := db.GetUserByEmail(req.Email)
		if err != nil {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		// Verify password
		err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
		if err != nil {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}

		// Create session and generate tokens
		session, accessToken, err := authService.CreateSession(user.ID, string(user.Role))
		if err != nil {
			http.Error(w, "Failed to create session", http.StatusInternalServerError)
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

// Logout invalidates the user's session
func Logout(authService *auth.SessionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionID := r.Header.Get("X-Session-ID")
		if sessionID == "" {
			http.Error(w, "Session ID required", http.StatusBadRequest)
			return
		}

		err := authService.InvalidateSession(sessionID)
		if err != nil {
			http.Error(w, "Failed to logout", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

// RefreshToken generates a new access token using a refresh token
func RefreshToken(authService *auth.SessionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.RefreshToken == "" {
			http.Error(w, "Refresh token required", http.StatusBadRequest)
			return
		}

		// Generate new access token
		accessToken, err := authService.RefreshSession(req.RefreshToken)
		if err != nil {
			http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
			return
		}

		response := RefreshResponse{
			AccessToken: accessToken,
		}

		respondJSON(w, response)
	}
}

// GetCurrentUser returns the currently authenticated user
func (h *BaseHandler) GetCurrentUser(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		// Get user from database
		user, err := db.GetUserByID(ctx.UserID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		respondJSON(w, user)
	}
}
