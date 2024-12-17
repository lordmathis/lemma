// Package handlers contains the request handlers for the api routes.
package handlers

import (
	"encoding/json"
	"net/http"
	"novamd/internal/context"
	"novamd/internal/db"
	"novamd/internal/logging"
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

func getAdminLogger() logging.Logger {
	return getHandlersLogger().WithGroup("admin")
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
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getAdminLogger().With(
			"handler", "AdminListUsers",
			"adminID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		users, err := h.DB.GetAllUsers()
		if err != nil {
			log.Error("failed to fetch users from database",
				"error", err.Error(),
			)
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
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getAdminLogger().With(
			"handler", "AdminCreateUser",
			"adminID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		var req CreateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Debug("failed to decode request body",
				"error", err.Error(),
			)
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validation logging
		if req.Email == "" || req.Password == "" || req.Role == "" {
			log.Debug("missing required fields",
				"hasEmail", req.Email != "",
				"hasPassword", req.Password != "",
				"hasRole", req.Role != "",
			)
			respondError(w, "Email, password, and role are required", http.StatusBadRequest)
			return
		}

		// Email existence check
		existingUser, err := h.DB.GetUserByEmail(req.Email)
		if err == nil && existingUser != nil {
			log.Warn("attempted to create user with existing email",
				"email", req.Email,
			)
			respondError(w, "Email already exists", http.StatusConflict)
			return
		}

		if len(req.Password) < 8 {
			log.Debug("password too short",
				"passwordLength", len(req.Password),
			)
			respondError(w, "Password must be at least 8 characters", http.StatusBadRequest)
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Error("failed to hash password",
				"error", err.Error(),
			)
			respondError(w, "Failed to hash password", http.StatusInternalServerError)
			return
		}

		user := &models.User{
			Email:        req.Email,
			DisplayName:  req.DisplayName,
			PasswordHash: string(hashedPassword),
			Role:         req.Role,
		}

		insertedUser, err := h.DB.CreateUser(user)
		if err != nil {
			log.Error("failed to create user in database",
				"error", err.Error(),
				"email", req.Email,
				"role", req.Role,
			)
			respondError(w, "Failed to create user", http.StatusInternalServerError)
			return
		}

		if err := h.Storage.InitializeUserWorkspace(insertedUser.ID, insertedUser.LastWorkspaceID); err != nil {
			log.Error("failed to initialize user workspace",
				"error", err.Error(),
				"userID", insertedUser.ID,
				"workspaceID", insertedUser.LastWorkspaceID,
			)
			respondError(w, "Failed to initialize user workspace", http.StatusInternalServerError)
			return
		}

		log.Info("user created",
			"newUserID", insertedUser.ID,
			"email", insertedUser.Email,
			"role", insertedUser.Role,
		)
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
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getAdminLogger().With(
			"handler", "AdminGetUser",
			"adminID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		userID, err := strconv.Atoi(chi.URLParam(r, "userId"))
		if err != nil {
			log.Debug("invalid user ID format",
				"userIDParam", chi.URLParam(r, "userId"),
				"error", err.Error(),
			)
			respondError(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		user, err := h.DB.GetUserByID(userID)
		if err != nil {
			log.Debug("user not found",
				"targetUserID", userID,
				"error", err.Error(),
			)
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
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getAdminLogger().With(
			"handler", "AdminUpdateUser",
			"adminID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		userID, err := strconv.Atoi(chi.URLParam(r, "userId"))
		if err != nil {
			log.Debug("invalid user ID format",
				"userIDParam", chi.URLParam(r, "userId"),
				"error", err.Error(),
			)
			respondError(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		user, err := h.DB.GetUserByID(userID)
		if err != nil {
			log.Debug("user not found",
				"targetUserID", userID,
				"error", err.Error(),
			)
			respondError(w, "User not found", http.StatusNotFound)
			return
		}

		var req UpdateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Debug("failed to decode request body",
				"error", err.Error(),
			)
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Track what's being updated for logging
		updates := make(map[string]interface{})

		if req.Email != "" {
			user.Email = req.Email
			updates["email"] = req.Email
		}
		if req.DisplayName != "" {
			user.DisplayName = req.DisplayName
			updates["displayName"] = req.DisplayName
		}
		if req.Role != "" {
			user.Role = req.Role
			updates["role"] = req.Role
		}
		if req.Password != "" {
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
			if err != nil {
				log.Error("failed to hash password",
					"error", err.Error(),
				)
				respondError(w, "Failed to hash password", http.StatusInternalServerError)
				return
			}
			user.PasswordHash = string(hashedPassword)
			updates["passwordUpdated"] = true
		}

		if err := h.DB.UpdateUser(user); err != nil {
			log.Error("failed to update user in database",
				"error", err.Error(),
				"targetUserID", userID,
			)
			respondError(w, "Failed to update user", http.StatusInternalServerError)
			return
		}

		log.Info("user updated",
			"targetUserID", userID,
			"updates", updates,
		)
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
		log := getAdminLogger().With(
			"handler", "AdminDeleteUser",
			"adminID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		userID, err := strconv.Atoi(chi.URLParam(r, "userId"))
		if err != nil {
			log.Debug("invalid user ID format",
				"userIDParam", chi.URLParam(r, "userId"),
				"error", err.Error(),
			)
			respondError(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		if userID == ctx.UserID {
			log.Warn("admin attempted to delete own account")
			respondError(w, "Cannot delete your own account", http.StatusBadRequest)
			return
		}

		user, err := h.DB.GetUserByID(userID)
		if err != nil {
			log.Debug("user not found",
				"targetUserID", userID,
				"error", err.Error(),
			)
			respondError(w, "User not found", http.StatusNotFound)
			return
		}

		if user.Role == models.RoleAdmin && ctx.UserID != userID {
			log.Warn("attempted to delete another admin user",
				"targetUserID", userID,
				"targetUserEmail", user.Email,
			)
			respondError(w, "Cannot delete other admin users", http.StatusForbidden)
			return
		}

		if err := h.DB.DeleteUser(userID); err != nil {
			log.Error("failed to delete user from database",
				"error", err.Error(),
				"targetUserID", userID,
			)
			respondError(w, "Failed to delete user", http.StatusInternalServerError)
			return
		}

		log.Info("user deleted",
			"targetUserID", userID,
			"targetUserEmail", user.Email,
			"targetUserRole", user.Role,
		)
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
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getAdminLogger().With(
			"handler", "AdminListWorkspaces",
			"adminID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		workspaces, err := h.DB.GetAllWorkspaces()
		if err != nil {
			log.Error("failed to fetch workspaces from database",
				"error", err.Error(),
			)
			respondError(w, "Failed to list workspaces", http.StatusInternalServerError)
			return
		}

		workspacesStats := make([]*WorkspaceStats, 0, len(workspaces))

		for _, ws := range workspaces {
			workspaceData := &WorkspaceStats{}

			user, err := h.DB.GetUserByID(ws.UserID)
			if err != nil {
				log.Error("failed to fetch user for workspace",
					"error", err.Error(),
					"workspaceID", ws.ID,
					"userID", ws.UserID,
				)
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
				log.Error("failed to fetch file stats for workspace",
					"error", err.Error(),
					"workspaceID", ws.ID,
					"userID", ws.UserID,
				)
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
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getAdminLogger().With(
			"handler", "AdminGetSystemStats",
			"adminID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		userStats, err := h.DB.GetSystemStats()
		if err != nil {
			log.Error("failed to fetch user statistics",
				"error", err.Error(),
			)
			respondError(w, "Failed to get user stats", http.StatusInternalServerError)
			return
		}

		fileStats, err := h.Storage.GetTotalFileStats()
		if err != nil {
			log.Error("failed to fetch file statistics",
				"error", err.Error(),
			)
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
