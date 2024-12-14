// Package logging provides a simple logging interface for the server.
package logging

import (
	"log/slog"
	"os"
)

// Logger is the global logger instance
var Logger *slog.Logger

// LogLevel represents the log level
type LogLevel slog.Level

// Log levels
const (
	DEBUG LogLevel = LogLevel(slog.LevelDebug)
	INFO  LogLevel = LogLevel(slog.LevelInfo)
	WARN  LogLevel = LogLevel(slog.LevelWarn)
	ERROR LogLevel = LogLevel(slog.LevelError)
)

// Setup initializes the logger with the given minimum log level
func Setup(minLevel LogLevel) {
	opts := &slog.HandlerOptions{
		Level: slog.Level(minLevel),
	}

	Logger = slog.New(slog.NewTextHandler(os.Stdout, opts))
}

// ParseLogLevel converts a string to a LogLevel
func ParseLogLevel(level string) LogLevel {
	switch level {
	case "debug":
		return DEBUG
	case "warn":
		return WARN
	case "error":
		return ERROR
	default:
		return INFO
	}
}

// Debug logs a debug message
func Debug(msg string, args ...any) {
	Logger.Debug(msg, args...)
}

// Info logs an info message
func Info(msg string, args ...any) {
	Logger.Info(msg, args...)
}

// Warn logs a warning message
func Warn(msg string, args ...any) {
	Logger.Warn(msg, args...)
}

// Error logs an error message
func Error(msg string, args ...any) {
	Logger.Error(msg, args...)
}

// WithGroup adds a group to the logger context
func WithGroup(name string) *slog.Logger {
	return Logger.WithGroup(name)
}

// With adds key-value pairs to the logger context
func With(args ...any) *slog.Logger {
	return Logger.With(args...)
}
