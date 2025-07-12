//go:build integration

package handlers_test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"lemma/internal/app"
	"lemma/internal/auth"
	"lemma/internal/db"
	"lemma/internal/git"
	"lemma/internal/models"
	"lemma/internal/secrets"
	"lemma/internal/storage"

	_ "lemma/internal/testenv"
)

// testHarness encapsulates all the dependencies needed for testing
type testHarness struct {
	Server          *app.Server
	DB              db.TestDatabase
	Storage         storage.Manager
	JWTManager      auth.JWTManager
	SessionManager  auth.SessionManager
	CookieManager   auth.CookieManager
	AdminTestUser   *testUser
	RegularTestUser *testUser
	TempDirectory   string
	MockGit         *MockGitClient
}

type testUser struct {
	userModel   *models.User
	accessToken string
	session     *models.Session
}

type DatabaseConfig struct {
	Type db.DBType
	URL  string
}

// setupTestHarness creates a new test environment
func setupTestHarness(t *testing.T, dbConfig DatabaseConfig) *testHarness {
	t.Helper()

	// Create temporary directory for test files
	tempDir, err := os.MkdirTemp("", "lemma-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}

	// Initialize test database
	secretsSvc, err := secrets.NewService("YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=") // test key
	if err != nil {
		t.Fatalf("Failed to initialize secrets service: %v", err)
	}

	var database db.TestDatabase
	switch dbConfig.Type {
	case db.DBTypeSQLite:
		database, err = db.NewTestSQLiteDB(secretsSvc)
		if err != nil {
			t.Fatalf("Failed to initialize test database: %v", err)
		}
	case db.DBTypePostgres:
		database, err = db.NewPostgresTestDB(dbConfig.URL, secretsSvc)
		if err != nil {
			t.Fatalf("Failed to initialize test database: %v", err)
		}
	default:
		t.Fatalf("Unsupported database type: %s", dbConfig.Type)
	}

	if err := database.Migrate(); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	// Create mock git client
	mockGit := NewMockGitClient(false)

	// Create storage with mock git client
	storageOpts := storage.Options{
		NewGitClient: func(url, user, token, path, commitName, commitEmail string) git.Client {
			return mockGit
		},
	}
	storageSvc := storage.NewServiceWithOptions(tempDir, storageOpts)

	// Initialize JWT service
	jwtSvc, err := auth.NewJWTService(auth.JWTConfig{
		SigningKey:         "test-key",
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 24 * time.Hour,
	})
	if err != nil {
		t.Fatalf("Failed to initialize JWT service: %v", err)
	}

	// Initialize session service
	sessionSvc := auth.NewSessionService(database, jwtSvc)

	// Initialize cookie service
	cookieSvc := auth.NewCookieService(true, "localhost")

	// Create test config
	testConfig := &app.Config{
		DBURL:         "sqlite://:memory:",
		WorkDir:       tempDir,
		StaticPath:    "../testdata",
		Port:          "8081",
		AdminEmail:    "admin@test.com",
		AdminPassword: "admin123",
		EncryptionKey: "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=",
		IsDevelopment: true,
	}

	// Create server options
	serverOpts := &app.Options{
		Config:         testConfig,
		Database:       database,
		Storage:        storageSvc,
		JWTManager:     jwtSvc,
		SessionManager: sessionSvc,
		CookieService:  cookieSvc,
	}

	// Create server
	srv := app.NewServer(serverOpts)

	h := &testHarness{
		Server:         srv,
		DB:             database,
		Storage:        storageSvc,
		JWTManager:     jwtSvc,
		SessionManager: sessionSvc,
		CookieManager:  cookieSvc,
		TempDirectory:  tempDir,
		MockGit:        mockGit,
	}

	// Create test users
	adminTestUser := h.createTestUser(t, "admin@test.com", "admin123", models.RoleAdmin)
	regularTestUser := h.createTestUser(t, "user@test.com", "user123", models.RoleEditor)

	h.AdminTestUser = adminTestUser
	h.RegularTestUser = regularTestUser

	return h
}

// teardownTestHarness cleans up the test environment
func (h *testHarness) teardown(t *testing.T) {
	t.Helper()

	if err := h.DB.Close(); err != nil {
		t.Errorf("Failed to close database: %v", err)
	}

	if err := os.RemoveAll(h.TempDirectory); err != nil {
		t.Errorf("Failed to remove temp directory: %v", err)
	}
}

// runWithDatabases runs a test function with both SQLite and PostgreSQL databases
func runWithDatabases(t *testing.T, testFn func(*testing.T, DatabaseConfig)) {
	// Get PostgreSQL connection URL from environment variable
	postgresURL := os.Getenv("LEMMA_TEST_POSTGRES_URL")

	// Always run with SQLite in-memory
	t.Run("SQLite", func(t *testing.T) {
		testFn(t, DatabaseConfig{
			Type: db.DBTypeSQLite,
			URL:  "sqlite://:memory:",
		})
	})

	// Run with PostgreSQL if connection URL is provided
	if postgresURL != "" {
		t.Run("PostgreSQL", func(t *testing.T) {
			testFn(t, DatabaseConfig{
				Type: db.DBTypePostgres,
				URL:  postgresURL,
			})
		})
	} else {
		t.Log("Skipping PostgreSQL tests, LEMMA_TEST_POSTGRES_URL environment variable not set")
	}
}

// createTestUser creates a test user and returns the user and access token
func (h *testHarness) createTestUser(t *testing.T, email, password string, role models.UserRole) *testUser {
	t.Helper()

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	user := &models.User{
		Email:        email,
		DisplayName:  "Test User",
		PasswordHash: string(hashedPassword),
		Role:         role,
	}

	user, err = h.DB.CreateUser(user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Initialize the default workspace directory in storage
	err = h.Storage.InitializeUserWorkspace(user.ID, user.LastWorkspaceID)
	if err != nil {
		t.Fatalf("Failed to initialize user workspace: %v", err)
	}

	session, accessToken, err := h.SessionManager.CreateSession(user.ID, string(user.Role))
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	return &testUser{
		userModel:   user,
		accessToken: accessToken,
		session:     session,
	}
}

func (h *testHarness) newRequest(t *testing.T, method, path string, body any) *http.Request {
	t.Helper()

	var reqBody []byte
	var err error
	if body != nil {
		reqBody, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("Failed to marshal request body: %v", err)
		}
	}

	req := httptest.NewRequest(method, path, bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	return req
}

// newRequestRaw creates a new request with raw body
func (h *testHarness) newRequestRaw(t *testing.T, method, path string, body io.Reader) *http.Request {
	t.Helper()
	return httptest.NewRequest(method, path, body)
}

// executeRequest executes the request and returns response recorder
func (h *testHarness) executeRequest(req *http.Request) *httptest.ResponseRecorder {
	rr := httptest.NewRecorder()
	h.Server.Router().ServeHTTP(rr, req)
	return rr
}

// addAuthCookies adds authentication cookies to request
func (h *testHarness) addAuthCookies(t *testing.T, req *http.Request, testUser *testUser) {
	t.Helper()

	if testUser == nil || testUser.session == nil {
		return
	}

	req.AddCookie(h.CookieManager.GenerateAccessTokenCookie(testUser.accessToken))
	req.AddCookie(h.CookieManager.GenerateRefreshTokenCookie(testUser.session.RefreshToken))
}

func (h *testHarness) addCSRFCookie(t *testing.T, req *http.Request) string {
	t.Helper()

	csrfToken := "test-csrf-token"
	req.AddCookie(h.CookieManager.GenerateCSRFCookie(csrfToken))
	return csrfToken
}

// makeRequest is the main helper for making JSON requests
func (h *testHarness) makeRequest(t *testing.T, method, path string, body any, testUser *testUser) *httptest.ResponseRecorder {
	t.Helper()

	req := h.newRequest(t, method, path, body)
	h.addAuthCookies(t, req, testUser)

	needsCSRF := method != http.MethodGet && method != http.MethodHead && method != http.MethodOptions
	if needsCSRF {
		csrfToken := h.addCSRFCookie(t, req)
		req.Header.Set("X-CSRF-Token", csrfToken)
	}

	return h.executeRequest(req)
}

// makeRequestRaw adds support for raw body requests with optional headers
func (h *testHarness) makeRequestRaw(t *testing.T, method, path string, body io.Reader, testUser *testUser, headers ...map[string]string) *httptest.ResponseRecorder {
	t.Helper()

	req := h.newRequestRaw(t, method, path, body)

	// Set custom headers if provided
	if len(headers) > 0 {
		for key, value := range headers[0] {
			req.Header.Set(key, value)
		}
	}

	h.addAuthCookies(t, req, testUser)

	needsCSRF := method != http.MethodGet && method != http.MethodHead && method != http.MethodOptions
	if needsCSRF {
		csrfToken := h.addCSRFCookie(t, req)
		req.Header.Set("X-CSRF-Token", csrfToken)
	}

	return h.executeRequest(req)
}

// makeUploadRequest creates a multipart form request for file uploads (single or multiple)
// For single file: use map with one entry, e.g., map[string]string{"file.txt": "content"}
// For multiple files: use map with multiple entries
// For empty form (no files): pass empty map
func (h *testHarness) makeUploadRequest(t *testing.T, path string, files map[string]string, testUser *testUser) *httptest.ResponseRecorder {
	t.Helper()

	// Create multipart form
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add all files
	for fileName, fileContent := range files {
		part, err := writer.CreateFormFile("files", fileName)
		if err != nil {
			t.Fatalf("Failed to create form file: %v", err)
		}

		_, err = part.Write([]byte(fileContent))
		if err != nil {
			t.Fatalf("Failed to write file content: %v", err)
		}
	}

	err := writer.Close()
	if err != nil {
		t.Fatalf("Failed to close multipart writer: %v", err)
	}

	headers := map[string]string{
		"Content-Type": writer.FormDataContentType(),
	}

	return h.makeRequestRaw(t, http.MethodPost, path, &buf, testUser, headers)
}
