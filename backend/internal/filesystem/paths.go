package filesystem

import (
	"fmt"
	"os"
	"path/filepath"

	"novamd/internal/models"
)

// GetWorkspacePath returns the file system path for a given workspace
func GetWorkspacePath(workspace *models.Workspace) string {
	baseDir := os.Getenv("NOVAMD_WORKDIR")
	if baseDir == "" {
		baseDir = "./data" // Default if not set
	}
	return filepath.Join(baseDir, fmt.Sprintf("%d", workspace.UserID), workspace.Name)
}

// GetFilePath returns the file system path for a given file within a workspace
func GetFilePath(workspace *models.Workspace, relativeFilePath string) string {
	return filepath.Join(GetWorkspacePath(workspace), relativeFilePath)
}
