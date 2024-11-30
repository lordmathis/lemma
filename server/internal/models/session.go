// Package models contains the data models used throughout the application. These models are used to represent data in the database, as well as to validate and serialize data in the application.
package models

import "time"

// Session represents a user session in the database
type Session struct {
	ID           string    // Unique session identifier
	UserID       int       // ID of the user this session belongs to
	RefreshToken string    // The refresh token associated with this session
	ExpiresAt    time.Time // When this session expires
	CreatedAt    time.Time // When this session was created
}
