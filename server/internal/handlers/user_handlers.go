package handlers

import (
	"encoding/json"
	"net/http"

	"novamd/internal/context"

	"golang.org/x/crypto/bcrypt"
)

// UpdateProfileRequest represents a user profile update request
type UpdateProfileRequest struct {
	DisplayName     string `json:"displayName"`
	Email           string `json:"email"`
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// DeleteAccountRequest represents a user account deletion request
type DeleteAccountRequest struct {
	Password string `json:"password"`
}

// UpdateProfile godoc
// @Summary Update profile
// @Description Updates the user's profile
// @Tags users
// @ID updateProfile
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body UpdateProfileRequest true "Profile update request"
// @Success 200 {object} models.User
// @Failure 400 {string} string "Invalid request body"
// @Failure 400 {string} string "Current password is required to change password"
// @Failure 400 {string} string "New password must be at least 8 characters long"
// @Failure 400 {string} string "Current password is required to change email"
// @Failure 401 {string} string "Current password is incorrect"
// @Failure 404 {string} string "User not found"
// @Failure 409 {string} string "Email already in use"
// @Failure 500 {string} string "Failed to process new password"
// @Failure 500 {string} string "Failed to update profile"
// @Router /profile [put]
func (h *Handler) UpdateProfile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		var req UpdateProfileRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Get current user
		user, err := h.DB.GetUserByID(ctx.UserID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// Handle password update if requested
		if req.NewPassword != "" {
			// Current password must be provided to change password
			if req.CurrentPassword == "" {
				http.Error(w, "Current password is required to change password", http.StatusBadRequest)
				return
			}

			// Verify current password
			if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
				http.Error(w, "Current password is incorrect", http.StatusUnauthorized)
				return
			}

			// Validate new password
			if len(req.NewPassword) < 8 {
				http.Error(w, "New password must be at least 8 characters long", http.StatusBadRequest)
				return
			}

			// Hash new password
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
			if err != nil {
				http.Error(w, "Failed to process new password", http.StatusInternalServerError)
				return
			}
			user.PasswordHash = string(hashedPassword)
		}

		// Handle email update if requested
		if req.Email != "" && req.Email != user.Email {
			// Check if email change requires password verification
			if req.CurrentPassword == "" {
				http.Error(w, "Current password is required to change email", http.StatusBadRequest)
				return
			}

			// Verify current password if not already verified for password change
			if req.NewPassword == "" {
				if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
					http.Error(w, "Current password is incorrect", http.StatusUnauthorized)
					return
				}
			}

			// Check if new email is already in use
			existingUser, err := h.DB.GetUserByEmail(req.Email)
			if err == nil && existingUser.ID != user.ID {
				http.Error(w, "Email already in use", http.StatusConflict)
				return
			}
			user.Email = req.Email
		}

		// Update display name if provided (no password required)
		if req.DisplayName != "" {
			user.DisplayName = req.DisplayName
		}

		// Update user in database
		if err := h.DB.UpdateUser(user); err != nil {
			http.Error(w, "Failed to update profile", http.StatusInternalServerError)
			return
		}

		// Return updated user data
		respondJSON(w, user)
	}
}

// DeleteAccount godoc
// @Summary Delete account
// @Description Deletes the user's account and all associated data
// @Tags users
// @ID deleteAccount
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body DeleteAccountRequest true "Account deletion request"
// @Success 200 {object} map[string]string
// @Failure 400 {string} string "Invalid request body"
// @Failure 401 {string} string "Password is incorrect"
// @Failure 403 {string} string "Cannot delete the last admin account"
// @Failure 404 {string} string "User not found"
// @Failure 500 {string} string "Failed to verify admin status"
// @Failure 500 {string} string "Failed to delete account"
// @Router /profile [delete]
func (h *Handler) DeleteAccount() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		var req DeleteAccountRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Get current user
		user, err := h.DB.GetUserByID(ctx.UserID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// Verify password
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			http.Error(w, "Password is incorrect", http.StatusUnauthorized)
			return
		}

		// Prevent admin from deleting their own account if they're the last admin
		if user.Role == "admin" {
			// Count number of admin users
			adminCount, err := h.DB.CountAdminUsers()
			if err != nil {
				http.Error(w, "Failed to verify admin status", http.StatusInternalServerError)
				return
			}
			if adminCount <= 1 {
				http.Error(w, "Cannot delete the last admin account", http.StatusForbidden)
				return
			}
		}

		// Get user's workspaces for cleanup
		workspaces, err := h.DB.GetWorkspacesByUserID(ctx.UserID)
		if err != nil {
			http.Error(w, "Failed to get user workspaces", http.StatusInternalServerError)
			return
		}

		// Delete workspace directories
		for _, workspace := range workspaces {
			if err := h.Storage.DeleteUserWorkspace(ctx.UserID, workspace.ID); err != nil {
				http.Error(w, "Failed to delete workspace files", http.StatusInternalServerError)
				return
			}
		}

		// Delete user from database (this will cascade delete workspaces and sessions)
		if err := h.DB.DeleteUser(ctx.UserID); err != nil {
			http.Error(w, "Failed to delete account", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Account deleted successfully"})
	}
}
