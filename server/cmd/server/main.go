// Package main provides the entry point for the application. It loads the configuration, initializes the server, and starts the server.
package main

import (
	"log"

	"novamd/internal/app"
)

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
