// Package main provides the entry point for the application. It loads the configuration, initializes the server, and starts the server.
package main

import (
	"log"

	"novamd/internal/app"
	"novamd/internal/config"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Initialize and start server
	server, err := app.NewServer(cfg)
	if err != nil {
		log.Fatal("Failed to initialize server:", err)
	}
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
