package api

import (
	"encoding/json"
	"io"
	"net/http"

	"novamd/internal/db"
	"novamd/internal/filesystem"

	"github.com/go-chi/chi/v5"
)

func (h *BaseHandler) ListFiles(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		files, err := fs.ListFilesRecursively(ctx.UserID, ctx.Workspace.ID)
		if err != nil {
			http.Error(w, "Failed to list files", http.StatusInternalServerError)
			return
		}

		respondJSON(w, files)
	}
}

func (h *BaseHandler) LookupFileByName(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		filename := r.URL.Query().Get("filename")
		if filename == "" {
			http.Error(w, "Filename is required", http.StatusBadRequest)
			return
		}

		filePaths, err := fs.FindFileByName(ctx.UserID, ctx.Workspace.ID, filename)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		respondJSON(w, map[string][]string{"paths": filePaths})
	}
}

func (h *BaseHandler) GetFileContent(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		filePath := chi.URLParam(r, "*")
		content, err := fs.GetFileContent(ctx.UserID, ctx.Workspace.ID, filePath)
		if err != nil {
			http.Error(w, "Failed to read file", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		w.Write(content)
	}
}

func (h *BaseHandler) SaveFile(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		filePath := chi.URLParam(r, "*")
		content, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read request body", http.StatusBadRequest)
			return
		}

		err = fs.SaveFile(ctx.UserID, ctx.Workspace.ID, filePath, content)
		if err != nil {
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "File saved successfully"})
	}
}

func (h *BaseHandler) DeleteFile(fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		filePath := chi.URLParam(r, "*")
		err := fs.DeleteFile(ctx.UserID, ctx.Workspace.ID, filePath)
		if err != nil {
			http.Error(w, "Failed to delete file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("File deleted successfully"))
	}
}

func (h *BaseHandler) GetLastOpenedFile(db *db.DB, fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
		if !ok {
			return
		}

		filePath, err := db.GetLastOpenedFile(ctx.Workspace.ID)
		if err != nil {
			http.Error(w, "Failed to get last opened file", http.StatusInternalServerError)
			return
		}

		if _, err := fs.ValidatePath(ctx.UserID, ctx.Workspace.ID, filePath); err != nil {
			http.Error(w, "Invalid file path", http.StatusBadRequest)
			return
		}

		respondJSON(w, map[string]string{"lastOpenedFilePath": filePath})
	}
}

func (h *BaseHandler) UpdateLastOpenedFile(db *db.DB, fs *filesystem.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := h.getContext(w, r)
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

		// Validate the file path exists in the workspace
		if requestBody.FilePath != "" {
			if _, err := fs.ValidatePath(ctx.UserID, ctx.Workspace.ID, requestBody.FilePath); err != nil {
				http.Error(w, "Invalid file path", http.StatusBadRequest)
				return
			}
		}

		if err := db.UpdateLastOpenedFile(ctx.Workspace.ID, requestBody.FilePath); err != nil {
			http.Error(w, "Failed to update last opened file", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "Last opened file updated successfully"})
	}
}
