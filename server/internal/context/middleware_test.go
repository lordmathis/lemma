package context_test

import (
	stdctx "context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"

	"novamd/internal/context"
	"novamd/internal/models"
)

// MockDB implements the minimal database interface needed for testing
type MockDB struct {
	GetWorkspaceByNameFunc func(userID int, workspaceName string) (*models.Workspace, error)
}

func (m *MockDB) GetWorkspaceByName(userID int, workspaceName string) (*models.Workspace, error) {
	return m.GetWorkspaceByNameFunc(userID, workspaceName)
}

func (m *MockDB) GetWorkspaceByID(_ int) (*models.Workspace, error) {
	return nil, nil
}

func (m *MockDB) GetWorkspacesByUserID(_ int) ([]*models.Workspace, error) {
	return nil, nil
}

func (m *MockDB) GetAllWorkspaces() ([]*models.Workspace, error) {
	return nil, nil
}

func TestWithUserContextMiddleware(t *testing.T) {
	tests := []struct {
		name       string
		setupCtx   func() *context.HandlerContext
		wantStatus int
		wantNext   bool
	}{
		{
			name: "valid user context",
			setupCtx: func() *context.HandlerContext {
				return &context.HandlerContext{
					UserID:   1,
					UserRole: "admin",
				}
			},
			wantStatus: http.StatusOK,
			wantNext:   true,
		},
		{
			name: "missing user context",
			setupCtx: func() *context.HandlerContext {
				return nil
			},
			wantStatus: http.StatusUnauthorized,
			wantNext:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()

			if ctx := tt.setupCtx(); ctx != nil {
				req = context.WithHandlerContext(req, ctx)
			}

			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			})

			middleware := context.WithUserContextMiddleware(next)
			middleware.ServeHTTP(w, req)

			if nextCalled != tt.wantNext {
				t.Errorf("WithUserContextMiddleware() next called = %v, want %v", nextCalled, tt.wantNext)
			}

			if w.Code != tt.wantStatus {
				t.Errorf("WithUserContextMiddleware() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestWithWorkspaceContextMiddleware(t *testing.T) {
	tests := []struct {
		name          string
		setupCtx      func() *context.HandlerContext
		workspaceName string
		mockWorkspace *models.Workspace
		mockError     error
		wantStatus    int
		wantNext      bool
	}{
		{
			name: "valid workspace context",
			setupCtx: func() *context.HandlerContext {
				return &context.HandlerContext{
					UserID:   1,
					UserRole: "admin",
				}
			},
			workspaceName: "test-workspace",
			mockWorkspace: &models.Workspace{
				ID:     1,
				UserID: 1,
				Name:   "test-workspace",
			},
			mockError:  nil,
			wantStatus: http.StatusOK,
			wantNext:   true,
		},
		{
			name: "workspace not found",
			setupCtx: func() *context.HandlerContext {
				return &context.HandlerContext{
					UserID:   1,
					UserRole: "admin",
				}
			},
			workspaceName: "nonexistent",
			mockWorkspace: nil,
			mockError:     sql.ErrNoRows,
			wantStatus:    http.StatusNotFound,
			wantNext:      false,
		},
		{
			name:          "missing user context",
			setupCtx:      func() *context.HandlerContext { return nil },
			workspaceName: "test-workspace",
			mockWorkspace: nil,
			mockError:     nil,
			wantStatus:    http.StatusInternalServerError,
			wantNext:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockDB := &MockDB{
				GetWorkspaceByNameFunc: func(_ int, _ string) (*models.Workspace, error) {
					return tt.mockWorkspace, tt.mockError
				},
			}

			req := httptest.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()

			if ctx := tt.setupCtx(); ctx != nil {
				req = context.WithHandlerContext(req, ctx)
			}

			// Add workspace name to request context via chi URL params
			req = req.WithContext(stdctx.WithValue(req.Context(), "workspaceName", tt.workspaceName))

			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)

				// Verify workspace was added to context
				if tt.mockWorkspace != nil {
					ctx, ok := context.GetRequestContext(w, r)
					if !ok {
						t.Error("Failed to get request context in next handler")
						return
					}
					if ctx.Workspace == nil {
						t.Error("Workspace not set in context")
						return
					}
					if ctx.Workspace.ID != tt.mockWorkspace.ID {
						t.Errorf("Workspace ID = %v, want %v", ctx.Workspace.ID, tt.mockWorkspace.ID)
					}
				}
			})

			middleware := context.WithWorkspaceContextMiddleware(mockDB)(next)
			middleware.ServeHTTP(w, req)

			if nextCalled != tt.wantNext {
				t.Errorf("WithWorkspaceContextMiddleware() next called = %v, want %v", nextCalled, tt.wantNext)
			}

			if w.Code != tt.wantStatus {
				t.Errorf("WithWorkspaceContextMiddleware() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}
