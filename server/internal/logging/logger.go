// Package logging provides a structured logging interface for the application.
package logging

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"time"
)

// LogLevel represents the logging level
type LogLevel slog.Level

// Log levels
const (
	DEBUG LogLevel = LogLevel(slog.LevelDebug)
	INFO  LogLevel = LogLevel(slog.LevelInfo)
	WARN  LogLevel = LogLevel(slog.LevelWarn)
	ERROR LogLevel = LogLevel(slog.LevelError)
)

// Logger defines the interface for logging operations
type Logger interface {
	App() *slog.Logger      // Returns logger for application logs
	Audit() *slog.Logger    // Returns logger for audit logs
	Security() *slog.Logger // Returns logger for security logs
	Close() error           // Cleanup and close log files
}

// logger implements the Logger interface
type logger struct {
	appLogger      *slog.Logger
	auditLogger    *slog.Logger
	securityLogger *slog.Logger
	files          []*os.File // Keep track of open file handles
}

// Output represents a destination for logs
type Output struct {
	Type   OutputFormat
	Writer io.Writer
}

// OutputFormat represents the format of the log output
type OutputFormat int

const (
	OutputTypeJSON OutputFormat = iota // OutputTypeJSON JSON format
	OutputTypeText                     // OutputTypeText text format
)

// createLogFile creates a log file with the given name in the log directory
func createLogFile(logDir, name string) (*os.File, error) {
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	filename := filepath.Join(logDir, fmt.Sprintf("%s.log", name))
	file, err := os.OpenFile(filename, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}

	return file, nil
}

// createLogger creates a new slog.Handler for the given outputs and options
func createLogger(opts *slog.HandlerOptions, outputs []Output) slog.Handler {
	if len(outputs) == 0 {
		return slog.NewTextHandler(io.Discard, opts)
	}

	if len(outputs) == 1 {
		output := outputs[0]
		if output.Type == OutputTypeJSON {
			return slog.NewJSONHandler(output.Writer, opts)
		}
		return slog.NewTextHandler(output.Writer, opts)
	}

	// Multiple outputs - create handlers for each
	handlers := make([]slog.Handler, 0, len(outputs))
	for _, output := range outputs {
		if output.Type == OutputTypeJSON {
			handlers = append(handlers, slog.NewJSONHandler(output.Writer, opts))
		} else {
			handlers = append(handlers, slog.NewTextHandler(output.Writer, opts))
		}
	}

	return multiHandler(handlers)
}

// ParseLogLevel parses a string into a LogLevel
func ParseLogLevel(level string) (LogLevel, error) {
	switch level {
	case "DEBUG":
		return DEBUG, nil
	case "INFO":
		return INFO, nil
	case "WARN":
		return WARN, nil
	case "ERROR":
		return ERROR, nil
	default:
		return INFO, fmt.Errorf("invalid log level: %s", level)
	}
}

// New creates a new Logger instance
func New(logDir string, minLevel LogLevel, consoleOut bool) (Logger, error) {
	l := &logger{
		files: make([]*os.File, 0, 3),
	}

	// Define our log types and their filenames
	logTypes := []struct {
		name      string
		setLogger func(*slog.Logger)
	}{
		{"app", func(lg *slog.Logger) { l.appLogger = lg }},
		{"audit", func(lg *slog.Logger) { l.auditLogger = lg }},
		{"security", func(lg *slog.Logger) { l.securityLogger = lg }},
	}

	// Setup handlers options
	opts := &slog.HandlerOptions{
		Level:     slog.Level(minLevel),
		AddSource: slog.Level(minLevel) == slog.LevelDebug,
		ReplaceAttr: func(_ []string, a slog.Attr) slog.Attr {
			if a.Key == slog.TimeKey {
				return slog.Attr{
					Key:   a.Key,
					Value: slog.StringValue(time.Now().UTC().Format(time.RFC3339)),
				}
			}
			return a
		},
	}

	// Create loggers for each type
	for _, lt := range logTypes {
		// Create file output
		file, err := createLogFile(logDir, lt.name)
		if err != nil {
			if err := l.Close(); err != nil {
				return nil, fmt.Errorf("failed to close logger: %w", err)
			}
			return nil, fmt.Errorf("failed to create %s log file: %w", lt.name, err)
		}
		l.files = append(l.files, file)

		// Prepare outputs
		outputs := []Output{{Type: OutputTypeJSON, Writer: file}}
		if consoleOut {
			outputs = append(outputs, Output{Type: OutputTypeText, Writer: os.Stdout})
		}

		// Create and set logger
		handler := createLogger(opts, outputs)
		lt.setLogger(slog.New(handler))
	}

	return l, nil
}

func (l *logger) App() *slog.Logger {
	return l.appLogger
}

func (l *logger) Audit() *slog.Logger {
	return l.auditLogger
}

func (l *logger) Security() *slog.Logger {
	return l.securityLogger
}

func (l *logger) Close() error {
	var lastErr error
	for _, file := range l.files {
		if file != nil {
			if err := file.Close(); err != nil {
				lastErr = err
			}
		}
	}
	return lastErr
}

// multiHandler implements slog.Handler for multiple outputs
type multiHandler []slog.Handler

func (h multiHandler) Enabled(ctx context.Context, level slog.Level) bool {
	for _, handler := range h {
		if handler.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (h multiHandler) Handle(ctx context.Context, r slog.Record) error {
	for _, handler := range h {
		if err := handler.Handle(ctx, r); err != nil {
			return err
		}
	}
	return nil
}

func (h multiHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	handlers := make([]slog.Handler, len(h))
	for i, handler := range h {
		handlers[i] = handler.WithAttrs(attrs)
	}
	return multiHandler(handlers)
}

func (h multiHandler) WithGroup(name string) slog.Handler {
	handlers := make([]slog.Handler, len(h))
	for i, handler := range h {
		handlers[i] = handler.WithGroup(name)
	}
	return multiHandler(handlers)
}
