package filesystem

import (
	"fmt"
	"novamd/internal/gitutils"
	"path/filepath"
	"strings"
)

// FileSystem represents the file system structure.
type FileSystem struct {
	RootDir  string
	GitRepos map[int]map[int]*gitutils.GitRepo // map[userID]map[workspaceID]*gitutils.GitRepo
}

// New creates a new FileSystem instance.
func New(rootDir string) *FileSystem {
	return &FileSystem{
		RootDir:  rootDir,
		GitRepos: make(map[int]map[int]*gitutils.GitRepo),
	}
}

// ValidatePath validates the given path and returns the cleaned path if it is valid.
func (fs *FileSystem) ValidatePath(userID, workspaceID int, path string) (string, error) {
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)
	fullPath := filepath.Join(workspacePath, path)
	cleanPath := filepath.Clean(fullPath)

	if !strings.HasPrefix(cleanPath, workspacePath) {
		return "", fmt.Errorf("invalid path: outside of workspace")
	}

	return cleanPath, nil
}
