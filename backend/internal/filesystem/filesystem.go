package filesystem

import (
	"errors"
	"novamd/internal/gitutils"
	"novamd/internal/models"
	"os"
	"path/filepath"
	"strings"
)

type FileSystem struct {
	RootDir  string
	GitRepo  *gitutils.GitRepo
	Settings *models.Settings
}

type FileNode struct {
	Type  string     `json:"type"`
	Name  string     `json:"name"`
	Files []FileNode `json:"files,omitempty"`
}

func New(rootDir string, settings *models.Settings) *FileSystem {
	fs := &FileSystem{
		RootDir:  rootDir,
		Settings: settings,
	}

	if settings.Settings.GitEnabled {
		fs.GitRepo = gitutils.New(
			settings.Settings.GitURL,
			settings.Settings.GitUser,
			settings.Settings.GitToken,
			rootDir,
		)
	}

	return fs
}

func (fs *FileSystem) InitializeGitRepo() error {
	if fs.GitRepo == nil {
		return errors.New("git settings not configured")
	}

	return fs.GitRepo.EnsureRepo()
}

// validatePath checks if the given path is within the root directory
func (fs *FileSystem) validatePath(path string) (string, error) {
	fullPath := filepath.Join(fs.RootDir, path)
	cleanPath := filepath.Clean(fullPath)

	if !strings.HasPrefix(cleanPath, fs.RootDir) {
		return "", errors.New("invalid path: outside of root directory")
	}

	relPath, err := filepath.Rel(fs.RootDir, cleanPath)
	if err != nil {
		return "", err
	}

	if strings.HasPrefix(relPath, "..") {
		return "", errors.New("invalid path: outside of root directory")
	}

	return cleanPath, nil
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
	fullPath, err := fs.validatePath(filePath)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(fullPath)
}

func (fs *FileSystem) SaveFile(filePath string, content []byte) error {
	fullPath, err := fs.validatePath(filePath)
	if err != nil {
		return err
	}

	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	if fs.Settings.Settings.GitAutoCommit && fs.GitRepo != nil {
		message := strings.Replace(fs.Settings.Settings.GitCommitMsgTemplate, "${filename}", filePath, -1)
		return fs.StageCommitAndPush(message)
	}

	return os.WriteFile(fullPath, content, 0644)
}

func (fs *FileSystem) DeleteFile(filePath string) error {
	fullPath, err := fs.validatePath(filePath)
	if err != nil {
		return err
	}
	return os.Remove(fullPath)
}

func (fs *FileSystem) StageCommitAndPush(message string) error {
	if fs.GitRepo == nil {
		return errors.New("git settings not configured")
	}

	if err := fs.GitRepo.Commit(message); err != nil {
		return err
	}

	return fs.GitRepo.Push()
}

func (fs *FileSystem) Pull() error {
	if fs.GitRepo == nil {
		return errors.New("git settings not configured")
	}

	return fs.GitRepo.Pull()
}
