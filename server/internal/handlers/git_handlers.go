package handlers

import (
	"encoding/json"
	"net/http"

	"novamd/internal/context"
)

// CommitRequest represents a request to commit changes
type CommitRequest struct {
	Message string `json:"message" example:"Initial commit"`
}

// CommitResponse represents a response to a commit request
type CommitResponse struct {
	CommitHash string `json:"commitHash" example:"a1b2c3d4"`
}

// PullResponse represents a response to a pull http request
type PullResponse struct {
	Message string `json:"message" example:"Pulled changes from remote"`
}

// StageCommitAndPush godoc
// @Summary Stage, commit, and push changes
// @Description Stages, commits, and pushes changes to the remote repository
// @Tags git
// @ID stageCommitAndPush
// @Security BearerAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param body body CommitRequest true "Commit request"
// @Success 200 {object} CommitResponse
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 400 {object} ErrorResponse "Commit message is required"
// @Failure 500 {object} ErrorResponse "Failed to stage, commit, and push changes"
// @Router /workspaces/{workspace_name}/git/commit [post]
func (h *Handler) StageCommitAndPush() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		var requestBody CommitRequest

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if requestBody.Message == "" {
			respondError(w, "Commit message is required", http.StatusBadRequest)
			return
		}

		hash, err := h.Storage.StageCommitAndPush(ctx.UserID, ctx.Workspace.ID, requestBody.Message)
		if err != nil {
			respondError(w, "Failed to stage, commit, and push changes: "+err.Error(), http.StatusInternalServerError)
			return
		}

		respondJSON(w, CommitResponse{CommitHash: hash.String()})
	}
}

// PullChanges godoc
// @Summary Pull changes from remote
// @Description Pulls changes from the remote repository
// @Tags git
// @ID pullChanges
// @Security BearerAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {object} PullResponse
// @Failure 500 {object} ErrorResponse "Failed to pull changes"
// @Router /workspaces/{workspace_name}/git/pull [post]
func (h *Handler) PullChanges() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		err := h.Storage.Pull(ctx.UserID, ctx.Workspace.ID)
		if err != nil {
			respondError(w, "Failed to pull changes: "+err.Error(), http.StatusInternalServerError)
			return
		}

		respondJSON(w, PullResponse{Message: "Successfully pulled changes from remote"})
	}
}
