package storage_test

import (
	"errors"
	"io/fs"
	"path/filepath"
	"time"

	_ "lemma/internal/testenv"
)

type mockDirEntry struct {
	name  string
	isDir bool
}

func (m *mockDirEntry) Name() string               { return m.name }
func (m *mockDirEntry) IsDir() bool                { return m.isDir }
func (m *mockDirEntry) Type() fs.FileMode          { return fs.ModeDir }
func (m *mockDirEntry) Info() (fs.FileInfo, error) { return nil, nil }

func NewMockDirEntry(name string, isDir bool) fs.DirEntry {
	return &mockDirEntry{name: name, isDir: isDir}
}

// Extend mockFS to support directory operations
type MockDirInfo struct {
	name    string
	size    int64
	mode    fs.FileMode
	modTime time.Time
	isDir   bool
}

func (m MockDirInfo) Name() string       { return m.name }
func (m MockDirInfo) Size() int64        { return m.size }
func (m MockDirInfo) Mode() fs.FileMode  { return m.mode }
func (m MockDirInfo) ModTime() time.Time { return m.modTime }
func (m MockDirInfo) IsDir() bool        { return m.isDir }
func (m MockDirInfo) Sys() interface{}   { return nil }

type mockFS struct {
	// Record operations for verification
	ReadCalls   map[string]int
	WriteCalls  map[string][]byte
	RemoveCalls []string
	MkdirCalls  []string

	// Configure test behavior
	ReadFileReturns map[string]struct {
		data []byte
		err  error
	}
	ReadDirReturns map[string]struct {
		entries []fs.DirEntry
		err     error
	}
	WriteFileError error
	RemoveError    error
	MkdirError     error
	StatError      error
}

//revive:disable:unexported-return
func NewMockFS() *mockFS {
	return &mockFS{
		ReadCalls:   make(map[string]int),
		WriteCalls:  make(map[string][]byte),
		RemoveCalls: make([]string, 0),
		MkdirCalls:  make([]string, 0),
		ReadFileReturns: make(map[string]struct {
			data []byte
			err  error
		}),
	}
}

func (m *mockFS) ReadFile(path string) ([]byte, error) {
	m.ReadCalls[path]++
	if ret, ok := m.ReadFileReturns[path]; ok {
		return ret.data, ret.err
	}
	return nil, errors.New("file not found")
}

func (m *mockFS) WriteFile(path string, data []byte, _ fs.FileMode) error {
	m.WriteCalls[path] = data
	return m.WriteFileError
}

func (m *mockFS) Remove(path string) error {
	m.RemoveCalls = append(m.RemoveCalls, path)
	return m.RemoveError
}

func (m *mockFS) MkdirAll(path string, _ fs.FileMode) error {
	m.MkdirCalls = append(m.MkdirCalls, path)
	return m.MkdirError
}

func (m *mockFS) Stat(path string) (fs.FileInfo, error) {
	if m.StatError != nil {
		return nil, m.StatError
	}
	return MockDirInfo{
		name:    filepath.Base(path),
		size:    1024,
		mode:    0644,
		modTime: time.Now(),
		isDir:   false,
	}, nil
}

func (m *mockFS) ReadDir(path string) ([]fs.DirEntry, error) {
	if ret, ok := m.ReadDirReturns[path]; ok {
		return ret.entries, ret.err
	}
	return nil, fs.ErrNotExist
}

func (m *mockFS) RemoveAll(path string) error {
	m.RemoveCalls = append(m.RemoveCalls, path)
	return m.RemoveError
}

func (m *mockFS) IsNotExist(err error) bool {
	return err == fs.ErrNotExist
}
