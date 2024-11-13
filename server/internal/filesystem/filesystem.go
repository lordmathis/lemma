package filesystem

import (
	"fmt"
	"io/fs"
	"novamd/internal/gitutils"
	"os"
	"path/filepath"
	"strings"
)

// fileSystem defines the interface for filesystem operations
type fileSystem interface {
	ReadFile(path string) ([]byte, error)
	WriteFile(path string, data []byte, perm fs.FileMode) error
	Remove(path string) error
	MkdirAll(path string, perm fs.FileMode) error
	RemoveAll(path string) error
	ReadDir(path string) ([]fs.DirEntry, error)
	Stat(path string) (fs.FileInfo, error)
	IsNotExist(err error) bool
}

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

// osFS implements the FileSystem interface using the real filesystem.
type osFS struct{}

// ReadFile reads the file at the given path.
func (f *osFS) ReadFile(path string) ([]byte, error) { return os.ReadFile(path) }

// WriteFile writes the given data to the file at the given path.
func (f *osFS) WriteFile(path string, data []byte, perm fs.FileMode) error {
	return os.WriteFile(path, data, perm)
}

// Remove deletes the file at the given path.
func (f *osFS) Remove(path string) error { return os.Remove(path) }

// MkdirAll creates the directory at the given path and any necessary parents.
func (f *osFS) MkdirAll(path string, perm fs.FileMode) error { return os.MkdirAll(path, perm) }

// RemoveAll removes the file or directory at the given path.
func (f *osFS) RemoveAll(path string) error { return os.RemoveAll(path) }

// ReadDir reads the directory at the given path.
func (f *osFS) ReadDir(path string) ([]fs.DirEntry, error) { return os.ReadDir(path) }

// Stat returns the FileInfo for the file at the given path.
func (f *osFS) Stat(path string) (fs.FileInfo, error) { return os.Stat(path) }

// IsNotExist returns true if the error is a "file does not exist" error.
func (f *osFS) IsNotExist(err error) bool { return os.IsNotExist(err) }
