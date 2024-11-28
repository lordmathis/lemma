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

// NewService creates a new Storage instance with the default options and the given rootDir root directory.
func NewService(rootDir string) *Service {
	return NewServiceWithOptions(rootDir, Options{
		Fs:           &osFS{},
		NewGitClient: git.New,
	})
}

// NewServiceWithOptions creates a new Storage instance with the given options and the given rootDir root directory.
func NewServiceWithOptions(rootDir string, options Options) *Service {
	return &Service{
		fs:           options.Fs,
		newGitClient: options.NewGitClient,
		RootDir:      rootDir,
		GitRepos:     make(map[int]map[int]git.Client),
	}
}
