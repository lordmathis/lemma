package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"

	"novamd/internal/context"
	"novamd/internal/storage"

	"github.com/go-chi/chi/v5"
)

// LookupResponse represents a response to a file lookup request
type LookupResponse struct {
	Paths []string `json:"paths"`
}

// SaveFileResponse represents a response to a save file request
type SaveFileResponse struct {
	FilePath  string    `json:"filePath"`
	Size      int64     `json:"size"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// LastOpenedFileResponse represents a response to a last opened file request
type LastOpenedFileResponse struct {
	LastOpenedFilePath string `json:"lastOpenedFilePath"`
}

// UpdateLastOpenedFileRequest represents a request to update the last opened file
type UpdateLastOpenedFileRequest struct {
	FilePath string `json:"filePath"`
}

// ListFiles godoc
// @Summary List files
// @Description Lists all files in the user's workspace
// @Tags files
// @ID listFiles
// @Security CookieAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {array} storage.FileNode
// @Failure 500 {object} ErrorResponse "Failed to list files"
// @Router /workspaces/{workspace_name}/files [get]
func (h *Handler) ListFiles() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		files, err := h.Storage.ListFilesRecursively(ctx.UserID, ctx.Workspace.ID)
		if err != nil {
			respondError(w, "Failed to list files", http.StatusInternalServerError)
			return
		}

		respondJSON(w, files)
	}
}

// LookupFileByName godoc
// @Summary Lookup file by name
// @Description Returns the paths of files with the given name in the user's workspace
// @Tags files
// @ID lookupFileByName
// @Security CookieAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param filename query string true "File name"
// @Success 200 {object} LookupResponse
// @Failure 400 {object} ErrorResponse "Filename is required"
// @Failure 404 {object} ErrorResponse "File not found"
// @Router /workspaces/{workspace_name}/files/lookup [get]
func (h *Handler) LookupFileByName() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		filename := r.URL.Query().Get("filename")
		if filename == "" {
			respondError(w, "Filename is required", http.StatusBadRequest)
			return
		}

		filePaths, err := h.Storage.FindFileByName(ctx.UserID, ctx.Workspace.ID, filename)
		if err != nil {
			respondError(w, "File not found", http.StatusNotFound)
			return
		}

		respondJSON(w, &LookupResponse{Paths: filePaths})
	}
}

// GetFileContent godoc
// @Summary Get file content
// @Description Returns the content of a file in the user's workspace
// @Tags files
// @ID getFileContent
// @Security CookieAuth
// @Produce plain
// @Param workspace_name path string true "Workspace name"
// @Param file_path path string true "File path"
// @Success 200 {string} string "Raw file content"
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 404 {object} ErrorResponse "File not found"
// @Failure 500 {object} ErrorResponse "Failed to read file"
// @Failure 500 {object} ErrorResponse "Failed to write response"
// @Router /workspaces/{workspace_name}/files/{file_path} [get]
func (h *Handler) GetFileContent() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		filePath := chi.URLParam(r, "*")
		content, err := h.Storage.GetFileContent(ctx.UserID, ctx.Workspace.ID, filePath)
		if err != nil {

			if storage.IsPathValidationError(err) {
				respondError(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			if os.IsNotExist(err) {
				respondError(w, "File not found", http.StatusNotFound)
				return
			}

			respondError(w, "Failed to read file", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		_, err = w.Write(content)
		if err != nil {
			respondError(w, "Failed to write response", http.StatusInternalServerError)
			return
		}
	}
}

// SaveFile godoc
// @Summary Save file
// @Description Saves the content of a file in the user's workspace
// @Tags files
// @ID saveFile
// @Security CookieAuth
// @Accept plain
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param file_path path string true "File path"
// @Success 200 {object} SaveFileResponse
// @Failure 400 {object} ErrorResponse "Failed to read request body"
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 500 {object} ErrorResponse "Failed to save file"
// @Router /workspaces/{workspace_name}/files/{file_path} [post]
func (h *Handler) SaveFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		filePath := chi.URLParam(r, "*")
		content, err := io.ReadAll(r.Body)
		if err != nil {
			respondError(w, "Failed to read request body", http.StatusBadRequest)
			return
		}

		err = h.Storage.SaveFile(ctx.UserID, ctx.Workspace.ID, filePath, content)
		if err != nil {
			if storage.IsPathValidationError(err) {
				respondError(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			respondError(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		response := SaveFileResponse{
			FilePath:  filePath,
			Size:      int64(len(content)),
			UpdatedAt: time.Now().UTC(),
		}

		w.WriteHeader(http.StatusOK)
		respondJSON(w, response)
	}
}

// DeleteFile godoc
// @Summary Delete file
// @Description Deletes a file in the user's workspace
// @Tags files
// @ID deleteFile
// @Security CookieAuth
// @Param workspace_name path string true "Workspace name"
// @Param file_path path string true "File path"
// @Success 204 "No Content - File deleted successfully"
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 404 {object} ErrorResponse "File not found"
// @Failure 500 {object} ErrorResponse "Failed to delete file"
// @Failure 500 {object} ErrorResponse "Failed to write response"
// @Router /workspaces/{workspace_name}/files/{file_path} [delete]
func (h *Handler) DeleteFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		filePath := chi.URLParam(r, "*")
		err := h.Storage.DeleteFile(ctx.UserID, ctx.Workspace.ID, filePath)
		if err != nil {
			if storage.IsPathValidationError(err) {
				respondError(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			if os.IsNotExist(err) {
				respondError(w, "File not found", http.StatusNotFound)
				return
			}

			respondError(w, "Failed to delete file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// GetLastOpenedFile godoc
// @Summary Get last opened file
// @Description Returns the path of the last opened file in the user's workspace
// @Tags files
// @ID getLastOpenedFile
// @Security CookieAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {object} LastOpenedFileResponse
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 500 {object} ErrorResponse "Failed to get last opened file"
// @Router /workspaces/{workspace_name}/files/last [get]
func (h *Handler) GetLastOpenedFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		filePath, err := h.DB.GetLastOpenedFile(ctx.Workspace.ID)
		if err != nil {
			respondError(w, "Failed to get last opened file", http.StatusInternalServerError)
			return
		}

		if _, err := h.Storage.ValidatePath(ctx.UserID, ctx.Workspace.ID, filePath); err != nil {
			respondError(w, "Invalid file path", http.StatusBadRequest)
			return
		}

		respondJSON(w, &LastOpenedFileResponse{LastOpenedFilePath: filePath})
	}
}

// UpdateLastOpenedFile godoc
// @Summary Update last opened file
// @Description Updates the last opened file in the user's workspace
// @Tags files
// @ID updateLastOpenedFile
// @Security CookieAuth
// @Accept json
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param body body UpdateLastOpenedFileRequest true "Update last opened file request"
// @Success 204 "No Content - Last opened file updated successfully"
// @Failure 400 {object} ErrorResponse "Invalid request body"
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 404 {object} ErrorResponse "File not found"
// @Failure 500 {object} ErrorResponse "Failed to update file"
// @Router /workspaces/{workspace_name}/files/last [put]
func (h *Handler) UpdateLastOpenedFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		var requestBody UpdateLastOpenedFileRequest

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			respondError(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate the file path in the workspace
		if requestBody.FilePath != "" {
			_, err := h.Storage.GetFileContent(ctx.UserID, ctx.Workspace.ID, requestBody.FilePath)
			if err != nil {
				if storage.IsPathValidationError(err) {
					respondError(w, "Invalid file path", http.StatusBadRequest)
					return
				}

				if os.IsNotExist(err) {
					respondError(w, "File not found", http.StatusNotFound)
					return
				}

				respondError(w, "Failed to update last opened file", http.StatusInternalServerError)
				return
			}
		}

		if err := h.DB.UpdateLastOpenedFile(ctx.Workspace.ID, requestBody.FilePath); err != nil {
			respondError(w, "Failed to update last opened file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
