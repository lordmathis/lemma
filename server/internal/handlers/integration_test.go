//go:build integration

package handlers_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"novamd/internal/app"
	"novamd/internal/auth"
	"novamd/internal/db"
	"novamd/internal/git"
	"novamd/internal/models"
	"novamd/internal/secrets"
	"novamd/internal/storage"
)

// testHarness encapsulates all the dependencies needed for testing
type testHarness struct {
	Server         *app.Server
	DB             db.TestDatabase
	Storage        storage.Manager
	JWTManager     auth.JWTManager
	SessionManager auth.SessionManager
	CookieManager  auth.CookieManager
	AdminUser      *models.User
	AdminSession   *models.Session
	RegularUser    *models.User
	RegularSession *models.Session
	TempDirectory  string
	MockGit        *MockGitClient
}

// setupTestHarness creates a new test environment
func setupTestHarness(t *testing.T) *testHarness {
	t.Helper()

	// Create temporary directory for test files
	tempDir, err := os.MkdirTemp("", "novamd-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}

	// Initialize test database
	secretsSvc, err := secrets.NewService("YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=") // test key
	if err != nil {
		t.Fatalf("Failed to initialize secrets service: %v", err)
	}

	database, err := db.NewTestDB(":memory:", secretsSvc)
	if err != nil {
		t.Fatalf("Failed to initialize test database: %v", err)
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
		DBPath:        ":memory:",
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
	adminUser, adminSession := h.createTestUser(t, "admin@test.com", "admin123", models.RoleAdmin)
	regularUser, regularSession := h.createTestUser(t, "user@test.com", "user123", models.RoleEditor)

	h.AdminUser = adminUser
	h.AdminSession = adminSession
	h.RegularUser = regularUser
	h.RegularSession = regularSession

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

// createTestUser creates a test user and returns the user and access token
func (h *testHarness) createTestUser(t *testing.T, email, password string, role models.UserRole) (*models.User, *models.Session) {
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

	session, _, err := h.SessionManager.CreateSession(user.ID, string(user.Role))
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	return user, session
}

func (h *testHarness) newRequest(t *testing.T, method, path string, body interface{}) *http.Request {
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
func (h *testHarness) addAuthCookies(t *testing.T, req *http.Request, session *models.Session, addCSRF bool) string {
	t.Helper()

	if session == nil {
		return ""
	}

	accessToken, err := h.JWTManager.GenerateAccessToken(session.UserID, "admin")
	if err != nil {
		t.Fatalf("Failed to generate access token: %v", err)
	}

	req.AddCookie(h.CookieManager.GenerateAccessTokenCookie(accessToken))
	req.AddCookie(h.CookieManager.GenerateRefreshTokenCookie(session.RefreshToken))

	if addCSRF {
		csrfToken := "test-csrf-token"
		req.AddCookie(h.CookieManager.GenerateCSRFCookie(csrfToken))
		return csrfToken
	}
	return ""
}

// makeRequest is the main helper for making JSON requests
func (h *testHarness) makeRequest(t *testing.T, method, path string, body interface{}, session *models.Session) *httptest.ResponseRecorder {
	t.Helper()

	req := h.newRequest(t, method, path, body)

	if session != nil {
		needsCSRF := method != http.MethodGet && method != http.MethodHead && method != http.MethodOptions
		csrfToken := h.addAuthCookies(t, req, session, needsCSRF)
		if needsCSRF {
			req.Header.Set("X-CSRF-Token", csrfToken)
		}
	}

	return h.executeRequest(req)
}

// makeRequestRawWithHeaders adds support for custom headers with raw body
func (h *testHarness) makeRequestRaw(t *testing.T, method, path string, body io.Reader, session *models.Session) *httptest.ResponseRecorder {
	t.Helper()

	req := h.newRequestRaw(t, method, path, body)

	if session != nil {
		needsCSRF := method != http.MethodGet && method != http.MethodHead && method != http.MethodOptions
		csrfToken := h.addAuthCookies(t, req, session, needsCSRF)
		if needsCSRF {
			req.Header.Set("X-CSRF-Token", csrfToken)
		}
	}

	return h.executeRequest(req)
}
