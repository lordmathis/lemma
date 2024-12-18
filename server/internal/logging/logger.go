// Package logging provides a simple logging interface for the server.
package logging

import (
	"log/slog"
	"os"
	"reflect"
)

// Logger represents the interface for logging operations
type Logger interface {
	Debug(msg string, args ...any)
	Info(msg string, args ...any)
	Warn(msg string, args ...any)
	Error(msg string, args ...any)
	WithGroup(name string) Logger
	With(args ...any) Logger
}

// Implementation of the Logger interface using slog
type logger struct {
	logger *slog.Logger
}

// Logger is the global logger instance
var defaultLogger Logger

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

	defaultLogger = &logger{
		logger: slog.New(slog.NewTextHandler(os.Stdout, opts)),
	}
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

// Redact redacts sensitive fields from a struct based on the `log` struct tag
// if the tag is set to "redact" the field value is replaced with "[REDACTED]"
func Redact(v any) map[string]any {
	result := make(map[string]any)
	val := reflect.ValueOf(v)
	typ := val.Type()

	for i := 0; i < val.NumField(); i++ {
		field := typ.Field(i)
		if tag := field.Tag.Get("log"); tag != "" {
			switch tag {
			case "redact":
				result[field.Name] = "[REDACTED]"
			default:
				result[field.Name] = val.Field(i).Interface()
			}
		}
	}
	return result
}

// Implementation of Logger interface methods
func (l *logger) Debug(msg string, args ...any) {
	l.logger.Debug(msg, args...)
}

func (l *logger) Info(msg string, args ...any) {
	l.logger.Info(msg, args...)
}

func (l *logger) Warn(msg string, args ...any) {
	l.logger.Warn(msg, args...)
}

func (l *logger) Error(msg string, args ...any) {
	l.logger.Error(msg, args...)
}

func (l *logger) WithGroup(name string) Logger {
	return &logger{logger: l.logger.WithGroup(name)}
}

func (l *logger) With(args ...any) Logger {
	return &logger{logger: l.logger.With(args...)}
}

// Debug logs a debug message
func Debug(msg string, args ...any) {
	defaultLogger.Debug(msg, args...)
}

// Info logs an info message
func Info(msg string, args ...any) {
	defaultLogger.Info(msg, args...)
}

// Warn logs a warning message
func Warn(msg string, args ...any) {
	defaultLogger.Warn(msg, args...)
}

// Error logs an error message
func Error(msg string, args ...any) {
	defaultLogger.Error(msg, args...)
}

// WithGroup adds a group to the logger context
func WithGroup(name string) Logger {
	return defaultLogger.WithGroup(name)
}

// With adds key-value pairs to the logger context
func With(args ...any) Logger {
	return defaultLogger.With(args...)
}
