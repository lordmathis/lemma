package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// StaticHandler serves static files with support for SPA routing and pre-compressed files
type StaticHandler struct {
	staticPath string
}

// NewStaticHandler creates a new StaticHandler with the given static path
func NewStaticHandler(staticPath string) *StaticHandler {
	return &StaticHandler{
		staticPath: staticPath,
	}
}

// ServeHTTP serves the static files
func (h *StaticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Get the requested path
	requestedPath := r.URL.Path
	fullPath := filepath.Join(h.staticPath, requestedPath)
	cleanPath := filepath.Clean(fullPath)

	// Security check to prevent directory traversal
	if !strings.HasPrefix(cleanPath, h.staticPath) {
		respondError(w, "Invalid path", http.StatusBadRequest)
		return
	}

	// Set cache headers for assets
	if strings.HasPrefix(requestedPath, "/assets/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000") // 1 year
	}

	// Check if file exists (not counting .gz files)
	stat, err := os.Stat(cleanPath)
	if err != nil || stat.IsDir() {
		// Serve index.html for SPA routing
		indexPath := filepath.Join(h.staticPath, "index.html")
		http.ServeFile(w, r, indexPath)
		return
	}

	// Check for pre-compressed version
	if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		gzPath := cleanPath + ".gz"
		if _, err := os.Stat(gzPath); err == nil {
			w.Header().Set("Content-Encoding", "gzip")

			// Set proper content type based on original file
			switch filepath.Ext(cleanPath) {
			case ".js":
				w.Header().Set("Content-Type", "application/javascript")
			case ".css":
				w.Header().Set("Content-Type", "text/css")
			case ".html":
				w.Header().Set("Content-Type", "text/html")
			}

			http.ServeFile(w, r, gzPath)
			return
		}
	}

	// Serve original file
	http.ServeFile(w, r, cleanPath)
}
