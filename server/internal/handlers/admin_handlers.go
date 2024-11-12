package handlers

import (
	"encoding/json"
	"net/http"
	"novamd/internal/db"
	"novamd/internal/filesystem"
	"novamd/internal/httpcontext"
	"novamd/internal/models"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"
)

type createUserRequest struct {
	Email       string          `json:"email"`
	DisplayName string          `json:"displayName"`
	Password    string          `json:"password"`
	Role        models.UserRole `json:"role"`
}

type updateUserRequest struct {
	Email       string          `json:"email,omitempty"`
	DisplayName string          `json:"displayName,omitempty"`
	Password    string          `json:"password,omitempty"`
	Role        models.UserRole `json:"role,omitempty"`
}

// AdminListUsers returns a list of all users
func (h *Handler) AdminListUsers() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		users, err := h.DB.GetAllUsers()
		if err != nil {
			http.Error(w, "Failed to list users", http.StatusInternalServerError)
			return
		}

		respondJSON(w, users)
	}
}

// AdminCreateUser creates a new user
func (h *Handler) AdminCreateUser() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate request
		if req.Email == "" || req.Password == "" || req.Role == "" {
			http.Error(w, "Email, password, and role are required", http.StatusBadRequest)
			return
		}

		// Check if email already exists
		existingUser, err := h.DB.GetUserByEmail(req.Email)
		if err == nil && existingUser != nil {
			http.Error(w, "Email already exists", http.StatusConflict)
			return
		}

		// Check if password is long enough
		if len(req.Password) < 8 {
			http.Error(w, "Password must be at least 8 characters", http.StatusBadRequest)
			return
		}

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "Failed to hash password", http.StatusInternalServerError)
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
			http.Error(w, "Failed to create user", http.StatusInternalServerError)
			return
		}

		// Initialize user workspace
		if err := h.FS.InitializeUserWorkspace(insertedUser.ID, insertedUser.LastWorkspaceID); err != nil {
			http.Error(w, "Failed to initialize user workspace", http.StatusInternalServerError)
			return
		}

		respondJSON(w, insertedUser)
	}
}

// AdminGetUser gets a specific user by ID
func (h *Handler) AdminGetUser() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := strconv.Atoi(chi.URLParam(r, "userId"))
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		user, err := h.DB.GetUserByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		respondJSON(w, user)
	}
}

// AdminUpdateUser updates a specific user
func (h *Handler) AdminUpdateUser() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := strconv.Atoi(chi.URLParam(r, "userId"))
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		// Get existing user
		user, err := h.DB.GetUserByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		var req updateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
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
				http.Error(w, "Failed to hash password", http.StatusInternalServerError)
				return
			}
			user.PasswordHash = string(hashedPassword)
		}

		if err := h.DB.UpdateUser(user); err != nil {
			http.Error(w, "Failed to update user", http.StatusInternalServerError)
			return
		}

		respondJSON(w, user)
	}
}

// AdminDeleteUser deletes a specific user
func (h *Handler) AdminDeleteUser() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
		if !ok {
			return
		}

		userID, err := strconv.Atoi(chi.URLParam(r, "userId"))
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		// Prevent admin from deleting themselves
		if userID == ctx.UserID {
			http.Error(w, "Cannot delete your own account", http.StatusBadRequest)
			return
		}

		// Get user before deletion to check role
		user, err := h.DB.GetUserByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// Prevent deletion of other admin users
		if user.Role == models.RoleAdmin && ctx.UserID != userID {
			http.Error(w, "Cannot delete other admin users", http.StatusForbidden)
			return
		}

		if err := h.DB.DeleteUser(userID); err != nil {
			http.Error(w, "Failed to delete user", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// WorkspaceStats holds workspace statistics
type WorkspaceStats struct {
	UserID             int       `json:"userID"`
	UserEmail          string    `json:"userEmail"`
	WorkspaceID        int       `json:"workspaceID"`
	WorkspaceName      string    `json:"workspaceName"`
	WorkspaceCreatedAt time.Time `json:"workspaceCreatedAt"`
	*filesystem.FileCountStats
}

// AdminListWorkspaces returns a list of all workspaces and their stats
func (h *Handler) AdminListWorkspaces() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		workspaces, err := h.DB.GetAllWorkspaces()
		if err != nil {
			http.Error(w, "Failed to list workspaces", http.StatusInternalServerError)
			return
		}

		workspacesStats := make([]*WorkspaceStats, 0, len(workspaces))

		for _, ws := range workspaces {

			workspaceData := &WorkspaceStats{}

			user, err := h.DB.GetUserByID(ws.UserID)
			if err != nil {
				http.Error(w, "Failed to get user", http.StatusInternalServerError)
				return
			}

			workspaceData.UserID = ws.UserID
			workspaceData.UserEmail = user.Email
			workspaceData.WorkspaceID = ws.ID
			workspaceData.WorkspaceName = ws.Name
			workspaceData.WorkspaceCreatedAt = ws.CreatedAt

			fileStats, err := h.FS.GetFileStats(ws.UserID, ws.ID)
			if err != nil {
				http.Error(w, "Failed to get file stats", http.StatusInternalServerError)
				return
			}

			workspaceData.FileCountStats = fileStats

			workspacesStats = append(workspacesStats, workspaceData)
		}

		respondJSON(w, workspacesStats)
	}
}

// SystemStats holds system-wide statistics
type SystemStats struct {
	*db.UserStats
	*filesystem.FileCountStats
}

// AdminGetSystemStats returns system-wide statistics for admins
func (h *Handler) AdminGetSystemStats() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		userStats, err := h.DB.GetSystemStats()
		if err != nil {
			http.Error(w, "Failed to get user stats", http.StatusInternalServerError)
			return
		}

		fileStats, err := h.FS.GetTotalFileStats()
		if err != nil {
			http.Error(w, "Failed to get file stats", http.StatusInternalServerError)
			return
		}

		stats := &SystemStats{
			UserStats:      userStats,
			FileCountStats: fileStats,
		}

		respondJSON(w, stats)
	}
}
