package filesystem

import (
	"errors"
	"fmt"
	"novamd/internal/gitutils"
	"os"
	"path/filepath"
	"strings"
)

type FileSystem struct {
	RootDir string
	GitRepos map[int]*gitutils.GitRepo
}

type FileNode struct {
	ID       string     `json:"id"`
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	Children []FileNode `json:"children,omitempty"`
}

func New(rootDir string) *FileSystem {
	return &FileSystem{
		RootDir:  rootDir,
		GitRepos: make(map[int]*gitutils.GitRepo),
	}
}

func (fs *FileSystem) GetWorkspacePath(workspaceID int) string {
	return filepath.Join(fs.RootDir, fmt.Sprintf("%d", workspaceID))
}

func (fs *FileSystem) ValidatePath(workspaceID int, path string) (string, error) {
	workspacePath := fs.GetWorkspacePath(workspaceID)
	fullPath := filepath.Join(workspacePath, path)
	cleanPath := filepath.Clean(fullPath)

	if !strings.HasPrefix(cleanPath, workspacePath) {
		return "", fmt.Errorf("invalid path: outside of workspace")
	}

	return cleanPath, nil
}

func (fs *FileSystem) ListFilesRecursively(workspaceID int) ([]FileNode, error) {
	workspacePath := fs.GetWorkspacePath(workspaceID)
	return fs.walkDirectory(workspacePath, "")
}

func (fs *FileSystem) walkDirectory(dir, prefix string) ([]FileNode, error) {
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
			children, err := fs.walkDirectory(fullPath, path)
			if err != nil {
				return nil, err
			}
			node.Children = children
		}

		nodes = append(nodes, node)
	}

	return nodes, nil
}

func (fs *FileSystem) FindFileByName(workspaceID int, filename string) ([]string, error) {
	var foundPaths []string
	workspacePath := fs.GetWorkspacePath(workspaceID)

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

func (fs *FileSystem) GetFileContent(workspaceID int, filePath string) ([]byte, error) {
	fullPath, err := fs.ValidatePath(workspaceID, filePath)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(fullPath)
}

func (fs *FileSystem) SaveFile(workspaceID int, filePath string, content []byte) error {
	fullPath, err := fs.ValidatePath(workspaceID, filePath)
	if err != nil {
		return err
	}

	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(fullPath, content, 0644)
}

func (fs *FileSystem) DeleteFile(workspaceID int, filePath string) error {
	fullPath, err := fs.ValidatePath(workspaceID, filePath)
	if err != nil {
		return err
	}
	return os.Remove(fullPath)
}

func (fs *FileSystem) CreateWorkspaceDirectory(workspaceID int) error {
	dir := fs.GetWorkspacePath(workspaceID)
	return os.MkdirAll(dir, 0755)
}

func (fs *FileSystem) SetupGitRepo(workspaceID int, gitURL, gitUser, gitToken string) error {
	workspacePath := fs.GetWorkspacePath(workspaceID)
	fs.GitRepos[workspaceID] = gitutils.New(gitURL, gitUser, gitToken, workspacePath)
	return fs.GitRepos[workspaceID].EnsureRepo()
}

func (fs *FileSystem) DisableGitRepo(workspaceID int) {
	delete(fs.GitRepos, workspaceID)
}

func (fs *FileSystem) StageCommitAndPush(workspaceID int, message string) error {
	repo, ok := fs.GitRepos[workspaceID]
	if !ok {
		return errors.New("git settings not configured for this workspace")
	}

	if err := repo.Commit(message); err != nil {
		return err
	}

	return repo.Push()
}

func (fs *FileSystem) Pull(workspaceID int) error {
	repo, ok := fs.GitRepos[workspaceID]
	if !ok {
		return errors.New("git settings not configured for this workspace")
	}

	return repo.Pull()
}