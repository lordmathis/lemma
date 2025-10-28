package handlers

import (
	"encoding/json"
	"net/http"

	"lemma/internal/context"
	"lemma/internal/logging"

	"golang.org/x/crypto/bcrypt"
)

// UpdateProfileRequest represents a user profile update request
type UpdateProfileRequest struct {
	DisplayName     string `json:"displayName"`
	Email           string `json:"email"`
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
	Theme           string `json:"theme"`
}

// DeleteAccountRequest represents a user account deletion request
type DeleteAccountRequest struct {
	Password string `json:"password"`
}

func getProfileLogger() logging.Logger {
	return getHandlersLogger().WithGroup("profile")
}

// UpdateProfile godoc
// @Summary Update profile
// @Description Updates the user's profile
// @Tags users
// @ID updateProfile
// @Security CookieAuth
// @Accept json
// @Produce json
// @Param body body UpdateProfileRequest true "Profile update request"
// @Success 200 {object} models.User
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 400 {object} ErrorResponse "Current password is required to change password"
// @Failure 400 {object} ErrorResponse "New password must be at least 8 characters long"
// @Failure 400 {object} ErrorResponse "Current password is required to change email"
// @Failure 401 {object} ErrorResponse "Current password is incorrect"
// @Failure 404 {object} ErrorResponse "User not found"
// @Failure 409 {object} ErrorResponse "Email already in use"
// @Failure 500 {object} ErrorResponse "Failed to process new password"
// @Failure 500 {object} ErrorResponse "Failed to update profile"
// @Router /profile [put]
func (h *Handler) UpdateProfile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getProfileLogger().With(
			"handler", "UpdateProfile",
			"userID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		var req UpdateProfileRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Debug("failed to decode request body",
				"error", err.Error(),
			)
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Get current user
		user, err := h.DB.GetUserByID(ctx.UserID)
		if err != nil {
			log.Error("failed to fetch user from database",
				"error", err.Error(),
			)
			respondError(w, "User not found", http.StatusNotFound)
			return
		}

		// Track what's being updated for logging
		updates := make(map[string]bool)

		// Handle password update if requested
		if req.NewPassword != "" {
			if req.CurrentPassword == "" {
				log.Debug("password change attempted without current password")
				respondError(w, "Current password is required to change password", http.StatusBadRequest)
				return
			}

			if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
				log.Warn("incorrect password provided for password change")
				respondError(w, "Current password is incorrect", http.StatusUnauthorized)
				return
			}

			if len(req.NewPassword) < 8 {
				log.Debug("password change rejected - too short",
					"passwordLength", len(req.NewPassword),
				)
				respondError(w, "New password must be at least 8 characters long", http.StatusBadRequest)
				return
			}

			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
			if err != nil {
				log.Error("failed to hash new password",
					"error", err.Error(),
				)
				respondError(w, "Failed to process new password", http.StatusInternalServerError)
				return
			}
			user.PasswordHash = string(hashedPassword)
			updates["passwordChanged"] = true
		}

		// Handle email update if requested
		if req.Email != "" && req.Email != user.Email {
			if req.CurrentPassword == "" {
				log.Warn("attempted email change without current password")
				respondError(w, "Current password is required to change email", http.StatusBadRequest)
				return
			}

			if req.NewPassword == "" {
				if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
					log.Warn("incorrect password provided for email change")
					respondError(w, "Current password is incorrect", http.StatusUnauthorized)
					return
				}
			}

			existingUser, err := h.DB.GetUserByEmail(req.Email)
			if err == nil && existingUser.ID != user.ID {
				log.Debug("email change rejected - already in use",
					"requestedEmail", req.Email,
				)
				respondError(w, "Email already in use", http.StatusConflict)
				return
			}
			user.Email = req.Email
			updates["emailChanged"] = true
		}

		// Update display name if provided
		if req.DisplayName != "" {
			user.DisplayName = req.DisplayName
			updates["displayNameChanged"] = true
		}

		// Update theme if provided
		if req.Theme != "" {
			// Validate theme value, fallback to "dark" if invalid
			if req.Theme != "light" && req.Theme != "dark" {
				log.Debug("invalid theme value, falling back to dark",
					"theme", req.Theme,
				)
				req.Theme = "dark"
			}
			user.Theme = req.Theme
			updates["themeChanged"] = true
		}

		// Update user in database
		if err := h.DB.UpdateUser(user); err != nil {
			log.Error("failed to update user in database",
				"error", err.Error(),
				"updates", updates,
			)
			respondError(w, "Failed to update profile", http.StatusInternalServerError)
			return
		}

		respondJSON(w, user)
	}
}

// DeleteAccount godoc
// @Summary Delete account
// @Description Deletes the user's account and all associated data
// @Tags users
// @ID deleteAccount
// @Security CookieAuth
// @Accept json
// @Produce json
// @Param body body DeleteAccountRequest true "Account deletion request"
// @Success 204 "No Content - Account deleted successfully"
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 401 {object} ErrorResponse "Password is incorrect"
// @Failure 403 {object} ErrorResponse "Cannot delete the last admin account"
// @Failure 404 {object} ErrorResponse "User not found"
// @Failure 500 {object} ErrorResponse "Failed to verify admin status"
// @Failure 500 {object} ErrorResponse "Failed to delete account"
// @Router /profile [delete]
func (h *Handler) DeleteAccount() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getProfileLogger().With(
			"handler", "DeleteAccount",
			"userID", ctx.UserID,
			"clientIP", r.RemoteAddr,
		)

		var req DeleteAccountRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Debug("failed to decode request body",
				"error", err.Error(),
			)
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Get current user
		user, err := h.DB.GetUserByID(ctx.UserID)
		if err != nil {
			log.Error("failed to fetch user from database",
				"error", err.Error(),
			)
			respondError(w, "User not found", http.StatusNotFound)
			return
		}

		// Verify password
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			log.Warn("incorrect password provided for account deletion")
			respondError(w, "Incorrect password", http.StatusUnauthorized)
			return
		}

		// Prevent admin from deleting their own account if they're the last admin
		if user.Role == "admin" {
			adminCount, err := h.DB.CountAdminUsers()
			if err != nil {
				log.Error("failed to count admin users",
					"error", err.Error(),
				)
				respondError(w, "Failed to get admin count", http.StatusInternalServerError)
				return
			}
			if adminCount <= 1 {
				log.Warn("attempted to delete last admin account")
				respondError(w, "Cannot delete the last admin account", http.StatusForbidden)
				return
			}
		}

		// Get user's workspaces for cleanup
		workspaces, err := h.DB.GetWorkspacesByUserID(ctx.UserID)
		if err != nil {
			log.Error("failed to fetch user workspaces",
				"error", err.Error(),
			)
			respondError(w, "Failed to get user workspaces", http.StatusInternalServerError)
			return
		}

		// Delete workspace directories
		for _, workspace := range workspaces {
			if err := h.Storage.DeleteUserWorkspace(ctx.UserID, workspace.ID); err != nil {
				log.Error("failed to delete workspace directory",
					"error", err.Error(),
					"workspaceID", workspace.ID,
				)
				respondError(w, "Failed to delete workspace files", http.StatusInternalServerError)
				return
			}
			log.Debug("workspace deleted",
				"workspaceID", workspace.ID,
			)
		}

		// Delete user from database
		if err := h.DB.DeleteUser(ctx.UserID); err != nil {
			log.Error("failed to delete user from database",
				"error", err.Error(),
			)
			respondError(w, "Failed to delete account", http.StatusInternalServerError)
			return
		}

		log.Info("user account deleted",
			"email", user.Email,
			"role", user.Role,
		)
		w.WriteHeader(http.StatusNoContent)
	}
}
