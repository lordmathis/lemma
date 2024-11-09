// Package filesystem provides functionalities to interact with the file system,
// including listing files, finding files by name, getting file content, saving files, and deleting files.
package filesystem

import (
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// FileNode represents a file or directory in the file system.
type FileNode struct {
	ID       string     `json:"id"`
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	Children []FileNode `json:"children,omitempty"`
}

// ListFilesRecursively returns a list of all files in the workspace directory and its subdirectories.
func (fs *FileSystem) ListFilesRecursively(userID, workspaceID int) ([]FileNode, error) {
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)
	return fs.walkDirectory(workspacePath, "")
}

func (fs *FileSystem) walkDirectory(dir, prefix string) ([]FileNode, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	// Split entries into directories and files
	var dirs, files []os.DirEntry
	for _, entry := range entries {
		if entry.IsDir() {
			dirs = append(dirs, entry)
		} else {
			files = append(files, entry)
		}
	}

	// Sort directories and files separately
	sort.Slice(dirs, func(i, j int) bool {
		return strings.ToLower(dirs[i].Name()) < strings.ToLower(dirs[j].Name())
	})
	sort.Slice(files, func(i, j int) bool {
		return strings.ToLower(files[i].Name()) < strings.ToLower(files[j].Name())
	})

	// Create combined slice with directories first, then files
	nodes := make([]FileNode, 0, len(entries))

	// Add directories first
	for _, entry := range dirs {
		name := entry.Name()
		path := filepath.Join(prefix, name)
		fullPath := filepath.Join(dir, name)

		children, err := fs.walkDirectory(fullPath, path)
		if err != nil {
			return nil, err
		}

		node := FileNode{
			ID:       path,
			Name:     name,
			Path:     path,
			Children: children,
		}
		nodes = append(nodes, node)
	}

	// Then add files
	for _, entry := range files {
		name := entry.Name()
		path := filepath.Join(prefix, name)

		node := FileNode{
			ID:   path,
			Name: name,
			Path: path,
		}
		nodes = append(nodes, node)
	}

	return nodes, nil
}

// FindFileByName returns a list of file paths that match the given filename.
func (fs *FileSystem) FindFileByName(userID, workspaceID int, filename string) ([]string, error) {
	var foundPaths []string
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)

	err := filepath.Walk(workspacePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			relPath, err := filepath.Rel(workspacePath, path)
			if err != nil {
				return err
			}
			if strings.EqualFold(info.Name(), filename) {
				foundPaths = append(foundPaths, relPath)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	if len(foundPaths) == 0 {
		return nil, errors.New("file not found")
	}

	return foundPaths, nil
}

// GetFileContent returns the content of the file at the given path.
func (fs *FileSystem) GetFileContent(userID, workspaceID int, filePath string) ([]byte, error) {
	fullPath, err := fs.ValidatePath(userID, workspaceID, filePath)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(fullPath)
}

// SaveFile writes the content to the file at the given path.
func (fs *FileSystem) SaveFile(userID, workspaceID int, filePath string, content []byte) error {
	fullPath, err := fs.ValidatePath(userID, workspaceID, filePath)
	if err != nil {
		return err
	}

	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(fullPath, content, 0644)
}

// DeleteFile deletes the file at the given path.
func (fs *FileSystem) DeleteFile(userID, workspaceID int, filePath string) error {
	fullPath, err := fs.ValidatePath(userID, workspaceID, filePath)
	if err != nil {
		return err
	}
	return os.Remove(fullPath)
}
