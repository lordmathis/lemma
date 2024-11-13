package filesystem

import (
	"fmt"
	"path/filepath"
)

// GetWorkspacePath returns the path to the workspace directory for the given user and workspace IDs.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace
// Returns:
// - result: the path to the workspace directory
func (s *Storage) GetWorkspacePath(userID, workspaceID int) string {
	return filepath.Join(s.RootDir, fmt.Sprintf("%d", userID), fmt.Sprintf("%d", workspaceID))
}

// InitializeUserWorkspace creates the workspace directory for the given user and workspace IDs.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to initialize
// Returns:
// - error: any error that occurred during the operation
func (s *Storage) InitializeUserWorkspace(userID, workspaceID int) error {
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
func (s *Storage) DeleteUserWorkspace(userID, workspaceID int) error {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	err := s.fs.RemoveAll(workspacePath)
	if err != nil {
		return fmt.Errorf("failed to delete workspace directory: %w", err)
	}

	return nil
}
