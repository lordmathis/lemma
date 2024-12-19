package storage

import (
	"io/fs"
	"lemma/internal/logging"
	"os"
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

var logger logging.Logger

func getLogger() logging.Logger {
	if logger == nil {
		logger = logging.WithGroup("storage")
	}
	return logger
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
