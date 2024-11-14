package storage

import (
	"novamd/internal/gitutils"
)

// Manager interface combines all storage interfaces.
type Manager interface {
	FileManager
	WorkspaceManager
	RepositoryManager
}

// Service represents the file system structure.
type Service struct {
	fs       fileSystem
	RootDir  string
	GitRepos map[int]map[int]*gitutils.GitRepo // map[userID]map[workspaceID]*gitutils.GitRepo
}

// NewService creates a new Storage instance.
// Parameters:
// - rootDir: the root directory for the storage
// Returns:
// - result: the new Storage instance
func NewService(rootDir string) *Service {
	return NewServiceWithFS(rootDir, &osFS{})
}

// NewServiceWithFS creates a new Storage instance with the given filesystem.
// Parameters:
// - rootDir: the root directory for the storage
// - fs: the filesystem implementation to use
// Returns:
// - result: the new Storage instance
func NewServiceWithFS(rootDir string, fs fileSystem) *Service {
	return &Service{
		fs:       fs,
		RootDir:  rootDir,
		GitRepos: make(map[int]map[int]*gitutils.GitRepo),
	}
}
