// Package auth provides JWT token generation and validation
package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

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
	GenerateAccessToken(userID int, role string) (string, error)
	GenerateRefreshToken(userID int, role string) (string, error)
	ValidateToken(tokenString string) (*Claims, error)
	RefreshAccessToken(refreshToken string) (string, error)
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
		config.AccessTokenExpiry = 15 * time.Minute // Default to 15 minutes
	}
	if config.RefreshTokenExpiry == 0 {
		config.RefreshTokenExpiry = 7 * 24 * time.Hour // Default to 7 days
	}
	return &jwtService{config: config}, nil
}

// GenerateAccessToken creates a new access token for a user
// Parameters:
// - userID: the ID of the user
// - role: the role of the user
// Returns the signed token string or an error
func (s *jwtService) GenerateAccessToken(userID int, role string) (string, error) {
	return s.generateToken(userID, role, AccessToken, s.config.AccessTokenExpiry)
}

// GenerateRefreshToken creates a new refresh token for a user
// Parameters:
// - userID: the ID of the user
// - role: the role of the user
// Returns the signed token string or an error
func (s *jwtService) GenerateRefreshToken(userID int, role string) (string, error) {
	return s.generateToken(userID, role, RefreshToken, s.config.RefreshTokenExpiry)
}

// generateToken is an internal helper function that creates a new JWT token
// Parameters:
// - userID: the ID of the user
// - role: the role of the user
// - tokenType: the type of token (access or refresh)
// - expiry: how long the token should be valid
// Returns the signed token string or an error
func (s *jwtService) generateToken(userID int, role string, tokenType TokenType, expiry time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
		UserID: userID,
		Role:   role,
		Type:   tokenType,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.SigningKey))
}

// ValidateToken validates and parses a JWT token
// Parameters:
// - tokenString: the token to validate
// Returns the token claims if valid, or an error if invalid
func (s *jwtService) ValidateToken(tokenString string) (*Claims, error) {
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

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}

// RefreshAccessToken creates a new access token using a refresh token
// Parameters:
// - refreshToken: the refresh token to use
// Returns a new access token if the refresh token is valid, or an error
func (s *jwtService) RefreshAccessToken(refreshToken string) (string, error) {
	claims, err := s.ValidateToken(refreshToken)
	if err != nil {
		return "", fmt.Errorf("invalid refresh token: %w", err)
	}

	if claims.Type != RefreshToken {
		return "", fmt.Errorf("invalid token type: expected refresh token")
	}

	return s.GenerateAccessToken(claims.UserID, claims.Role)
}
