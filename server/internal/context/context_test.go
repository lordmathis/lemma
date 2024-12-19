package context_test

import (
	stdctx "context"
	"net/http"
	"net/http/httptest"
	"testing"

	"novamd/internal/context"
	_ "novamd/internal/testenv"
)

func TestGetRequestContext(t *testing.T) {
	tests := []struct {
		name       string
		setupCtx   func() *context.HandlerContext
		wantStatus int
		wantOK     bool
	}{
		{
			name: "valid context",
			setupCtx: func() *context.HandlerContext {
				return &context.HandlerContext{
					UserID:   1,
					UserRole: "admin",
				}
			},
			wantStatus: http.StatusOK,
			wantOK:     true,
		},
		{
			name: "missing context",
			setupCtx: func() *context.HandlerContext {
				return nil
			},
			wantStatus: http.StatusInternalServerError,
			wantOK:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test request
			req := httptest.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()

			if ctx := tt.setupCtx(); ctx != nil {
				req = context.WithHandlerContext(req, ctx)
			}

			gotCtx, ok := context.GetRequestContext(w, req)

			if ok != tt.wantOK {
				t.Errorf("GetRequestContext() ok = %v, want %v", ok, tt.wantOK)
			}

			if !tt.wantOK {
				if w.Code != tt.wantStatus {
					t.Errorf("GetRequestContext() status = %v, want %v", w.Code, tt.wantStatus)
				}
				return
			}

			if gotCtx.UserID != tt.setupCtx().UserID {
				t.Errorf("GetRequestContext() UserID = %v, want %v", gotCtx.UserID, tt.setupCtx().UserID)
			}

			if gotCtx.UserRole != tt.setupCtx().UserRole {
				t.Errorf("GetRequestContext() UserRole = %v, want %v", gotCtx.UserRole, tt.setupCtx().UserRole)
			}
		})
	}
}

func TestGetUserFromContext(t *testing.T) {
	tests := []struct {
		name      string
		setupCtx  func() stdctx.Context
		wantUser  *context.UserClaims
		wantError bool
	}{
		{
			name: "valid user context",
			setupCtx: func() stdctx.Context {
				return stdctx.WithValue(stdctx.Background(), context.HandlerContextKey, &context.HandlerContext{
					UserID:   1,
					UserRole: "admin",
				})
			},
			wantUser: &context.UserClaims{
				UserID: 1,
				Role:   "admin",
			},
			wantError: false,
		},
		{
			name: "missing context",
			setupCtx: func() stdctx.Context {
				return stdctx.Background()
			},
			wantUser:  nil,
			wantError: true,
		},
		{
			name: "invalid context type",
			setupCtx: func() stdctx.Context {
				return stdctx.WithValue(stdctx.Background(), context.HandlerContextKey, "invalid")
			},
			wantUser:  nil,
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := tt.setupCtx()
			gotUser, err := context.GetUserFromContext(ctx)

			if tt.wantError {
				if err == nil {
					t.Error("GetUserFromContext() error = nil, want error")
				}
				return
			}

			if err != nil {
				t.Errorf("GetUserFromContext() unexpected error = %v", err)
				return
			}

			if gotUser.UserID != tt.wantUser.UserID {
				t.Errorf("GetUserFromContext() UserID = %v, want %v", gotUser.UserID, tt.wantUser.UserID)
			}

			if gotUser.Role != tt.wantUser.Role {
				t.Errorf("GetUserFromContext() Role = %v, want %v", gotUser.Role, tt.wantUser.Role)
			}
		})
	}
}
