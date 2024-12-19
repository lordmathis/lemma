// Package auth provides JWT token generation and validation
package auth

import (
	"lemma/internal/logging"
	"net/http"
)

var logger logging.Logger

func getAuthLogger() logging.Logger {
	if logger == nil {
		logger = logging.WithGroup("auth")
	}
	return logger
}

func getCookieLogger() logging.Logger {
	return getAuthLogger().WithGroup("cookie")
}

// CookieManager interface defines methods for generating cookies
type CookieManager interface {
	GenerateAccessTokenCookie(token string) *http.Cookie
	GenerateRefreshTokenCookie(token string) *http.Cookie
	GenerateCSRFCookie(token string) *http.Cookie
	InvalidateCookie(cookieType string) *http.Cookie
}

// CookieService
type cookieManager struct {
	Domain   string
	Secure   bool
	SameSite http.SameSite
}

// NewCookieService creates a new cookie service
func NewCookieService(isDevelopment bool, domain string) CookieManager {
	log := getCookieLogger()

	secure := !isDevelopment
	var sameSite http.SameSite

	if isDevelopment {
		sameSite = http.SameSiteLaxMode
	} else {
		sameSite = http.SameSiteStrictMode
	}

	log.Debug("creating cookie service",
		"secure", secure,
		"sameSite", sameSite,
		"domain", domain)

	return &cookieManager{
		Domain:   domain,
		Secure:   secure,
		SameSite: sameSite,
	}
}

// GenerateAccessTokenCookie creates a new cookie for the access token
func (c *cookieManager) GenerateAccessTokenCookie(token string) *http.Cookie {
	log := getCookieLogger()
	log.Debug("generating access token cookie",
		"secure", c.Secure,
		"sameSite", c.SameSite,
		"maxAge", 900)

	return &http.Cookie{
		Name:     "access_token",
		Value:    token,
		HttpOnly: true,
		Secure:   c.Secure,
		SameSite: c.SameSite,
		Path:     "/",
		MaxAge:   900, // 15 minutes
	}
}

// GenerateRefreshTokenCookie creates a new cookie for the refresh token
func (c *cookieManager) GenerateRefreshTokenCookie(token string) *http.Cookie {
	log := getCookieLogger()
	log.Debug("generating refresh token cookie",
		"secure", c.Secure,
		"sameSite", c.SameSite,
		"maxAge", 604800)

	return &http.Cookie{
		Name:     "refresh_token",
		Value:    token,
		HttpOnly: true,
		Secure:   c.Secure,
		SameSite: c.SameSite,
		Path:     "/",
		MaxAge:   604800, // 7 days
	}
}

// GenerateCSRFCookie creates a new cookie for the CSRF token
func (c *cookieManager) GenerateCSRFCookie(token string) *http.Cookie {
	log := getCookieLogger()
	log.Debug("generating CSRF cookie",
		"secure", c.Secure,
		"sameSite", c.SameSite,
		"maxAge", 900,
		"httpOnly", false)

	return &http.Cookie{
		Name:     "csrf_token",
		Value:    token,
		HttpOnly: false, // Frontend needs to read this
		Secure:   c.Secure,
		SameSite: c.SameSite,
		Path:     "/",
		MaxAge:   900,
	}
}

// InvalidateCookie creates a new cookie with a MaxAge of -1 to invalidate the cookie
func (c *cookieManager) InvalidateCookie(cookieType string) *http.Cookie {
	log := getCookieLogger()
	log.Debug("invalidating cookie",
		"type", cookieType,
		"secure", c.Secure,
		"sameSite", c.SameSite)

	return &http.Cookie{
		Name:     cookieType,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   c.Secure,
		SameSite: c.SameSite,
	}
}
