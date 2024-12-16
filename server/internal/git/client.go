// Package git provides functionalities to interact with Git repositories, including cloning, pulling, committing, and pushing changes.
package git

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"novamd/internal/logging"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
)

// Config holds the configuration for a Git client
type Config struct {
	URL         string
	Username    string
	Token       string
	WorkDir     string
	CommitName  string
	CommitEmail string
}

// Client defines the interface for Git operations
type Client interface {
	Clone() error
	Pull() error
	Commit(message string) (CommitHash, error)
	Push() error
	EnsureRepo() error
}

// CommitHash represents a Git commit hash
type CommitHash plumbing.Hash

// String returns the string representation of the CommitHash
func (h CommitHash) String() string {
	return plumbing.Hash(h).String()
}

// client implements the Client interface
type client struct {
	Config
	repo *git.Repository
}

var logger logging.Logger

func getLogger() logging.Logger {
	if logger == nil {
		logger = logging.WithGroup("git")
	}
	return logger
}

// New creates a new git Client instance
func New(url, username, token, workDir, commitName, commitEmail string) Client {
	getLogger().Debug("creating new git client",
		"url", url,
		"username", username,
		"workDir", workDir,
		"commitName", commitName,
		"commitEmail", commitEmail)
	return &client{
		Config: Config{
			URL:         url,
			Username:    username,
			Token:       token,
			WorkDir:     workDir,
			CommitName:  commitName,
			CommitEmail: commitEmail,
		},
	}
}

// Clone clones the Git repository to the local directory
func (c *client) Clone() error {
	log := getLogger()
	log.Info("cloning git repository",
		"url", c.URL,
		"workDir", c.WorkDir)

	auth := &http.BasicAuth{
		Username: c.Username,
		Password: c.Token,
	}

	var err error
	c.repo, err = git.PlainClone(c.WorkDir, false, &git.CloneOptions{
		URL:      c.URL,
		Auth:     auth,
		Progress: os.Stdout,
	})
	if err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}

	log.Info("repository cloned",
		"url", c.URL,
		"workDir", c.WorkDir)
	return nil
}

// Pull pulls the latest changes from the remote repository
func (c *client) Pull() error {
	log := getLogger()

	if c.repo == nil {
		return fmt.Errorf("repository not initialized")
	}

	log.Debug("pulling repository changes",
		"workDir", c.WorkDir)

	w, err := c.repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	auth := &http.BasicAuth{
		Username: c.Username,
		Password: c.Token,
	}

	err = w.Pull(&git.PullOptions{
		Auth:     auth,
		Progress: os.Stdout,
	})
	if err != nil && err != git.NoErrAlreadyUpToDate {
		return fmt.Errorf("failed to pull changes: %w", err)
	}

	if err == git.NoErrAlreadyUpToDate {
		log.Debug("repository already up to date",
			"workDir", c.WorkDir)
	} else {
		log.Info("pulled repository changes",
			"workDir", c.WorkDir)
	}
	return nil
}

// Commit commits the changes in the repository with the given message
func (c *client) Commit(message string) (CommitHash, error) {
	log := getLogger()

	if c.repo == nil {
		return CommitHash(plumbing.ZeroHash), fmt.Errorf("repository not initialized")
	}

	log.Debug("preparing to commit changes",
		"workDir", c.WorkDir,
		"message", message)

	w, err := c.repo.Worktree()
	if err != nil {
		return CommitHash(plumbing.ZeroHash), fmt.Errorf("failed to get worktree: %w", err)
	}

	_, err = w.Add(".")
	if err != nil {
		return CommitHash(plumbing.ZeroHash), fmt.Errorf("failed to add changes: %w", err)
	}

	hash, err := w.Commit(message, &git.CommitOptions{
		Author: &object.Signature{
			Name:  c.CommitName,
			Email: c.CommitEmail,
			When:  time.Now(),
		},
	})
	if err != nil {
		return CommitHash(plumbing.ZeroHash), fmt.Errorf("failed to commit changes: %w", err)
	}

	log.Info("changes committed",
		"hash", hash.String(),
		"workDir", c.WorkDir,
		"message", message)
	return CommitHash(hash), nil
}

// Push pushes the changes to the remote repository
func (c *client) Push() error {
	log := getLogger()

	if c.repo == nil {
		return fmt.Errorf("repository not initialized")
	}

	log.Debug("pushing repository changes",
		"workDir", c.WorkDir)

	auth := &http.BasicAuth{
		Username: c.Username,
		Password: c.Token,
	}

	err := c.repo.Push(&git.PushOptions{
		Auth:     auth,
		Progress: os.Stdout,
	})
	if err != nil && err != git.NoErrAlreadyUpToDate {
		return fmt.Errorf("failed to push changes: %w", err)
	}

	if err == git.NoErrAlreadyUpToDate {
		log.Debug("remote already up to date",
			"workDir", c.WorkDir)
	} else {
		log.Info("pushed repository changes",
			"workDir", c.WorkDir)
	}
	return nil
}

// EnsureRepo ensures the local repository is cloned and up-to-date
func (c *client) EnsureRepo() error {
	log := getLogger()

	log.Debug("ensuring repository exists and is up to date",
		"workDir", c.WorkDir)

	if _, err := os.Stat(filepath.Join(c.WorkDir, ".git")); os.IsNotExist(err) {
		log.Info("repository not found, initiating clone",
			"workDir", c.WorkDir)
		return c.Clone()
	}

	var err error
	c.repo, err = git.PlainOpen(c.WorkDir)
	if err != nil {
		return fmt.Errorf("failed to open existing repository: %w", err)
	}

	log.Debug("repository opened, pulling latest changes",
		"workDir", c.WorkDir)
	return c.Pull()
}
