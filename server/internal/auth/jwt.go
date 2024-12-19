// Package auth provides JWT token generation and validation
package auth

import (
	"crypto/rand"
	"fmt"
	"novamd/internal/logging"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func getJWTLogger() logging.Logger {
	return getAuthLogger().WithGroup("jwt")
}

// TokenType represents the type of JWT token (access or refresh)
type TokenType string

const (
	AccessToken  TokenType = "access"  // AccessToken - Short-lived token for API access
	RefreshToken TokenType = "refresh" // RefreshToken - Long-lived token for obtaining new access tokens
)

// Claims represents the custom claims we store in JWT tokens
type Claims struct {
	jwt.RegisteredClaims           // Embedded standard JWT claims
	UserID               int       `json:"uid"`  // User identifier
	Role                 string    `json:"role"` // User role (admin, editor, viewer)
	Type                 TokenType `json:"type"` // Token type (access or refresh)
}

// JWTConfig holds the configuration for the JWT service
type JWTConfig struct {
	SigningKey         string        // Secret key used to sign tokens
	AccessTokenExpiry  time.Duration // How long access tokens are valid
	RefreshTokenExpiry time.Duration // How long refresh tokens are valid
}

// JWTManager defines the interface for managing JWT tokens
type JWTManager interface {
	GenerateAccessToken(userID int, role string, sessionID string) (string, error)
	GenerateRefreshToken(userID int, role string, sessionID string) (string, error)
	ValidateToken(tokenString string) (*Claims, error)
}

// jwtService handles JWT token generation and validation
type jwtService struct {
	config JWTConfig
}

// NewJWTService creates a new JWT service with the provided configuration
// Returns an error if the signing key is missing
func NewJWTService(config JWTConfig) (JWTManager, error) {
	if config.SigningKey == "" {
		return nil, fmt.Errorf("signing key is required")
	}

	// Set default expiry times if not provided
	if config.AccessTokenExpiry == 0 {
		config.AccessTokenExpiry = 15 * time.Minute
	}
	if config.RefreshTokenExpiry == 0 {
		config.RefreshTokenExpiry = 7 * 24 * time.Hour
	}

	return &jwtService{config: config}, nil
}

// GenerateAccessToken creates a new access token for a user with the given userID and role
func (s *jwtService) GenerateAccessToken(userID int, role, sessionID string) (string, error) {
	return s.generateToken(userID, role, sessionID, AccessToken, s.config.AccessTokenExpiry)
}

// GenerateRefreshToken creates a new refresh token for a user with the given userID and role
func (s *jwtService) GenerateRefreshToken(userID int, role, sessionID string) (string, error) {
	return s.generateToken(userID, role, sessionID, RefreshToken, s.config.RefreshTokenExpiry)
}

// generateToken is an internal helper function that creates a new JWT token
func (s *jwtService) generateToken(userID int, role string, sessionID string, tokenType TokenType, expiry time.Duration) (string, error) {
	now := time.Now()

	// Add a random nonce to ensure uniqueness
	nonce := make([]byte, 8)
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        sessionID,
		},
		UserID: userID,
		Role:   role,
		Type:   tokenType,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(s.config.SigningKey))
	if err != nil {
		return "", err
	}

	return signedToken, nil
}

// ValidateToken validates and parses a JWT token
func (s *jwtService) ValidateToken(tokenString string) (*Claims, error) {
	log := getJWTLogger()

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.SigningKey), nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	log.Debug("token validated",
		"userId", claims.UserID,
		"role", claims.Role,
		"tokenType", claims.Type,
		"expiresAt", claims.ExpiresAt)

	return claims, nil
}
