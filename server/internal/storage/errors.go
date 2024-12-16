// Package storage provides functionalities to interact with the storage system (filesystem).
package storage

import (
	"errors"
	"fmt"
)

// PathValidationError represents a path validation error (e.g., path traversal attempt)
type PathValidationError struct {
	Path    string
	Message string
}

func (e *PathValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Message, e.Path)
}

// IsPathValidationError checks if the error is a PathValidationError
func IsPathValidationError(err error) bool {
	var pathErr *PathValidationError
	return err != nil && errors.As(err, &pathErr)
}
