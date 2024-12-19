package handlers

import (
	"lemma/internal/logging"
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

func getStaticLogger() logging.Logger {
	return logging.WithGroup("static")
}

// ServeHTTP serves the static files
func (h *StaticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log := getStaticLogger().With(
		"handler", "ServeHTTP",
		"clientIP", r.RemoteAddr,
		"method", r.Method,
		"url", r.URL.Path,
	)

	// Get the requested path
	requestedPath := r.URL.Path
	fullPath := filepath.Join(h.staticPath, requestedPath)
	cleanPath := filepath.Clean(fullPath)

	// Security check to prevent directory traversal
	if !strings.HasPrefix(cleanPath, h.staticPath) {
		log.Warn("directory traversal attempt detected",
			"requestedPath", requestedPath,
			"cleanPath", cleanPath,
		)
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
		if os.IsNotExist(err) {
			log.Debug("file not found, serving index.html",
				"requestedPath", requestedPath,
			)
		} else if stat != nil && stat.IsDir() {
			log.Debug("directory requested, serving index.html",
				"requestedPath", requestedPath,
			)
		} else {
			log.Error("error checking file status",
				"requestedPath", requestedPath,
				"error", err.Error(),
			)
		}

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
			contentType := "application/octet-stream"
			switch filepath.Ext(cleanPath) {
			case ".js":
				contentType = "application/javascript"
			case ".css":
				contentType = "text/css"
			case ".html":
				contentType = "text/html"
			}
			w.Header().Set("Content-Type", contentType)
			http.ServeFile(w, r, gzPath)
			return
		}
	}

	// Serve original file
	http.ServeFile(w, r, cleanPath)
}
