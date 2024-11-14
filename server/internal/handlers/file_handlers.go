package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"novamd/internal/httpcontext"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListFiles() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
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

func (h *Handler) LookupFileByName() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
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

func (h *Handler) GetFileContent() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
		if !ok {
			return
		}

		filePath := chi.URLParam(r, "*")
		content, err := h.Storage.GetFileContent(ctx.UserID, ctx.Workspace.ID, filePath)
		if err != nil {
			http.Error(w, "Failed to read file", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		w.Write(content)
	}
}

func (h *Handler) SaveFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
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
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		respondJSON(w, map[string]string{"message": "File saved successfully"})
	}
}

func (h *Handler) DeleteFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
		if !ok {
			return
		}

		filePath := chi.URLParam(r, "*")
		err := h.Storage.DeleteFile(ctx.UserID, ctx.Workspace.ID, filePath)
		if err != nil {
			http.Error(w, "Failed to delete file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("File deleted successfully"))
	}
}

func (h *Handler) GetLastOpenedFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
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

func (h *Handler) UpdateLastOpenedFile() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, ok := httpcontext.GetRequestContext(w, r)
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
			if _, err := h.Storage.ValidatePath(ctx.UserID, ctx.Workspace.ID, requestBody.FilePath); err != nil {
				http.Error(w, "Invalid file path", http.StatusBadRequest)
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
