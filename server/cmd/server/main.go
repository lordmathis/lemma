// Package main provides the entry point for the application. It loads the configuration, initializes the server, and starts the server.
package main

import (
	"log"

	"novamd/internal/app"
)

// @title NovaMD API
// @version 1.0
// @description This is the API for NovaMD markdown note taking app.
// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html
// @BasePath /api/v1
// @SecurityDefinitions.ApiKey CookieAuth
// @In cookie
// @Name access_token
func main() {
	// Load configuration
	cfg, err := app.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Initialize and start server
	options, err := app.DefaultOptions(cfg)
	if err != nil {
		log.Fatal("Failed to initialize server options:", err)
	}

	server := app.NewServer(options)
	defer func() {
		if err := server.Close(); err != nil {
			log.Println("Error closing server:", err)
		}
	}()

	// Start server
	if err := server.Start(); err != nil {
		log.Fatal("Server error:", err)
	}
}
