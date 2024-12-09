// Package auth_test provides tests for the auth package
package auth_test

import (
	"testing"
	"time"

	"novamd/internal/auth"
)

// jwt_test.go tests

func TestNewJWTService(t *testing.T) {
	testCases := []struct {
		name    string
		config  auth.JWTConfig
		wantErr bool
	}{
		{
			name: "valid configuration",
			config: auth.JWTConfig{
				SigningKey:         "test-key",
				AccessTokenExpiry:  15 * time.Minute,
				RefreshTokenExpiry: 24 * time.Hour,
			},
			wantErr: false,
		},
		{
			name: "missing signing key",
			config: auth.JWTConfig{
				AccessTokenExpiry:  15 * time.Minute,
				RefreshTokenExpiry: 24 * time.Hour,
			},
			wantErr: true,
		},
		{
			name: "zero expiry times",
			config: auth.JWTConfig{
				SigningKey: "test-key",
			},
			wantErr: false, // Should use default values
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			service, err := auth.NewJWTService(tc.config)
			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if service == nil {
				t.Error("expected service, got nil")
			}
		})
	}
}

func TestGenerateAndValidateToken(t *testing.T) {
	config := auth.JWTConfig{
		SigningKey:         "test-key",
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 24 * time.Hour,
	}
	service, _ := auth.NewJWTService(config)

	testCases := []struct {
		name      string
		userID    int
		role      string
		tokenType auth.TokenType
		wantErr   bool
	}{
		{
			name:      "valid access token",
			userID:    1,
			role:      "admin",
			tokenType: auth.AccessToken,
			wantErr:   false,
		},
		{
			name:      "valid refresh token",
			userID:    1,
			role:      "editor",
			tokenType: auth.RefreshToken,
			wantErr:   false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var token string
			var err error

			// Generate token based on type
			if tc.tokenType == auth.AccessToken {
				token, err = service.GenerateAccessToken(tc.userID, tc.role, "")
			} else {
				token, err = service.GenerateRefreshToken(tc.userID, tc.role, "")
			}

			if err != nil {
				t.Fatalf("failed to generate token: %v", err)
			}

			// Validate token
			claims, err := service.ValidateToken(token)
			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			// Verify claims
			if claims.UserID != tc.userID {
				t.Errorf("userID = %v, want %v", claims.UserID, tc.userID)
			}
			if claims.Role != tc.role {
				t.Errorf("role = %v, want %v", claims.Role, tc.role)
			}
			if claims.Type != tc.tokenType {
				t.Errorf("type = %v, want %v", claims.Type, tc.tokenType)
			}
		})
	}
}
