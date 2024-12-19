// Package testenv provides a setup for testing the application.
package testenv

import "lemma/internal/logging"

func init() {
	// Initialize the logger
	logging.Setup(logging.ERROR)
}
