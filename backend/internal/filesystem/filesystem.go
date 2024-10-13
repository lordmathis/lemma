package filesystem

import (
	"errors"
	"fmt"
	"novamd/internal/gitutils"
	"novamd/internal/models"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type FileSystem struct {
	RootDir  string
	GitRepo  *gitutils.GitRepo
	Settings *models.Settings
}

type FileNode struct {
	ID       string     `json:"id"`
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	Children []FileNode `json:"children,omitempty"`
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

func (fs *FileSystem) SetupGitRepo(gitURL string, gitUser string, gitToken string) error {
	fs.GitRepo = gitutils.New(gitURL, gitUser, gitToken, fs.RootDir)
	return fs.InitializeGitRepo()
}

func (fs *FileSystem) DisableGitRepo() {
	fs.GitRepo = nil;
}

func (fs *FileSystem) InitializeGitRepo() error {
	if fs.GitRepo == nil {
		return errors.New("git settings not configured")
	}

	return fs.GitRepo.EnsureRepo()
}

func ValidatePath(rootDir, path string) (string, error) {
	fullPath := filepath.Join(rootDir, path)
	cleanPath := filepath.Clean(fullPath)

	if !strings.HasPrefix(cleanPath, filepath.Clean(rootDir)) {
		return "", fmt.Errorf("invalid path: outside of root directory")
	}

	relPath, err := filepath.Rel(rootDir, cleanPath)
	if err != nil {
		return "", err
	}

	if strings.HasPrefix(relPath, "..") {
		return "", fmt.Errorf("invalid path: outside of root directory")
	}

	return cleanPath, nil
}

func (fs *FileSystem) validatePath(path string) (string, error) {
	return ValidatePath(fs.RootDir, path)
}

func (fs *FileSystem) ListFilesRecursively() ([]FileNode, error) {
	return fs.walkDirectory(fs.RootDir, "")
}

func (fs *FileSystem) walkDirectory(dir, prefix string) ([]FileNode, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var folders []FileNode
	var files []FileNode

	for _, entry := range entries {
		name := entry.Name()
		path := filepath.Join(prefix, name)
		fullPath := filepath.Join(dir, name)

		if entry.IsDir() {
			children, err := fs.walkDirectory(fullPath, path)
			if err != nil {
				return nil, err
			}
			folders = append(folders, FileNode{
				ID:       path, // Using path as ID ensures uniqueness
				Name:     name,
				Path:     path,
				Children: children,
			})
		} else {
			files = append(files, FileNode{
				ID:   path, // Using path as ID ensures uniqueness
				Name: name,
				Path: path,
			})
		}
	}

	// Sort folders and files alphabetically
	sort.Slice(folders, func(i, j int) bool { return folders[i].Name < folders[j].Name })
	sort.Slice(files, func(i, j int) bool { return files[i].Name < files[i].Name })

	// Combine folders and files, with folders first
	return append(folders, files...), nil
}


func (fs *FileSystem) FindFileByName(filenameOrPath string) ([]string, error) {
	var foundPaths []string
	var searchPattern string

	// If no extension is provided, assume .md
	if !strings.Contains(filenameOrPath, ".") {
		searchPattern = filenameOrPath + ".md"
	} else {
		searchPattern = filenameOrPath
	}

	err := filepath.Walk(fs.RootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			relPath, err := filepath.Rel(fs.RootDir, path)
			if err != nil {
				return err
			}

			// Check if the file matches the search pattern
			if strings.HasSuffix(relPath, searchPattern) || 
			   strings.EqualFold(info.Name(), searchPattern) {
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
