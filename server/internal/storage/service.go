package storage

import (
	"novamd/internal/git"
)

// Manager interface combines all storage interfaces.
type Manager interface {
	FileManager
	WorkspaceManager
	RepositoryManager
}

// Service represents the file system structure.
type Service struct {
	fs           fileSystem
	newGitClient func(url, user, token, path string) git.Client
	RootDir      string
	GitRepos     map[int]map[int]git.Client // map[userID]map[workspaceID]*git.Client
}

// Options represents the options for the storage service.
type Options struct {
	Fs           fileSystem
	NewGitClient func(url, user, token, path string) git.Client
}

// NewService creates a new Storage instance.
// Parameters:
// - rootDir: the root directory for the storage
// Returns:
// - result: the new Storage instance
func NewService(rootDir string) *Service {
	return NewServiceWithOptions(rootDir, Options{
		Fs:           &osFS{},
		NewGitClient: git.New,
	})
}

// NewServiceWithOptions creates a new Storage instance with the given options.
// Parameters:
// - rootDir: the root directory for the storage
// - opts: the options for the storage service
// Returns:
// - result: the new Storage instance
func NewServiceWithOptions(rootDir string, opts Options) *Service {
	return &Service{
		fs:           opts.Fs,
		newGitClient: opts.NewGitClient,
		RootDir:      rootDir,
		GitRepos:     make(map[int]map[int]git.Client),
	}
}
