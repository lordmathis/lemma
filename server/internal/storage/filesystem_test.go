package storage_test

import (
	"io/fs"
	"os"
	"testing/fstest"
)

// mapFS adapts testing.MapFS to implement our fileSystem interface
type mapFS struct {
	fstest.MapFS
}

func NewMapFS() *mapFS {
	return &mapFS{
		MapFS: make(fstest.MapFS),
	}
}

// Only implement the methods that MapFS doesn't already provide
func (m *mapFS) WriteFile(path string, data []byte, perm fs.FileMode) error {
	m.MapFS[path] = &fstest.MapFile{
		Data: data,
		Mode: perm,
	}
	return nil
}

func (m *mapFS) Remove(path string) error {
	delete(m.MapFS, path)
	return nil
}

func (m *mapFS) MkdirAll(_ string, _ fs.FileMode) error {
	// For MapFS, we don't actually need to create directories
	return nil
}

func (m *mapFS) RemoveAll(path string) error {
	delete(m.MapFS, path)
	return nil
}

func (m *mapFS) IsNotExist(err error) bool {
	return os.IsNotExist(err)
}
