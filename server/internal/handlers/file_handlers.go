package handlers

import (
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"lemma/internal/context"
	"lemma/internal/logging"
	"lemma/internal/storage"
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

func getFilesLogger() logging.Logger {
	return getHandlersLogger().WithGroup("files")
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
		log := getFilesLogger().With(
			"handler", "ListFiles",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		files, err := h.Storage.ListFilesRecursively(ctx.UserID, ctx.Workspace.ID)
		if err != nil {
			log.Error("failed to list files in workspace",
				"error", err.Error(),
			)
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
		log := getFilesLogger().With(
			"handler", "LookupFileByName",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		filename := r.URL.Query().Get("filename")
		if filename == "" {
			log.Debug("missing filename parameter")
			respondError(w, "Filename is required", http.StatusBadRequest)
			return
		}

		// URL-decode the filename
		decodedFilename, err := url.PathUnescape(filename)
		if err != nil {
			log.Error("failed to decode filename",
				"filename", filename,
				"error", err.Error(),
			)
			respondError(w, "Invalid filename", http.StatusBadRequest)
			return
		}

		filePaths, err := h.Storage.FindFileByName(ctx.UserID, ctx.Workspace.ID, decodedFilename)
		if err != nil {
			if !os.IsNotExist(err) {
				log.Error("failed to lookup file",
					"filename", filename,
					"error", err.Error(),
				)
			} else {
				log.Debug("file not found",
					"filename", filename,
				)
			}
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
// @Param file_path query string true "File path"
// @Success 200 {string} string "Raw file content"
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 404 {object} ErrorResponse "File not found"
// @Failure 500 {object} ErrorResponse "Failed to read file"
// @Failure 500 {object} ErrorResponse "Failed to write response"
// @Router /workspaces/{workspace_name}/files/content [get]
func (h *Handler) GetFileContent() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getFilesLogger().With(
			"handler", "GetFileContent",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		filePath := r.URL.Query().Get("file_path")
		decodedPath, err := url.PathUnescape(filePath)
		if err != nil {
			log.Error("failed to decode file path",
				"filePath", filePath,
				"error", err.Error(),
			)
			respondError(w, "Invalid file path", http.StatusBadRequest)
			return
		}

		content, err := h.Storage.GetFileContent(ctx.UserID, ctx.Workspace.ID, decodedPath)
		if err != nil {
			if storage.IsPathValidationError(err) {
				log.Error("invalid file path attempted",
					"filePath", decodedPath,
					"error", err.Error(),
				)
				respondError(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			if os.IsNotExist(err) {
				log.Debug("file not found",
					"filePath", decodedPath,
				)
				respondError(w, "File not found", http.StatusNotFound)
				return
			}

			log.Error("failed to read file content",
				"filePath", filePath,
				"error", err.Error(),
			)
			respondError(w, "Failed to read file", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		_, err = w.Write(content)
		if err != nil {
			log.Error("failed to write response",
				"filePath", filePath,
				"error", err.Error(),
			)
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
// @Param file_path query string true "File path"
// @Success 200 {object} SaveFileResponse
// @Failure 400 {object} ErrorResponse "Failed to read request body"
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 500 {object} ErrorResponse "Failed to save file"
// @Router /workspaces/{workspace_name}/files/ [post]
func (h *Handler) SaveFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getFilesLogger().With(
			"handler", "SaveFile",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		filePath := r.URL.Query().Get("file_path")
		// URL-decode the file path
		decodedPath, err := url.PathUnescape(filePath)
		if err != nil {
			log.Error("failed to decode file path",
				"filePath", filePath,
				"error", err.Error(),
			)
			respondError(w, "Invalid file path", http.StatusBadRequest)
			return
		}

		content, err := io.ReadAll(r.Body)
		if err != nil {
			log.Error("failed to read request body",
				"filePath", decodedPath,
				"error", err.Error(),
			)
			respondError(w, "Failed to read request body", http.StatusBadRequest)
			return
		}

		err = h.Storage.SaveFile(ctx.UserID, ctx.Workspace.ID, decodedPath, content)
		if err != nil {
			if storage.IsPathValidationError(err) {
				log.Error("invalid file path attempted",
					"filePath", decodedPath,
					"error", err.Error(),
				)
				respondError(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			log.Error("failed to save file",
				"filePath", filePath,
				"contentSize", len(content),
				"error", err.Error(),
			)
			respondError(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		response := SaveFileResponse{
			FilePath:  filePath,
			Size:      int64(len(content)),
			UpdatedAt: time.Now().UTC(),
		}

		respondJSON(w, response)
	}
}

// UploadFile godoc
// @Summary Upload file
// @Description Uploads a file to the user's workspace
// @Tags files
// @ID uploadFile
// @Security CookieAuth
// @Accept multipart/form-data
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param file_path query string true "Directory path"
// @Param file formData file true "File to upload"
// @Success 200 {object} SaveFileResponse
// @Failure 400 {object} ErrorResponse "Failed to get file from form"
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 500 {object} ErrorResponse "Failed to read uploaded file"
// @Failure 500 {object} ErrorResponse "Failed to save file"
// @Router /workspaces/{workspace_name}/files/upload/ [post]
func (h *Handler) UploadFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getFilesLogger().With(
			"handler", "UploadFile",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		file, header, err := r.FormFile("file")
		if err != nil {
			log.Error("failed to get file from form",
				"error", err.Error(),
			)
			respondError(w, "Failed to get file from form", http.StatusBadRequest)
			return
		}
		defer func() {
			if err := file.Close(); err != nil {
				log.Error("failed to close uploaded file",
					"error", err.Error(),
				)
			}
		}()

		filePath := r.URL.Query().Get("file_path")
		if filePath == "" {
			log.Debug("missing file_path parameter")
			respondError(w, "file_path is required", http.StatusBadRequest)
			return
		}

		decodedPath, err := url.PathUnescape(filePath)
		if err != nil {
			log.Error("failed to decode file path",
				"filePath", filePath,
				"error", err.Error(),
			)
			respondError(w, "Invalid file path", http.StatusBadRequest)
			return
		}
		decodedPath = decodedPath + "/" + header.Filename

		content := make([]byte, header.Size)
		_, err = file.Read(content)
		if err != nil && err != io.EOF {
			log.Error("failed to read uploaded file",
				"filePath", decodedPath,
				"error", err.Error(),
			)
			respondError(w, "Failed to read uploaded file", http.StatusInternalServerError)
			return
		}

		err = h.Storage.SaveFile(ctx.UserID, ctx.Workspace.ID, decodedPath, content)
		if err != nil {
			if storage.IsPathValidationError(err) {
				log.Error("invalid file path attempted",
					"filePath", decodedPath,
					"error", err.Error(),
				)
				respondError(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			log.Error("failed to save file",
				"filePath", decodedPath,
				"contentSize", len(content),
				"error", err.Error(),
			)
			respondError(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		response := SaveFileResponse{
			FilePath:  decodedPath,
			Size:      int64(len(content)),
			UpdatedAt: time.Now().UTC(),
		}
		respondJSON(w, response)
	}
}

// MoveFile godoc
// @Summary Move file
// @Description Moves a file to a new location in the user's workspace
// @Tags files
// @ID moveFile
// @Security CookieAuth
// @Param workspace_name path string true "Workspace name"
// @Param src_path query string true "Source file path"
// @Param dest_path query string true "Destination file path"
// @Success 204 "No Content - File moved successfully"
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 404 {object} ErrorResponse "File not found"
// @Failure 500 {object} ErrorResponse "Failed to move file"
// @Router /workspaces/{workspace_name}/files/move [post]
func (h *Handler) MoveFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getFilesLogger().With(
			"handler", "MoveFile",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		srcPath := r.URL.Query().Get("src_path")
		destPath := r.URL.Query().Get("dest_path")
		if srcPath == "" || destPath == "" {
			log.Debug("missing src_path or dest_path parameter")
			respondError(w, "src_path and dest_path are required", http.StatusBadRequest)
			return
		}

		// URL-decode the source and destination paths
		decodedSrcPath, err := url.PathUnescape(srcPath)
		if err != nil {
			log.Error("failed to decode source file path",
				"srcPath", srcPath,
				"error", err.Error(),
			)
			respondError(w, "Invalid source file path", http.StatusBadRequest)
			return
		}

		decodedDestPath, err := url.PathUnescape(destPath)
		if err != nil {
			log.Error("failed to decode destination file path",
				"destPath", destPath,
				"error", err.Error(),
			)
			respondError(w, "Invalid destination file path", http.StatusBadRequest)
			return
		}

		err = h.Storage.MoveFile(ctx.UserID, ctx.Workspace.ID, decodedSrcPath, decodedDestPath)
		if err != nil {
			if storage.IsPathValidationError(err) {
				log.Error("invalid file path attempted",
					"srcPath", decodedSrcPath,
					"destPath", decodedDestPath,
					"error", err.Error(),
				)
				respondError(w, "Invalid file path", http.StatusBadRequest)
				return
			}
			if os.IsNotExist(err) {
				log.Debug("file not found",
					"srcPath", decodedSrcPath,
				)
				respondError(w, "File not found", http.StatusNotFound)
				return
			}
			log.Error("failed to move file",
				"srcPath", decodedSrcPath,
				"destPath", decodedDestPath,
				"error", err.Error(),
			)
			respondError(w, "Failed to move file", http.StatusInternalServerError)
			return
		}

		response := SaveFileResponse{
			FilePath:  decodedDestPath,
			Size:      -1, // Size is not applicable for move operation
			UpdatedAt: time.Now().UTC(),
		}
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
// @Param file_path query string true "File path"
// @Success 204 "No Content - File deleted successfully"
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 404 {object} ErrorResponse "File not found"
// @Failure 500 {object} ErrorResponse "Failed to delete file"
// @Router /workspaces/{workspace_name}/files/ [delete]
func (h *Handler) DeleteFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := context.GetRequestContext(w, r)
		if !ok {
			return
		}
		log := getFilesLogger().With(
			"handler", "DeleteFile",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		filePath := r.URL.Query().Get("file_path")
		if filePath == "" {
			log.Debug("missing file_path parameter")
			respondError(w, "file_path is required", http.StatusBadRequest)
			return
		}

		// URL-decode the file path
		decodedPath, err := url.PathUnescape(filePath)
		if err != nil {
			log.Error("failed to decode file path",
				"filePath", filePath,
				"error", err.Error(),
			)
			respondError(w, "Invalid file path", http.StatusBadRequest)
			return
		}

		err = h.Storage.DeleteFile(ctx.UserID, ctx.Workspace.ID, decodedPath)
		if err != nil {
			if storage.IsPathValidationError(err) {
				log.Error("invalid file path attempted",
					"filePath", decodedPath,
					"error", err.Error(),
				)
				respondError(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			if os.IsNotExist(err) {
				log.Debug("file not found",
					"filePath", decodedPath,
				)
				respondError(w, "File not found", http.StatusNotFound)
				return
			}

			log.Error("failed to delete file",
				"filePath", filePath,
				"error", err.Error(),
			)
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
		log := getFilesLogger().With(
			"handler", "GetLastOpenedFile",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		filePath, err := h.DB.GetLastOpenedFile(ctx.Workspace.ID)
		if err != nil {
			log.Error("failed to get last opened file from database",
				"error", err.Error(),
			)
			respondError(w, "Failed to get last opened file", http.StatusInternalServerError)
			return
		}

		if _, err := h.Storage.ValidatePath(ctx.UserID, ctx.Workspace.ID, filePath); err != nil {
			log.Error("invalid file path stored",
				"filePath", filePath,
				"error", err.Error(),
			)
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
// @Param file_path query string true "File path"
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
		log := getFilesLogger().With(
			"handler", "UpdateLastOpenedFile",
			"userID", ctx.UserID,
			"workspaceID", ctx.Workspace.ID,
			"clientIP", r.RemoteAddr,
		)

		filePath := r.URL.Query().Get("file_path")
		if filePath == "" {
			log.Debug("missing file_path parameter")
			respondError(w, "file_path is required", http.StatusBadRequest)
			return
		}

		decodedPath, err := url.PathUnescape(filePath)
		if err != nil {
			log.Error("failed to decode file path",
				"filePath", filePath,
				"error", err.Error(),
			)
			respondError(w, "Invalid file path", http.StatusBadRequest)
			return
		}

		_, err = h.Storage.GetFileContent(ctx.UserID, ctx.Workspace.ID, decodedPath)
		if err != nil {
			if storage.IsPathValidationError(err) {
				log.Error("invalid file path attempted",
					"filePath", decodedPath,
					"error", err.Error(),
				)
				respondError(w, "Invalid file path", http.StatusBadRequest)
				return
			}

			if os.IsNotExist(err) {
				log.Debug("file not found",
					"filePath", decodedPath,
				)
				respondError(w, "File not found", http.StatusNotFound)
				return
			}

			log.Error("failed to validate file path",
				"filePath", decodedPath,
				"error", err.Error(),
			)
			respondError(w, "Failed to update last opened file", http.StatusInternalServerError)
			return
		}

		if err := h.DB.UpdateLastOpenedFile(ctx.Workspace.ID, decodedPath); err != nil {
			log.Error("failed to update last opened file in database",
				"filePath", decodedPath,
				"error", err.Error(),
			)
			respondError(w, "Failed to update last opened file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
