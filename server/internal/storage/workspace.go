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

// ValidatePath validates the if the given path is valid within the workspace directory.
// Workspace directory is defined as the directory for the given userID and workspaceID.
func (s *Service) ValidatePath(userID, workspaceID int, path string) (string, error) {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)

	// First check if the path is absolute
	if filepath.IsAbs(path) {
		return "", &PathValidationError{Path: path, Message: "absolute paths not allowed"}
	}

	// Join and clean the path
	fullPath := filepath.Join(workspacePath, path)
	cleanPath := filepath.Clean(fullPath)

	// Verify the path is still within the workspace
	if !strings.HasPrefix(cleanPath, workspacePath) {
		return "", &PathValidationError{Path: path, Message: "path traversal attempt"}
	}

	return cleanPath, nil
}

// GetWorkspacePath returns the path to the workspace directory for the given userID and workspaceID.
func (s *Service) GetWorkspacePath(userID, workspaceID int) string {
	return filepath.Join(s.RootDir, fmt.Sprintf("%d", userID), fmt.Sprintf("%d", workspaceID))
}

// InitializeUserWorkspace creates the workspace directory for the given userID and workspaceID.
func (s *Service) InitializeUserWorkspace(userID, workspaceID int) error {
	log := getLogger()
	log.Debug("initializing workspace directory",
		"userID", userID,
		"workspaceID", workspaceID)

	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	err := s.fs.MkdirAll(workspacePath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create workspace directory: %w", err)
	}

	return nil
}

// DeleteUserWorkspace deletes the workspace directory for the given userID and workspaceID.
func (s *Service) DeleteUserWorkspace(userID, workspaceID int) error {
	log := getLogger()
	log.Debug("deleting workspace directory",
		"userID", userID,
		"workspaceID", workspaceID)

	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	err := s.fs.RemoveAll(workspacePath)
	if err != nil {
		return fmt.Errorf("failed to delete workspace directory: %w", err)
	}

	return nil
}
