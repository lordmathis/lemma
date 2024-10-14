package filesystem

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"novamd/internal/models"
)

// FileNode represents a file or directory in the file system
type FileNode struct {
	ID       string     `json:"id"`
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	Children []FileNode `json:"children,omitempty"`
}

// ValidatePath ensures the given path is within the workspace
func ValidatePath(workspace *models.Workspace, path string) (string, error) {
	workspacePath := GetWorkspacePath(workspace)
	fullPath := filepath.Join(workspacePath, path)
	cleanPath := filepath.Clean(fullPath)

	if !strings.HasPrefix(cleanPath, workspacePath) {
		return "", fmt.Errorf("invalid path: outside of workspace")
	}

	return cleanPath, nil
}

// ListFilesRecursively returns a list of all files in the workspace
func ListFilesRecursively(workspace *models.Workspace) ([]FileNode, error) {
	workspacePath := GetWorkspacePath(workspace)
	return walkDirectory(workspacePath, "")
}

func walkDirectory(dir, prefix string) ([]FileNode, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var nodes []FileNode
	for _, entry := range entries {
		name := entry.Name()
		path := filepath.Join(prefix, name)
		fullPath := filepath.Join(dir, name)

		node := FileNode{
			ID:   path,
			Name: name,
			Path: path,
		}

		if entry.IsDir() {
			children, err := walkDirectory(fullPath, path)
			if err != nil {
				return nil, err
			}
			node.Children = children
		}

		nodes = append(nodes, node)
	}

	return nodes, nil
}

// FindFileByName searches for a file in the workspace by name
func FindFileByName(workspace *models.Workspace, filename string) ([]string, error) {
	var foundPaths []string
	workspacePath := GetWorkspacePath(workspace)

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

// GetFileContent retrieves the content of a file in the workspace
func GetFileContent(workspace *models.Workspace, filePath string) ([]byte, error) {
	fullPath, err := ValidatePath(workspace, filePath)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(fullPath)
}

// SaveFile saves content to a file in the workspace
func SaveFile(workspace *models.Workspace, filePath string, content []byte) error {
	fullPath, err := ValidatePath(workspace, filePath)
	if err != nil {
		return err
	}

	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(fullPath, content, 0644)
}

// DeleteFile removes a file from the workspace
func DeleteFile(workspace *models.Workspace, filePath string) error {
	fullPath, err := ValidatePath(workspace, filePath)
	if err != nil {
		return err
	}
	return os.Remove(fullPath)
}

// CreateWorkspaceDirectory creates the directory for a new workspace
func CreateWorkspaceDirectory(workspace *models.Workspace) error {
	dir := GetWorkspacePath(workspace)
	return os.MkdirAll(dir, 0755)
}