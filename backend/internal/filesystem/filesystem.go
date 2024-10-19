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
	RootDir  string
	GitRepos map[int]map[int]*gitutils.GitRepo // map[userID]map[workspaceID]*gitutils.GitRepo
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
		GitRepos: make(map[int]map[int]*gitutils.GitRepo),
	}
}

func (fs *FileSystem) GetWorkspacePath(userID, workspaceID int) string {
	return filepath.Join(fs.RootDir, fmt.Sprintf("%d", userID), fmt.Sprintf("%d", workspaceID))
}

func (fs *FileSystem) InitializeUserWorkspace(userID, workspaceID int) error {
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)
	err := os.MkdirAll(workspacePath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create workspace directory: %w", err)
	}
	// Optionally, create a welcome file in the new workspace
	// welcomeFilePath := filepath.Join(workspacePath, "Welcome.md")
	// welcomeContent := []byte("# Welcome to Your Main Workspace\n\nThis is your default workspace in NovaMD. You can start creating and editing files right away!")
	// err = os.WriteFile(welcomeFilePath, welcomeContent, 0644)
	// if err != nil {
	// 	return fmt.Errorf("failed to create welcome file: %w", err)
	// }

	return nil
}

func (fs *FileSystem) DeleteUserWorkspace(userID, workspaceID int) error {
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)
	err := os.RemoveAll(workspacePath)
	if err != nil {
		return fmt.Errorf("failed to delete workspace directory: %w", err)
	}

	return nil
}

func (fs *FileSystem) ValidatePath(userID, workspaceID int, path string) (string, error) {
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)
	fullPath := filepath.Join(workspacePath, path)
	cleanPath := filepath.Clean(fullPath)

	if !strings.HasPrefix(cleanPath, workspacePath) {
		return "", fmt.Errorf("invalid path: outside of workspace")
	}

	return cleanPath, nil
}

func (fs *FileSystem) ListFilesRecursively(userID, workspaceID int) ([]FileNode, error) {
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)
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

func (fs *FileSystem) GetFileContent(userID, workspaceID int, filePath string) ([]byte, error) {
	fullPath, err := fs.ValidatePath(userID, workspaceID, filePath)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(fullPath)
}

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

func (fs *FileSystem) DeleteFile(userID, workspaceID int, filePath string) error {
	fullPath, err := fs.ValidatePath(userID, workspaceID, filePath)
	if err != nil {
		return err
	}
	return os.Remove(fullPath)
}

func (fs *FileSystem) CreateWorkspaceDirectory(userID, workspaceID int) error {
	dir := fs.GetWorkspacePath(userID, workspaceID)
	return os.MkdirAll(dir, 0755)
}

func (fs *FileSystem) SetupGitRepo(userID, workspaceID int, gitURL, gitUser, gitToken string) error {
	workspacePath := fs.GetWorkspacePath(userID, workspaceID)
	if _, ok := fs.GitRepos[userID]; !ok {
		fs.GitRepos[userID] = make(map[int]*gitutils.GitRepo)
	}
	fs.GitRepos[userID][workspaceID] = gitutils.New(gitURL, gitUser, gitToken, workspacePath)
	return fs.GitRepos[userID][workspaceID].EnsureRepo()
}

func (fs *FileSystem) DisableGitRepo(userID, workspaceID int) {
	if userRepos, ok := fs.GitRepos[userID]; ok {
		delete(userRepos, workspaceID)
		if len(userRepos) == 0 {
			delete(fs.GitRepos, userID)
		}
	}
}

func (fs *FileSystem) StageCommitAndPush(userID, workspaceID int, message string) error {
	repo, ok := fs.getGitRepo(userID, workspaceID)
	if !ok {
		return errors.New("git settings not configured for this workspace")
	}

	if err := repo.Commit(message); err != nil {
		return err
	}

	return repo.Push()
}

func (fs *FileSystem) Pull(userID, workspaceID int) error {
	repo, ok := fs.getGitRepo(userID, workspaceID)
	if !ok {
		return errors.New("git settings not configured for this workspace")
	}

	return repo.Pull()
}

func (fs *FileSystem) getGitRepo(userID, workspaceID int) (*gitutils.GitRepo, bool) {
	userRepos, ok := fs.GitRepos[userID]
	if !ok {
		return nil, false
	}
	repo, ok := userRepos[workspaceID]
	return repo, ok
}
