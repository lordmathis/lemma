package storage

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// FileManager provides functionalities to interact with files in the storage.
type FileManager interface {
	ListFilesRecursively(userID, workspaceID int) ([]FileNode, error)
	FindFileByName(userID, workspaceID int, filename string) ([]string, error)
	GetFileContent(userID, workspaceID int, filePath string) ([]byte, error)
	SaveFile(userID, workspaceID int, filePath string, content []byte) error
	MoveFile(userID, workspaceID int, srcPath string, dstPath string) error
	DeleteFile(userID, workspaceID int, filePath string) error
	GetFileStats(userID, workspaceID int) (*FileCountStats, error)
	GetTotalFileStats() (*FileCountStats, error)
}

// FileNode represents a file or directory in the storage.
type FileNode struct {
	ID       string     `json:"id"`
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	Children []FileNode `json:"children,omitempty"`
}

// ListFilesRecursively returns a list of all files in the workspace directory and its subdirectories.
// Workspace is identified by the given userID and workspaceID.
func (s *Service) ListFilesRecursively(userID, workspaceID int) ([]FileNode, error) {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)
	nodes, err := s.walkDirectory(workspacePath, "")
	if err != nil {
		return nil, err
	}

	return nodes, nil
}

// walkDirectory recursively walks the directory and returns a list of files and directories.
func (s *Service) walkDirectory(dir, prefix string) ([]FileNode, error) {
	entries, err := s.fs.ReadDir(dir)
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

		children, err := s.walkDirectory(fullPath, path)
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
// Files are searched recursively in the workspace directory and its subdirectories.
// Workspace is identified by the given userID and workspaceID.
func (s *Service) FindFileByName(userID, workspaceID int, filename string) ([]string, error) {
	var foundPaths []string
	workspacePath := s.GetWorkspacePath(userID, workspaceID)

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
		return nil, fmt.Errorf("file not found")
	}

	return foundPaths, nil
}

// GetFileContent returns the content of the file at the given filePath.
// Path must be a relative path within the workspace directory given by userID and workspaceID.
func (s *Service) GetFileContent(userID, workspaceID int, filePath string) ([]byte, error) {
	fullPath, err := s.ValidatePath(userID, workspaceID, filePath)
	if err != nil {
		return nil, err
	}
	return s.fs.ReadFile(fullPath)
}

// SaveFile writes the content to the file at the given filePath.
// Path must be a relative path within the workspace directory given by userID and workspaceID.
func (s *Service) SaveFile(userID, workspaceID int, filePath string, content []byte) error {
	log := getLogger()

	fullPath, err := s.ValidatePath(userID, workspaceID, filePath)
	if err != nil {
		return err
	}

	dir := filepath.Dir(fullPath)
	if err := s.fs.MkdirAll(dir, 0755); err != nil {
		return err
	}

	if err := s.fs.WriteFile(fullPath, content, 0644); err != nil {
		return err
	}

	log.Debug("file saved",
		"userID", userID,
		"workspaceID", workspaceID,
		"path", filePath,
		"size", len(content))
	return nil
}

// MoveFile moves a file from srcPath to dstPath within the workspace directory.
// Both paths must be relative to the workspace directory given by userID and workspaceID.
// If the destination file already exists, it will be overwritten.
func (s *Service) MoveFile(userID, workspaceID int, srcPath string, dstPath string) error {
	log := getLogger()

	srcFullPath, err := s.ValidatePath(userID, workspaceID, srcPath)
	if err != nil {
		return err
	}

	dstFullPath, err := s.ValidatePath(userID, workspaceID, dstPath)
	if err != nil {
		return err
	}

	if err := s.fs.MoveFile(srcFullPath, dstFullPath); err != nil {
		return fmt.Errorf("failed to move file: %w", err)
	}

	log.Debug("file moved",
		"userID", userID,
		"workspaceID", workspaceID,
		"src", srcPath,
		"dst", dstPath)
	return nil
}

// DeleteFile deletes the file at the given filePath.
// Path must be a relative path within the workspace directory given by userID and workspaceID.
func (s *Service) DeleteFile(userID, workspaceID int, filePath string) error {
	log := getLogger()
	fullPath, err := s.ValidatePath(userID, workspaceID, filePath)
	if err != nil {
		return err
	}

	if err := s.fs.Remove(fullPath); err != nil {
		return err
	}

	log.Debug("file deleted",
		"userID", userID,
		"workspaceID", workspaceID,
		"path", filePath)
	return nil
}

// FileCountStats holds statistics about files in a workspace
type FileCountStats struct {
	TotalFiles int   `json:"totalFiles"`
	TotalSize  int64 `json:"totalSize"`
}

// GetFileStats returns the total number of files and related statistics in a workspace
// Workspace is identified by the given userID and workspaceID
func (s *Service) GetFileStats(userID, workspaceID int) (*FileCountStats, error) {
	workspacePath := s.GetWorkspacePath(userID, workspaceID)

	// Check if workspace exists
	if _, err := s.fs.Stat(workspacePath); s.fs.IsNotExist(err) {
		return nil, fmt.Errorf("workspace directory does not exist")
	}

	stats, err := s.countFilesInPath(workspacePath)
	if err != nil {
		return nil, err
	}

	return stats, nil
}

// GetTotalFileStats returns the total file statistics for the storage.
func (s *Service) GetTotalFileStats() (*FileCountStats, error) {
	stats, err := s.countFilesInPath(s.RootDir)
	if err != nil {
		return nil, err
	}

	return stats, nil
}

// countFilesInPath counts the total number of files and the total size of files in the given directory.
func (s *Service) countFilesInPath(directoryPath string) (*FileCountStats, error) {
	result := &FileCountStats{}

	err := filepath.WalkDir(directoryPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip the .git directory
		if d.IsDir() && d.Name() == ".git" {
			return filepath.SkipDir
		}

		// Only count regular files
		if !d.IsDir() {
			// Get relative path from workspace root
			relPath, err := filepath.Rel(directoryPath, path)
			if err != nil {
				return fmt.Errorf("failed to get relative path: %w", err)
			}

			// Get file info for size
			info, err := d.Info()
			if err != nil {
				return fmt.Errorf("failed to get file info for %s: %w", relPath, err)
			}

			result.TotalFiles++
			result.TotalSize += info.Size()
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("error counting files: %w", err)
	}

	return result, nil
}
