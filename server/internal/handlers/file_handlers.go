package handlers

import (
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
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

// UploadFilesResponse represents a response to an upload files request
type UploadFilesResponse struct {
	FilePaths []string `json:"filePaths"`
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

		// Detect MIME type based on file extension
		contentType := mime.TypeByExtension(filepath.Ext(decodedPath))
		if contentType == "" {
			// Fallback to text/plain if MIME type cannot be determined
			contentType = "text/plain"
		}
		w.Header().Set("Content-Type", contentType)
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
// @Summary Upload files
// @Description Uploads one or more files to the user's workspace
// @Tags files
// @ID uploadFile
// @Security CookieAuth
// @Accept multipart/form-data
// @Produce json
// @Param workspace_name path string true "Workspace name"
// @Param file_path query string true "Directory path"
// @Param files formData file true "Files to upload"
// @Success 200 {object} UploadFilesResponse
// @Failure 400 {object} ErrorResponse "No files found in form"
// @Failure 400 {object} ErrorResponse "file_path is required"
// @Failure 400 {object} ErrorResponse "Invalid file path"
// @Failure 400 {object} ErrorResponse "Empty file uploaded"
// @Failure 400 {object} ErrorResponse "Failed to get file from form"
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

		// Parse multipart form (max 32MB in memory)
		err := r.ParseMultipartForm(32 << 20)
		if err != nil {
			log.Error("failed to parse multipart form",
				"error", err.Error(),
			)
			respondError(w, "Failed to parse form", http.StatusBadRequest)
			return
		}

		form := r.MultipartForm
		if form == nil || len(form.File) == 0 {
			log.Debug("no files found in form")
			respondError(w, "No files found in form", http.StatusBadRequest)
			return
		}

		uploadPath := r.URL.Query().Get("file_path")
		decodedPath, err := url.PathUnescape(uploadPath)
		if err != nil {
			log.Error("failed to decode file path",
				"filePath", uploadPath,
				"error", err.Error(),
			)
			respondError(w, "Invalid file path", http.StatusBadRequest)
			return
		}

		uploadedPaths := []string{}

		for _, formFile := range form.File["files"] {

			if formFile.Filename == "" || formFile.Size == 0 {
				log.Debug("empty file uploaded",
					"fileName", formFile.Filename,
					"fileSize", formFile.Size,
				)
				respondError(w, "Empty file uploaded", http.StatusBadRequest)
				return
			}

			// Validate file size to prevent excessive memory allocation
			// TODO: Make this configurable
			const maxFileSize = 100 * 1024 * 1024 // 100MB
			if formFile.Size > maxFileSize {
				log.Debug("file too large",
					"fileName", formFile.Filename,
					"fileSize", formFile.Size,
					"maxSize", maxFileSize,
				)
				respondError(w, "File too large", http.StatusBadRequest)
				return
			}

			// Open the uploaded file
			file, err := formFile.Open()
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

			// Use filepath.Join to properly construct the path
		filePath := filepath.Join(decodedPath, formFile.Filename)

			content, err := io.ReadAll(file)
			if err != nil {
				log.Error("failed to read uploaded file",
					"filePath", filePath,
					"error", err.Error(),
				)
				respondError(w, "Failed to read uploaded file", http.StatusInternalServerError)
				return
			}

			err = h.Storage.SaveFile(ctx.UserID, ctx.Workspace.ID, filePath, content)
			if err != nil {
				if storage.IsPathValidationError(err) {
					log.Error("invalid file path attempted",
						"filePath", filePath,
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

			uploadedPaths = append(uploadedPaths, filePath)
		}

		response := UploadFilesResponse{
			FilePaths: uploadedPaths,
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
