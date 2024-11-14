package storage

import (
	"fmt"
	"path/filepath"
	"strings"
)

// WorkspaceManager provides functionalities to interact with workspaces in the storage.
type WorkspaceManager interface {
	ValidatePath(userID, workspaceID int, path string) (string, error)
	GetWorkspacePath(userID, workspaceID int) string
	InitializeUserWorkspace(userID, workspaceID int) error
	DeleteUserWorkspace(userID, workspaceID int) error
}

// ValidatePath validates the given path and returns the cleaned path if it is valid.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to validate the path for
// - path: the path to validate
// Returns:
// - result: the cleaned path if it is valid
// - error: any error that occurred during validation
func (s *Service) ValidatePath(userID, workspaceID int, path string) (string, error) {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	fullPath := filepath.Join(workspacePath, path)
	cleanPath := filepath.Clean(fullPath)

	if !strings.HasPrefix(cleanPath, workspacePath) {
		return "", fmt.Errorf("invalid path: outside of workspace")
	}

	return cleanPath, nil
}

// GetWorkspacePath returns the path to the workspace directory for the given user and workspace IDs.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace
// Returns:
// - result: the path to the workspace directory
func (s *Service) GetWorkspacePath(userID, workspaceID int) string {
	return filepath.Join(s.RootDir, fmt.Sprintf("%d", userID), fmt.Sprintf("%d", workspaceID))
}

// InitializeUserWorkspace creates the workspace directory for the given user and workspace IDs.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to initialize
// Returns:
// - error: any error that occurred during the operation
func (s *Service) InitializeUserWorkspace(userID, workspaceID int) error {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	err := s.fs.MkdirAll(workspacePath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create workspace directory: %w", err)
	}

	return nil
}

// DeleteUserWorkspace deletes the workspace directory for the given user and workspace IDs.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to delete
// Returns:
// - error: any error that occurred during the operation
func (s *Service) DeleteUserWorkspace(userID, workspaceID int) error {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	err := s.fs.RemoveAll(workspacePath)
	if err != nil {
		return fmt.Errorf("failed to delete workspace directory: %w", err)
	}

	return nil
}
