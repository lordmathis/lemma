package filesystem

import (
	"fmt"
	"os"
	"path/filepath"
)

// GetWorkspacePath returns the path to the workspace directory for the given user and workspace IDs.
func (fs *FileSystem) GetWorkspacePath(userID, workspaceID int) string {
	return filepath.Join(fs.RootDir, fmt.Sprintf("%d", userID), fmt.Sprintf("%d", workspaceID))
}

// InitializeUserWorkspace creates the workspace directory for the given user and workspace IDs.
func (fs *FileSystem) InitializeUserWorkspace(userID, workspaceID int) error {
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)
	err := os.MkdirAll(workspacePath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create workspace directory: %w", err)
	}

	return nil
}

// DeleteUserWorkspace deletes the workspace directory for the given user and workspace IDs.
func (fs *FileSystem) DeleteUserWorkspace(userID, workspaceID int) error {
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)
	err := os.RemoveAll(workspacePath)
	if err != nil {
		return fmt.Errorf("failed to delete workspace directory: %w", err)
	}

	return nil
}

// CreateWorkspaceDirectory creates the workspace directory for the given user and workspace IDs.
func (fs *FileSystem) CreateWorkspaceDirectory(userID, workspaceID int) error {
	dir := fs.GetWorkspacePath(userID, workspaceID)
	return os.MkdirAll(dir, 0755)
}
