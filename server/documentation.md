# NovaMD Package Documentation

Generated documentation for all packages in the NovaMD project.

## Table of Contents

- [cmd/server](#cmd-server)
- [internal/app](#internal-app)
- [internal/auth](#internal-auth)
- [internal/config](#internal-config)
- [internal/context](#internal-context)
- [internal/db](#internal-db)
- [internal/git](#internal-git)
- [internal/handlers](#internal-handlers)
- [internal/models](#internal-models)
- [internal/secrets](#internal-secrets)
- [internal/storage](#internal-storage)

## cmd/server

```go
Package main provides the entry point for the application. It loads the
configuration, initializes the server, and starts the server.
```

## internal/app

```go
package app // import "novamd/internal/app"

Package app provides application-level functionality for initializing and
running the server

FUNCTIONS

func SetupRoutes(r chi.Router, db db.Database, s storage.Manager, authMiddleware *auth.Middleware, sessionService *auth.SessionService)
    SetupRoutes configures the API routes


TYPES

type Server struct {
	// Has unexported fields.
}
    Server represents the HTTP server and its dependencies

func NewServer(cfg *config.Config) (*Server, error)
    NewServer initializes a new server instance with all dependencies

func (s *Server) Close() error
    Close handles graceful shutdown of server dependencies

func (s *Server) Start() error
    Start configures and starts the HTTP server

```

## internal/auth

```go
package auth // import "novamd/internal/auth"

Package auth provides JWT token generation and validation

TYPES

type Claims struct {
	jwt.RegisteredClaims           // Embedded standard JWT claims
	UserID               int       `json:"uid"`  // User identifier
	Role                 string    `json:"role"` // User role (admin, editor, viewer)
	Type                 TokenType `json:"type"` // Token type (access or refresh)
}
    Claims represents the custom claims we store in JWT tokens

type JWTConfig struct {
	SigningKey         string        // Secret key used to sign tokens
	AccessTokenExpiry  time.Duration // How long access tokens are valid
	RefreshTokenExpiry time.Duration // How long refresh tokens are valid
}
    JWTConfig holds the configuration for the JWT service

type JWTManager interface {
	GenerateAccessToken(userID int, role string) (string, error)
	GenerateRefreshToken(userID int, role string) (string, error)
	ValidateToken(tokenString string) (*Claims, error)
	RefreshAccessToken(refreshToken string) (string, error)
}
    JWTManager defines the interface for managing JWT tokens

func NewJWTService(config JWTConfig) (JWTManager, error)
    NewJWTService creates a new JWT service with the provided configuration
    Returns an error if the signing key is missing

type Middleware struct {
	// Has unexported fields.
}
    Middleware handles JWT authentication for protected routes

func NewMiddleware(jwtManager JWTManager) *Middleware
    NewMiddleware creates a new authentication middleware

func (m *Middleware) Authenticate(next http.Handler) http.Handler
    Authenticate middleware validates JWT tokens and sets user information in
    context

func (m *Middleware) RequireRole(role string) func(http.Handler) http.Handler
    RequireRole returns a middleware that ensures the user has the required role

func (m *Middleware) RequireWorkspaceAccess(next http.Handler) http.Handler
    RequireWorkspaceAccess returns a middleware that ensures the user has access
    to the workspace

type SessionService struct {
	// Has unexported fields.
}
    SessionService manages user sessions in the database

func NewSessionService(db db.SessionStore, jwtManager JWTManager) *SessionService
    NewSessionService creates a new session service with the given database and
    JWT manager

func (s *SessionService) CleanExpiredSessions() error
    CleanExpiredSessions removes all expired sessions from the database

func (s *SessionService) CreateSession(userID int, role string) (*models.Session, string, error)
    CreateSession creates a new user session for a user with the given userID
    and role

func (s *SessionService) InvalidateSession(sessionID string) error
    InvalidateSession removes a session with the given sessionID from the
    database

func (s *SessionService) RefreshSession(refreshToken string) (string, error)
    RefreshSession creates a new access token using a refreshToken

type TokenType string
    TokenType represents the type of JWT token (access or refresh)

const (
	AccessToken  TokenType = "access"  // AccessToken - Short-lived token for API access
	RefreshToken TokenType = "refresh" // RefreshToken - Long-lived token for obtaining new access tokens
)
```

## internal/config

```go
package config // import "novamd/internal/config"

Package config provides the configuration for the application

TYPES

type Config struct {
	DBPath            string
	WorkDir           string
	StaticPath        string
	Port              string
	AppURL            string
	CORSOrigins       []string
	AdminEmail        string
	AdminPassword     string
	EncryptionKey     string
	JWTSigningKey     string
	RateLimitRequests int
	RateLimitWindow   time.Duration
	IsDevelopment     bool
}
    Config holds the configuration for the application

func DefaultConfig() *Config
    DefaultConfig returns a new Config instance with default values

func Load() (*Config, error)
    Load creates a new Config instance with values from environment variables

func (c *Config) Validate() error
    Validate checks if the configuration is valid

```

## internal/context

```go
package context // import "novamd/internal/context"

Package context provides functions for managing request context

CONSTANTS

const (
	// HandlerContextKey is the key used to store handler context in the request context
	HandlerContextKey contextKey = "handlerContext"
)

FUNCTIONS

func WithHandlerContext(r *http.Request, hctx *HandlerContext) *http.Request
    WithHandlerContext adds handler context to the request

func WithUserContextMiddleware(next http.Handler) http.Handler
    WithUserContextMiddleware extracts user information from JWT claims and adds
    it to the request context

func WithWorkspaceContextMiddleware(db db.WorkspaceReader) func(http.Handler) http.Handler
    WithWorkspaceContextMiddleware adds workspace information to the request
    context


TYPES

type HandlerContext struct {
	UserID    int
	UserRole  string
	Workspace *models.Workspace // Optional, only set for workspace routes
}
    HandlerContext holds the request-specific data available to all handlers

func GetRequestContext(w http.ResponseWriter, r *http.Request) (*HandlerContext, bool)
    GetRequestContext retrieves the handler context from the request

type UserClaims struct {
	UserID int
	Role   string
}
    UserClaims represents user information from authentication

func GetUserFromContext(ctx context.Context) (*UserClaims, error)
    GetUserFromContext retrieves user claims from the context

```

## internal/db

```go
package db // import "novamd/internal/db"

Package db provides the database access layer for the application. It contains
methods for interacting with the database, such as creating, updating, and
deleting records.

CONSTANTS

const (
	// JWTSecretKey is the key for the JWT secret in the system settings
	JWTSecretKey = "jwt_secret"
)

TYPES

type Database interface {
	UserStore
	WorkspaceStore
	SessionStore
	SystemStore
	Begin() (*sql.Tx, error)
	Close() error
	Migrate() error
}
    Database defines the methods for interacting with the database

func Init(dbPath string, secretsService secrets.Service) (Database, error)
    Init initializes the database connection

type Migration struct {
	Version int
	SQL     string
}
    Migration represents a database migration

type SessionStore interface {
	CreateSession(session *models.Session) error
	GetSessionByRefreshToken(refreshToken string) (*models.Session, error)
	DeleteSession(sessionID string) error
	CleanExpiredSessions() error
}
    SessionStore defines the methods for interacting with jwt sessions in the
    database

type SystemStore interface {
	GetSystemStats() (*UserStats, error)
	EnsureJWTSecret() (string, error)
	GetSystemSetting(key string) (string, error)
	SetSystemSetting(key, value string) error
}
    SystemStore defines the methods for interacting with system settings and
    stats in the database

type UserStats struct {
	TotalUsers      int `json:"totalUsers"`
	TotalWorkspaces int `json:"totalWorkspaces"`
	ActiveUsers     int `json:"activeUsers"` // Users with activity in last 30 days
}
    UserStats represents system-wide statistics

type UserStore interface {
	CreateUser(user *models.User) (*models.User, error)
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(userID int) (*models.User, error)
	GetAllUsers() ([]*models.User, error)
	UpdateUser(user *models.User) error
	DeleteUser(userID int) error
	UpdateLastWorkspace(userID int, workspaceName string) error
	GetLastWorkspaceName(userID int) (string, error)
	CountAdminUsers() (int, error)
}
    UserStore defines the methods for interacting with user data in the database

type WorkspaceReader interface {
	GetWorkspaceByID(workspaceID int) (*models.Workspace, error)
	GetWorkspaceByName(userID int, workspaceName string) (*models.Workspace, error)
	GetWorkspacesByUserID(userID int) ([]*models.Workspace, error)
	GetAllWorkspaces() ([]*models.Workspace, error)
}
    WorkspaceReader defines the methods for reading workspace data from the
    database

type WorkspaceStore interface {
	WorkspaceReader
	WorkspaceWriter
}
    WorkspaceStore defines the methods for interacting with workspace data in
    the database

type WorkspaceWriter interface {
	CreateWorkspace(workspace *models.Workspace) error
	UpdateWorkspace(workspace *models.Workspace) error
	DeleteWorkspace(workspaceID int) error
	UpdateWorkspaceSettings(workspace *models.Workspace) error
	DeleteWorkspaceTx(tx *sql.Tx, workspaceID int) error
	UpdateLastWorkspaceTx(tx *sql.Tx, userID, workspaceID int) error
	UpdateLastOpenedFile(workspaceID int, filePath string) error
	GetLastOpenedFile(workspaceID int) (string, error)
}
    WorkspaceWriter defines the methods for writing workspace data to the
    database

```

## internal/git

```go
package git // import "novamd/internal/git"

Package git provides functionalities to interact with Git repositories,
including cloning, pulling, committing, and pushing changes.

TYPES

type Client interface {
	Clone() error
	Pull() error
	Commit(message string) error
	Push() error
	EnsureRepo() error
}
    Client defines the interface for Git operations

func New(url, username, token, workDir, commitName, commitEmail string) Client
    New creates a new git Client instance

type Config struct {
	URL         string
	Username    string
	Token       string
	WorkDir     string
	CommitName  string
	CommitEmail string
}
    Config holds the configuration for a Git client

```

## internal/handlers

```go
package handlers // import "novamd/internal/handlers"

Package handlers contains the request handlers for the api routes.

TYPES

type CreateUserRequest struct {
	Email       string          `json:"email"`
	DisplayName string          `json:"displayName"`
	Password    string          `json:"password"`
	Role        models.UserRole `json:"role"`
}
    CreateUserRequest holds the request fields for creating a new user

type DeleteAccountRequest struct {
	Password string `json:"password"`
}
    DeleteAccountRequest represents a user account deletion request

type Handler struct {
	DB      db.Database
	Storage storage.Manager
}
    Handler provides common functionality for all handlers

func NewHandler(db db.Database, s storage.Manager) *Handler
    NewHandler creates a new handler with the given dependencies

func (h *Handler) AdminCreateUser() http.HandlerFunc
    AdminCreateUser creates a new user

func (h *Handler) AdminDeleteUser() http.HandlerFunc
    AdminDeleteUser deletes a specific user

func (h *Handler) AdminGetSystemStats() http.HandlerFunc
    AdminGetSystemStats returns system-wide statistics for admins

func (h *Handler) AdminGetUser() http.HandlerFunc
    AdminGetUser gets a specific user by ID

func (h *Handler) AdminListUsers() http.HandlerFunc
    AdminListUsers returns a list of all users

func (h *Handler) AdminListWorkspaces() http.HandlerFunc
    AdminListWorkspaces returns a list of all workspaces and their stats

func (h *Handler) AdminUpdateUser() http.HandlerFunc
    AdminUpdateUser updates a specific user

func (h *Handler) CreateWorkspace() http.HandlerFunc
    CreateWorkspace creates a new workspace

func (h *Handler) DeleteAccount() http.HandlerFunc
    DeleteAccount handles user account deletion

func (h *Handler) DeleteFile() http.HandlerFunc
    DeleteFile deletes a file

func (h *Handler) DeleteWorkspace() http.HandlerFunc
    DeleteWorkspace deletes the current workspace

func (h *Handler) GetCurrentUser() http.HandlerFunc
    GetCurrentUser returns the currently authenticated user

func (h *Handler) GetFileContent() http.HandlerFunc
    GetFileContent returns the content of a file

func (h *Handler) GetLastOpenedFile() http.HandlerFunc
    GetLastOpenedFile returns the last opened file in the workspace

func (h *Handler) GetLastWorkspaceName() http.HandlerFunc
    GetLastWorkspaceName returns the name of the last opened workspace

func (h *Handler) GetWorkspace() http.HandlerFunc
    GetWorkspace returns the current workspace

func (h *Handler) ListFiles() http.HandlerFunc
    ListFiles returns a list of all files in the workspace

func (h *Handler) ListWorkspaces() http.HandlerFunc
    ListWorkspaces returns a list of all workspaces for the current user

func (h *Handler) Login(authService *auth.SessionService) http.HandlerFunc
    Login handles user authentication and returns JWT tokens

func (h *Handler) Logout(authService *auth.SessionService) http.HandlerFunc
    Logout invalidates the user's session

func (h *Handler) LookupFileByName() http.HandlerFunc
    LookupFileByName returns the paths of files with the given name

func (h *Handler) PullChanges() http.HandlerFunc
    PullChanges pulls changes from the remote repository

func (h *Handler) RefreshToken(authService *auth.SessionService) http.HandlerFunc
    RefreshToken generates a new access token using a refresh token

func (h *Handler) SaveFile() http.HandlerFunc
    SaveFile saves the content of a file

func (h *Handler) StageCommitAndPush() http.HandlerFunc
    StageCommitAndPush stages, commits, and pushes changes to the remote
    repository

func (h *Handler) UpdateLastOpenedFile() http.HandlerFunc
    UpdateLastOpenedFile updates the last opened file in the workspace

func (h *Handler) UpdateLastWorkspaceName() http.HandlerFunc
    UpdateLastWorkspaceName updates the name of the last opened workspace

func (h *Handler) UpdateProfile() http.HandlerFunc
    UpdateProfile updates the current user's profile

func (h *Handler) UpdateWorkspace() http.HandlerFunc
    UpdateWorkspace updates the current workspace

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
    LoginRequest represents a user login request

type LoginResponse struct {
	AccessToken  string          `json:"accessToken"`
	RefreshToken string          `json:"refreshToken"`
	User         *models.User    `json:"user"`
	Session      *models.Session `json:"session"`
}
    LoginResponse represents a user login response

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}
    RefreshRequest represents a refresh token request

type RefreshResponse struct {
	AccessToken string `json:"accessToken"`
}
    RefreshResponse represents a refresh token response

type StaticHandler struct {
	// Has unexported fields.
}
    StaticHandler serves static files with support for SPA routing and
    pre-compressed files

func NewStaticHandler(staticPath string) *StaticHandler
    NewStaticHandler creates a new StaticHandler with the given static path

func (h *StaticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request)
    ServeHTTP serves the static files

type SystemStats struct {
	*db.UserStats
	*storage.FileCountStats
}
    SystemStats holds system-wide statistics

type UpdateProfileRequest struct {
	DisplayName     string `json:"displayName"`
	Email           string `json:"email"`
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}
    UpdateProfileRequest represents a user profile update request

type UpdateUserRequest struct {
	Email       string          `json:"email,omitempty"`
	DisplayName string          `json:"displayName,omitempty"`
	Password    string          `json:"password,omitempty"`
	Role        models.UserRole `json:"role,omitempty"`
}
    UpdateUserRequest holds the request fields for updating a user

type WorkspaceStats struct {
	UserID             int       `json:"userID"`
	UserEmail          string    `json:"userEmail"`
	WorkspaceID        int       `json:"workspaceID"`
	WorkspaceName      string    `json:"workspaceName"`
	WorkspaceCreatedAt time.Time `json:"workspaceCreatedAt"`
	*storage.FileCountStats
}
    WorkspaceStats holds workspace statistics

```

## internal/models

```go
package models // import "novamd/internal/models"

Package models contains the data models used throughout the application.
These models are used to represent data in the database, as well as to validate
and serialize data in the application.

TYPES

type Session struct {
	ID           string    // Unique session identifier
	UserID       int       // ID of the user this session belongs to
	RefreshToken string    // The refresh token associated with this session
	ExpiresAt    time.Time // When this session expires
	CreatedAt    time.Time // When this session was created
}
    Session represents a user session in the database

type User struct {
	ID              int       `json:"id" validate:"required,min=1"`
	Email           string    `json:"email" validate:"required,email"`
	DisplayName     string    `json:"displayName"`
	PasswordHash    string    `json:"-"`
	Role            UserRole  `json:"role" validate:"required,oneof=admin editor viewer"`
	CreatedAt       time.Time `json:"createdAt"`
	LastWorkspaceID int       `json:"lastWorkspaceId"`
}
    User represents a user in the system

func (u *User) Validate() error
    Validate validates the user struct

type UserRole string
    UserRole represents the role of a user in the system

const (
	RoleAdmin  UserRole = "admin"
	RoleEditor UserRole = "editor"
	RoleViewer UserRole = "viewer"
)
    User roles

type Workspace struct {
	ID                 int       `json:"id" validate:"required,min=1"`
	UserID             int       `json:"userId" validate:"required,min=1"`
	Name               string    `json:"name" validate:"required"`
	CreatedAt          time.Time `json:"createdAt"`
	LastOpenedFilePath string    `json:"lastOpenedFilePath"`

	// Integrated settings
	Theme                string `json:"theme" validate:"oneof=light dark"`
	AutoSave             bool   `json:"autoSave"`
	ShowHiddenFiles      bool   `json:"showHiddenFiles"`
	GitEnabled           bool   `json:"gitEnabled"`
	GitURL               string `json:"gitUrl" validate:"required_if=GitEnabled true"`
	GitUser              string `json:"gitUser" validate:"required_if=GitEnabled true"`
	GitToken             string `json:"gitToken" validate:"required_if=GitEnabled true"`
	GitAutoCommit        bool   `json:"gitAutoCommit"`
	GitCommitMsgTemplate string `json:"gitCommitMsgTemplate"`
	GitCommitName        string `json:"gitCommitName"`
	GitCommitEmail       string `json:"gitCommitEmail" validate:"omitempty,required_if=GitEnabled true,email"`
}
    Workspace represents a user's workspace in the system

func (w *Workspace) SetDefaultSettings()
    SetDefaultSettings sets the default settings for the workspace

func (w *Workspace) Validate() error
    Validate validates the workspace struct

func (w *Workspace) ValidateGitSettings() error
    ValidateGitSettings validates the git settings if git is enabled

```

## internal/secrets

```go
package secrets // import "novamd/internal/secrets"

Package secrets provides an Encryptor interface for encrypting and decrypting
strings using AES-256-GCM.

FUNCTIONS

func ValidateKey(key string) error
    ValidateKey checks if the provided base64-encoded key is suitable for
    AES-256


TYPES

type Service interface {
	Encrypt(plaintext string) (string, error)
	Decrypt(ciphertext string) (string, error)
}
    Service is an interface for encrypting and decrypting strings

func NewService(key string) (Service, error)
    NewService creates a new Encryptor instance with the provided base64-encoded
    key

```

## internal/storage

```go
package storage // import "novamd/internal/storage"

Package storage provides functionalities to interact with the file system,
including listing files, finding files by name, getting file content, saving
files, and deleting files.

FUNCTIONS

func IsPathValidationError(err error) bool
    IsPathValidationError checks if the error is a PathValidationError


TYPES

type FileCountStats struct {
	TotalFiles int   `json:"totalFiles"`
	TotalSize  int64 `json:"totalSize"`
}
    FileCountStats holds statistics about files in a workspace

type FileManager interface {
	ListFilesRecursively(userID, workspaceID int) ([]FileNode, error)
	FindFileByName(userID, workspaceID int, filename string) ([]string, error)
	GetFileContent(userID, workspaceID int, filePath string) ([]byte, error)
	SaveFile(userID, workspaceID int, filePath string, content []byte) error
	DeleteFile(userID, workspaceID int, filePath string) error
	GetFileStats(userID, workspaceID int) (*FileCountStats, error)
	GetTotalFileStats() (*FileCountStats, error)
}
    FileManager provides functionalities to interact with files in the storage.

type FileNode struct {
	ID       string     `json:"id"`
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	Children []FileNode `json:"children,omitempty"`
}
    FileNode represents a file or directory in the storage.

type Manager interface {
	FileManager
	WorkspaceManager
	RepositoryManager
}
    Manager interface combines all storage interfaces.

type Options struct {
	Fs           fileSystem
	NewGitClient func(url, user, token, path, commitName, commitEmail string) git.Client
}
    Options represents the options for the storage service.

type PathValidationError struct {
	Path    string
	Message string
}
    PathValidationError represents a path validation error (e.g., path traversal
    attempt)

func (e *PathValidationError) Error() string

type RepositoryManager interface {
	SetupGitRepo(userID, workspaceID int, gitURL, gitUser, gitToken, commitName, commitEmail string) error
	DisableGitRepo(userID, workspaceID int)
	StageCommitAndPush(userID, workspaceID int, message string) error
	Pull(userID, workspaceID int) error
}
    RepositoryManager defines the interface for managing Git repositories.

type Service struct {
	RootDir  string
	GitRepos map[int]map[int]git.Client // map[userID]map[workspaceID]*git.Client
	// Has unexported fields.
}
    Service represents the file system structure.

func NewService(rootDir string) *Service
    NewService creates a new Storage instance with the default options and the
    given rootDir root directory.

func NewServiceWithOptions(rootDir string, options Options) *Service
    NewServiceWithOptions creates a new Storage instance with the given options
    and the given rootDir root directory.

func (s *Service) DeleteFile(userID, workspaceID int, filePath string) error
    DeleteFile deletes the file at the given filePath. Path must be a relative
    path within the workspace directory given by userID and workspaceID.

func (s *Service) DeleteUserWorkspace(userID, workspaceID int) error
    DeleteUserWorkspace deletes the workspace directory for the given userID and
    workspaceID.

func (s *Service) DisableGitRepo(userID, workspaceID int)
    DisableGitRepo disables the Git repository for the given userID and
    workspaceID.

func (s *Service) FindFileByName(userID, workspaceID int, filename string) ([]string, error)
    FindFileByName returns a list of file paths that match the given filename.
    Files are searched recursively in the workspace directory and its
    subdirectories. Workspace is identified by the given userID and workspaceID.

func (s *Service) GetFileContent(userID, workspaceID int, filePath string) ([]byte, error)
    GetFileContent returns the content of the file at the given filePath.
    Path must be a relative path within the workspace directory given by userID
    and workspaceID.

func (s *Service) GetFileStats(userID, workspaceID int) (*FileCountStats, error)
    GetFileStats returns the total number of files and related statistics in a
    workspace Workspace is identified by the given userID and workspaceID

func (s *Service) GetTotalFileStats() (*FileCountStats, error)
    GetTotalFileStats returns the total file statistics for the storage.

func (s *Service) GetWorkspacePath(userID, workspaceID int) string
    GetWorkspacePath returns the path to the workspace directory for the given
    userID and workspaceID.

func (s *Service) InitializeUserWorkspace(userID, workspaceID int) error
    InitializeUserWorkspace creates the workspace directory for the given userID
    and workspaceID.

func (s *Service) ListFilesRecursively(userID, workspaceID int) ([]FileNode, error)
    ListFilesRecursively returns a list of all files in the workspace directory
    and its subdirectories. Workspace is identified by the given userID and
    workspaceID.

func (s *Service) Pull(userID, workspaceID int) error
    Pull pulls the changes from the remote Git repository. The git repository
    belongs to the given userID and is associated with the given workspaceID.

func (s *Service) SaveFile(userID, workspaceID int, filePath string, content []byte) error
    SaveFile writes the content to the file at the given filePath. Path must
    be a relative path within the workspace directory given by userID and
    workspaceID.

func (s *Service) SetupGitRepo(userID, workspaceID int, gitURL, gitUser, gitToken, commitName, commitEmail string) error
    SetupGitRepo sets up a Git repository for the given userID and workspaceID.
    The repository is cloned from the given gitURL using the given gitUser and
    gitToken.

func (s *Service) StageCommitAndPush(userID, workspaceID int, message string) error
    StageCommitAndPush stages, commit with the message, and pushes the changes
    to the Git repository. The git repository belongs to the given userID and is
    associated with the given workspaceID.

func (s *Service) ValidatePath(userID, workspaceID int, path string) (string, error)
    ValidatePath validates the if the given path is valid within the workspace
    directory. Workspace directory is defined as the directory for the given
    userID and workspaceID.

type WorkspaceManager interface {
	ValidatePath(userID, workspaceID int, path string) (string, error)
	GetWorkspacePath(userID, workspaceID int) string
	InitializeUserWorkspace(userID, workspaceID int) error
	DeleteUserWorkspace(userID, workspaceID int) error
}
    WorkspaceManager provides functionalities to interact with workspaces in the
    storage.

```

