package filesystem

import (
	"fmt"
	"novamd/internal/gitutils"
	"path/filepath"
	"strings"
)

// Storage represents the file system structure.
type Storage struct {
	fs       fileSystem
	RootDir  string
	GitRepos map[int]map[int]*gitutils.GitRepo // map[userID]map[workspaceID]*gitutils.GitRepo
}

// New creates a new Storage instance.
// Parameters:
// - rootDir: the root directory for the storage
// Returns:
// - result: the new Storage instance
func New(rootDir string) *Storage {
	return NewWithFS(rootDir, &osFS{})
}

// NewWithFS creates a new Storage instance with the given filesystem.
// Parameters:
// - rootDir: the root directory for the storage
// - fs: the filesystem implementation to use
// Returns:
// - result: the new Storage instance
func NewWithFS(rootDir string, fs fileSystem) *Storage {
	return &Storage{
		fs:       fs,
		RootDir:  rootDir,
		GitRepos: make(map[int]map[int]*gitutils.GitRepo),
	}
}

// ValidatePath validates the given path and returns the cleaned path if it is valid.
// Parameters:
// - userID: the ID of the user who owns the workspace
// - workspaceID: the ID of the workspace to validate the path for
// - path: the path to validate
// Returns:
// - result: the cleaned path if it is valid
// - error: any error that occurred during validation
func (s *Storage) ValidatePath(userID, workspaceID int, path string) (string, error) {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	fullPath := filepath.Join(workspacePath, path)
	cleanPath := filepath.Clean(fullPath)

	if !strings.HasPrefix(cleanPath, workspacePath) {
		return "", fmt.Errorf("invalid path: outside of workspace")
	}

	return cleanPath, nil
}
