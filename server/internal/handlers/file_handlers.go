package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"

	"novamd/internal/context"
	"novamd/internal/storage"

	"github.com/go-chi/chi/v5"
)

// ListFiles godoc
// @Summary List files
// @Description Lists all files in the user's workspace
// @Tags files
// @ID listFiles
// @Security BearerAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {array} string
// @Failure 500 {string} string "Failed to list files"
// @Router /workspaces/{workspace_name}/files [get]
func (h *Handler) ListFiles() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		files, err := h.Storage.ListFilesRecursively(ctx.UserID, ctx.Workspace.ID)
		if err != nil {
			http.Error(w, "Failed to list files", http.StatusInternalServerError)
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
// @Security BearerAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param filename query string true "File name"
// @Success 200 {object} map[string][]string
// @Failure 400 {string} string "Filename is required"
// @Failure 404 {string} string "File not found"
// @Router /workspaces/{workspace_name}/files/lookup [get]
func (h *Handler) LookupFileByName() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		filename := r.URL.Query().Get("filename")
		if filename == "" {
			http.Error(w, "Filename is required", http.StatusBadRequest)
			return
		}

		filePaths, err := h.Storage.FindFileByName(ctx.UserID, ctx.Workspace.ID, filename)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		respondJSON(w, map[string][]string{"paths": filePaths})
	}
}

// GetFileContent godoc
// @Summary Get file content
// @Description Returns the content of a file in the user's workspace
// @Tags files
// @ID getFileContent
// @Security BearerAuth
// @Produce plain
// @Param workspace_name path string true "Workspace name"
// @Param file_path path string true "File path"
// @Success 200 {string} "File content"
// @Failure 400 {string} string "Invalid file path"
// @Failure 404 {string} string "File not found"
// @Failure 500 {string} string "Failed to read file"
// @Failure 500 {string} string "Failed to write response"
// @Router /workspaces/{workspace_name}/files/* [get]
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
				http.Error(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			if os.IsNotExist(err) {
				http.Error(w, "File not found", http.StatusNotFound)
				return
			}

			http.Error(w, "Failed to read file", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		_, err = w.Write(content)
		if err != nil {
			http.Error(w, "Failed to write response", http.StatusInternalServerError)
			return
		}
	}
}

// SaveFile godoc
// @Summary Save file
// @Description Saves the content of a file in the user's workspace
// @Tags files
// @ID saveFile
// @Security BearerAuth
// @Accept plain
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param file_path path string true "File path"
// @Success 200 {string} "File saved successfully"
// @Failure 400 {string} string "Failed to read request body"
// @Failure 400 {string} string "Invalid file path"
// @Failure 500 {string} string "Failed to save file"
// @Router /workspaces/{workspace_name}/files/* [post]
func (h *Handler) SaveFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		filePath := chi.URLParam(r, "*")
		content, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read request body", http.StatusBadRequest)
			return
		}

		err = h.Storage.SaveFile(ctx.UserID, ctx.Workspace.ID, filePath, content)
		if err != nil {
			if storage.IsPathValidationError(err) {
				http.Error(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "File saved successfully"})
	}
}

// DeleteFile godoc
// @Summary Delete file
// @Description Deletes a file in the user's workspace
// @Tags files
// @ID deleteFile
// @Security BearerAuth
// @Produce string
// @Param workspace_name path string true "Workspace name"
// @Param file_path path string true "File path"
// @Success 200 {string} "File deleted successfully"
// @Failure 400 {string} string "Invalid file path"
// @Failure 404 {string} string "File not found"
// @Failure 500 {string} string "Failed to delete file"
// @Failure 500 {string} string "Failed to write response"
// @Router /workspaces/{workspace_name}/files/* [delete]
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
				http.Error(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			if os.IsNotExist(err) {
				http.Error(w, "File not found", http.StatusNotFound)
				return
			}

			http.Error(w, "Failed to delete file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		_, err = w.Write([]byte("File deleted successfully"))
		if err != nil {
			http.Error(w, "Failed to write response", http.StatusInternalServerError)
			return
		}
	}
}

// GetLastOpenedFile godoc
// @Summary Get last opened file
// @Description Returns the path of the last opened file in the user's workspace
// @Tags files
// @ID getLastOpenedFile
// @Security BearerAuth
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {object} map[string]string
// @Failure 400 {string} string "Invalid file path"
// @Failure 500 {string} string "Failed to get last opened file"
// @Router /workspaces/{workspace_name}/files/last [get]
func (h *Handler) GetLastOpenedFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		filePath, err := h.DB.GetLastOpenedFile(ctx.Workspace.ID)
		if err != nil {
			http.Error(w, "Failed to get last opened file", http.StatusInternalServerError)
			return
		}

		if _, err := h.Storage.ValidatePath(ctx.UserID, ctx.Workspace.ID, filePath); err != nil {
			http.Error(w, "Invalid file path", http.StatusBadRequest)
			return
		}

		respondJSON(w, map[string]string{"lastOpenedFilePath": filePath})
	}
}

// UpdateLastOpenedFile godoc
// @Summary Update last opened file
// @Description Updates the last opened file in the user's workspace
// @Tags files
// @ID updateLastOpenedFile
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Success 200 {object} map[string]string
// @Failure 400 {string} string "Invalid request body"
// @Failure 400 {string} string "Invalid file path"
// @Failure 404 {string} string "File not found"
// @Failure 500 {string} string "Failed to update file"
// @Router /workspaces/{workspace_name}/files/last [put]
func (h *Handler) UpdateLastOpenedFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}

		var requestBody struct {
			FilePath string `json:"filePath"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate the file path in the workspace
		if requestBody.FilePath != "" {
			_, err := h.Storage.GetFileContent(ctx.UserID, ctx.Workspace.ID, requestBody.FilePath)
			if err != nil {
				if storage.IsPathValidationError(err) {
					http.Error(w, "Invalid file path", http.StatusBadRequest)
					return
				}

				if os.IsNotExist(err) {
					http.Error(w, "File not found", http.StatusNotFound)
					return
				}

				http.Error(w, "Failed to update last opened file", http.StatusInternalServerError)
				return
			}
		}

		if err := h.DB.UpdateLastOpenedFile(ctx.Workspace.ID, requestBody.FilePath); err != nil {
			http.Error(w, "Failed to update last opened file", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Last opened file updated successfully"})
	}
}
