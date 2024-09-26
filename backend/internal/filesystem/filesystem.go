package filesystem

import (
	"os"
	"path/filepath"
)

type FileSystem struct {
	RootDir string
}

type FileNode struct {
	Type  string     `json:"type"`
	Name  string     `json:"name"`
	Files []FileNode `json:"files,omitempty"`
}

func New(rootDir string) *FileSystem {
	return &FileSystem{RootDir: rootDir}
}

func (fs *FileSystem) ListFilesRecursively() ([]FileNode, error) {
	return fs.walkDirectory(fs.RootDir)
}

func (fs *FileSystem) walkDirectory(dir string) ([]FileNode, error) {
	var nodes []FileNode

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			subdir := filepath.Join(dir, entry.Name())
			subFiles, err := fs.walkDirectory(subdir)
			if err != nil {
				return nil, err
			}
			nodes = append(nodes, FileNode{
				Type:  "directory",
				Name:  entry.Name(),
				Files: subFiles,
			})
		} else {
			nodes = append(nodes, FileNode{
				Type: "file",
				Name: entry.Name(),
			})
		}
	}

	return nodes, nil
}

func (fs *FileSystem) GetFileContent(filePath string) ([]byte, error) {
	fullPath := filepath.Join(fs.RootDir, filePath)
	return os.ReadFile(fullPath)
}

func (fs *FileSystem) SaveFile(filePath string, content []byte) error {
	fullPath := filepath.Join(fs.RootDir, filePath)
	dir := filepath.Dir(fullPath)

	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(fullPath, content, 0644)
}

func (fs *FileSystem) DeleteFile(filePath string) error {
	fullPath := filepath.Join(fs.RootDir, filePath)
	return os.Remove(fullPath)
}
