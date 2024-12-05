// Package handlers contains the request handlers for the api routes.
package handlers

import (
	"encoding/json"
	"net/http"
	"novamd/internal/context"
	"novamd/internal/db"
	"novamd/internal/models"
	"novamd/internal/storage"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"
)

// CreateUserRequest holds the request fields for creating a new user
type CreateUserRequest struct {
	Email       string          `json:"email"`
	DisplayName string          `json:"displayName"`
	Password    string          `json:"password"`
	Role        models.UserRole `json:"role"`
}

// UpdateUserRequest holds the request fields for updating a user
type UpdateUserRequest struct {
	Email       string          `json:"email,omitempty"`
	DisplayName string          `json:"displayName,omitempty"`
	Password    string          `json:"password,omitempty"`
	Role        models.UserRole `json:"role,omitempty"`
}

// WorkspaceStats holds workspace statistics
type WorkspaceStats struct {
	UserID             int       `json:"userID"`
	UserEmail          string    `json:"userEmail"`
	WorkspaceID        int       `json:"workspaceID"`
	WorkspaceName      string    `json:"workspaceName"`
	WorkspaceCreatedAt time.Time `json:"workspaceCreatedAt"`
	*storage.FileCountStats
}

// SystemStats holds system-wide statistics
type SystemStats struct {
	*db.UserStats
	*storage.FileCountStats
}

// AdminListUsers godoc
// @Summary List all users
// @Description Returns the list of all users
// @Tags Admin
// @Security CookieAuth
// @ID adminListUsers
// @Produce json
// @Success 200 {array} models.User
// @Failure 500 {object} ErrorResponse "Failed to list users"
// @Router /admin/users [get]
func (h *Handler) AdminListUsers() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		users, err := h.DB.GetAllUsers()
		if err != nil {
			respondError(w, "Failed to list users", http.StatusInternalServerError)
			return
		}

		respondJSON(w, users)
	}
}

// AdminCreateUser godoc
// @Summary Create a new user
// @Description Create a new user as an admin
// @Tags Admin
// @Security CookieAuth
// @ID adminCreateUser
// @Accept json
// @Produce json
// @Param user body CreateUserRequest true "User details"
// @Success 200 {object} models.User
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 400 {object} ErrorResponse "Email, password, and role are required"
// @Failure 400 {object} ErrorResponse "Password must be at least 8 characters"
// @Failure 409 {object} ErrorResponse "Email already exists"
// @Failure 500 {object} ErrorResponse "Failed to hash password"
// @Failure 500 {object} ErrorResponse "Failed to create user"
// @Failure 500 {object} ErrorResponse "Failed to initialize user workspace"
// @Router /admin/users [post]
func (h *Handler) AdminCreateUser() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req CreateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate request
		if req.Email == "" || req.Password == "" || req.Role == "" {
			respondError(w, "Email, password, and role are required", http.StatusBadRequest)
			return
		}

		// Check if email already exists
		existingUser, err := h.DB.GetUserByEmail(req.Email)
		if err == nil && existingUser != nil {
			respondError(w, "Email already exists", http.StatusConflict)
			return
		}

		// Check if password is long enough
		if len(req.Password) < 8 {
			respondError(w, "Password must be at least 8 characters", http.StatusBadRequest)
			return
		}

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			respondError(w, "Failed to hash password", http.StatusInternalServerError)
			return
		}

		// Create user
		user := &models.User{
			Email:        req.Email,
			DisplayName:  req.DisplayName,
			PasswordHash: string(hashedPassword),
			Role:         req.Role,
		}

		insertedUser, err := h.DB.CreateUser(user)
		if err != nil {
			respondError(w, "Failed to create user", http.StatusInternalServerError)
			return
		}

		// Initialize user workspace
		if err := h.Storage.InitializeUserWorkspace(insertedUser.ID, insertedUser.LastWorkspaceID); err != nil {
			respondError(w, "Failed to initialize user workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, insertedUser)
	}
}

// AdminGetUser godoc
// @Summary Get a specific user
// @Description Get a specific user as an admin
// @Tags Admin
// @Security CookieAuth
// @ID adminGetUser
// @Produce json
// @Param userId path int true "User ID"
// @Success 200 {object} models.User
// @Failure 400 {object} ErrorResponse "Invalid user ID"
// @Failure 404 {object} ErrorResponse "User not found"
// @Router /admin/users/{userId} [get]
func (h *Handler) AdminGetUser() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := strconv.Atoi(chi.URLParam(r, "userId"))
		if err != nil {
			respondError(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		user, err := h.DB.GetUserByID(userID)
		if err != nil {
			respondError(w, "User not found", http.StatusNotFound)
			return
		}

		respondJSON(w, user)
	}
}

// AdminUpdateUser godoc
// @Summary Update a specific user
// @Description Update a specific user as an admin
// @Tags Admin
// @Security CookieAuth
// @ID adminUpdateUser
// @Accept json
// @Produce json
// @Param userId path int true "User ID"
// @Param user body UpdateUserRequest true "User details"
// @Success 200 {object} models.User
// @Failure 400 {object} ErrorResponse "Invalid user ID"
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 404 {object} ErrorResponse "User not found"
// @Failure 500 {object} ErrorResponse "Failed to hash password"
// @Failure 500 {object} ErrorResponse "Failed to update user"
// @Router /admin/users/{userId} [put]
func (h *Handler) AdminUpdateUser() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := strconv.Atoi(chi.URLParam(r, "userId"))
		if err != nil {
			respondError(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		// Get existing user
		user, err := h.DB.GetUserByID(userID)
		if err != nil {
			respondError(w, "User not found", http.StatusNotFound)
			return
		}

		var req UpdateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Update fields if provided
		if req.Email != "" {
			user.Email = req.Email
		}
		if req.DisplayName != "" {
			user.DisplayName = req.DisplayName
		}
		if req.Role != "" {
			user.Role = req.Role
		}
		if req.Password != "" {
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
			if err != nil {
				respondError(w, "Failed to hash password", http.StatusInternalServerError)
				return
			}
			user.PasswordHash = string(hashedPassword)
		}

		if err := h.DB.UpdateUser(user); err != nil {
			respondError(w, "Failed to update user", http.StatusInternalServerError)
			return
		}

		respondJSON(w, user)
	}
}

// AdminDeleteUser godoc
// @Summary Delete a specific user
// @Description Delete a specific user as an admin
// @Tags Admin
// @Security CookieAuth
// @ID adminDeleteUser
// @Param userId path int true "User ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse "Invalid user ID"
// @Failure 400 {object} ErrorResponse "Cannot delete your own account"
// @Failure 403 {object} ErrorResponse "Cannot delete other admin users"
// @Failure 404 {object} ErrorResponse "User not found"
// @Failure 500 {object} ErrorResponse "Failed to delete user"
// @Router /admin/users/{userId} [delete]
func (h *Handler) AdminDeleteUser() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		userID, err := strconv.Atoi(chi.URLParam(r, "userId"))
		if err != nil {
			respondError(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		// Prevent admin from deleting themselves
		if userID == ctx.UserID {
			respondError(w, "Cannot delete your own account", http.StatusBadRequest)
			return
		}

		// Get user before deletion to check role
		user, err := h.DB.GetUserByID(userID)
		if err != nil {
			respondError(w, "User not found", http.StatusNotFound)
			return
		}

		// Prevent deletion of other admin users
		if user.Role == models.RoleAdmin && ctx.UserID != userID {
			respondError(w, "Cannot delete other admin users", http.StatusForbidden)
			return
		}

		if err := h.DB.DeleteUser(userID); err != nil {
			respondError(w, "Failed to delete user", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// AdminListWorkspaces godoc
// @Summary List all workspaces
// @Description List all workspaces and their stats as an admin
// @Tags Admin
// @Security CookieAuth
// @ID adminListWorkspaces
// @Produce json
// @Success 200 {array} WorkspaceStats
// @Failure 500 {object} ErrorResponse "Failed to list workspaces"
// @Failure 500 {object} ErrorResponse "Failed to get user"
// @Failure 500 {object} ErrorResponse "Failed to get file stats"
// @Router /admin/workspaces [get]
func (h *Handler) AdminListWorkspaces() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		workspaces, err := h.DB.GetAllWorkspaces()
		if err != nil {
			respondError(w, "Failed to list workspaces", http.StatusInternalServerError)
			return
		}

		workspacesStats := make([]*WorkspaceStats, 0, len(workspaces))

		for _, ws := range workspaces {

			workspaceData := &WorkspaceStats{}

			user, err := h.DB.GetUserByID(ws.UserID)
			if err != nil {
				respondError(w, "Failed to get user", http.StatusInternalServerError)
				return
			}

			workspaceData.UserID = ws.UserID
			workspaceData.UserEmail = user.Email
			workspaceData.WorkspaceID = ws.ID
			workspaceData.WorkspaceName = ws.Name
			workspaceData.WorkspaceCreatedAt = ws.CreatedAt

			fileStats, err := h.Storage.GetFileStats(ws.UserID, ws.ID)
			if err != nil {
				respondError(w, "Failed to get file stats", http.StatusInternalServerError)
				return
			}

			workspaceData.FileCountStats = fileStats

			workspacesStats = append(workspacesStats, workspaceData)
		}

		respondJSON(w, workspacesStats)
	}
}

// AdminGetSystemStats godoc
// @Summary Get system statistics
// @Description Get system-wide statistics as an admin
// @Tags Admin
// @Security CookieAuth
// @ID adminGetSystemStats
// @Produce json
// @Success 200 {object} SystemStats
// @Failure 500 {object} ErrorResponse "Failed to get user stats"
// @Failure 500 {object} ErrorResponse "Failed to get file stats"
// @Router /admin/stats [get]
func (h *Handler) AdminGetSystemStats() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		userStats, err := h.DB.GetSystemStats()
		if err != nil {
			respondError(w, "Failed to get user stats", http.StatusInternalServerError)
			return
		}

		fileStats, err := h.Storage.GetTotalFileStats()
		if err != nil {
			respondError(w, "Failed to get file stats", http.StatusInternalServerError)
			return
		}

		stats := &SystemStats{
			UserStats:      userStats,
			FileCountStats: fileStats,
		}

		respondJSON(w, stats)
	}
}
