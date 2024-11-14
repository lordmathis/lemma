package storage_test

import (
	"io/fs"
	"os"
	"testing/fstest"
)

// MapFS adapts testing.MapFS to implement our fileSystem interface
type MapFS struct {
	fstest.MapFS
}

func NewMapFS() *MapFS {
	return &MapFS{
		MapFS: make(fstest.MapFS),
	}
}

// Only implement the methods that MapFS doesn't already provide
func (m *MapFS) WriteFile(path string, data []byte, perm fs.FileMode) error {
	m.MapFS[path] = &fstest.MapFile{
		Data: data,
		Mode: perm,
	}
	return nil
}

func (m *MapFS) Remove(path string) error {
	delete(m.MapFS, path)
	return nil
}

func (m *MapFS) MkdirAll(_ string, _ fs.FileMode) error {
	// For MapFS, we don't actually need to create directories
	return nil
}

func (m *MapFS) RemoveAll(path string) error {
	delete(m.MapFS, path)
	return nil
}

func (m *MapFS) IsNotExist(err error) bool {
	return os.IsNotExist(err)
}
