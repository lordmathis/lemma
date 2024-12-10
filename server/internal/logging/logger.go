// Package logging provides a logging interface for the application.
package logging

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

// LogLevel defines the severity of a log message
type LogLevel int

// Log levels
const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
)

func (l LogLevel) String() string {
	switch l {
	case DEBUG:
		return "DEBUG"
	case INFO:
		return "INFO"
	case WARN:
		return "WARN"
	case ERROR:
		return "ERROR"
	default:
		return "INFO"
	}
}

// ParseLogLevel converts a string to a LogLevel
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

// Logger defines the interface for all logging operations
type Logger interface {
	// Standard logging
	Debug(msg string, fields map[string]interface{})
	Info(msg string, fields map[string]interface{})
	Warn(msg string, fields map[string]interface{})
	Error(err error, fields map[string]interface{})

	// Audit logging (always at INFO level)
	Audit(userID int, workspaceID int, action, resource string, details map[string]interface{})

	// Security logging (with levels)
	Security(level LogLevel, userID int, event string, details map[string]interface{})

	// Close closes all outputs
	Close() error
}

type logger struct {
	logDir      string
	minLevel    LogLevel
	consoleOut  bool
	appOutput   io.Writer // Combined output for application logs
	auditOutput io.Writer // Output for audit logs
	secOutput   io.Writer // Output for security logs
}

type logEntry struct {
	Timestamp time.Time
	Level     LogLevel
	Message   string
	Fields    map[string]interface{}
}

// New creates a new Logger instance
func New(logDir string, minLevel LogLevel, consoleOut bool) (Logger, error) {
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	l := &logger{
		logDir:     logDir,
		minLevel:   minLevel,
		consoleOut: consoleOut,
	}

	// Setup application log output
	appFile, err := os.OpenFile(
		filepath.Join(logDir, "app.log"),
		os.O_APPEND|os.O_CREATE|os.O_WRONLY,
		0644,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to open app log file: %w", err)
	}

	// Setup audit log output
	auditFile, err := os.OpenFile(
		filepath.Join(logDir, "audit.log"),
		os.O_APPEND|os.O_CREATE|os.O_WRONLY,
		0644,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to open audit log file: %w", err)
	}

	// Setup security log output
	securityFile, err := os.OpenFile(
		filepath.Join(logDir, "security.log"),
		os.O_APPEND|os.O_CREATE|os.O_WRONLY,
		0644,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to open security log file: %w", err)
	}

	// Configure outputs
	l.appOutput = appFile
	if consoleOut {
		l.appOutput = io.MultiWriter(appFile, os.Stdout)
	}

	l.auditOutput = auditFile
	l.secOutput = io.MultiWriter(securityFile, os.Stderr) // Security logs always go to stderr

	return l, nil
}

// writeToOutput writes to the output and handles errors appropriately
func (l *logger) writeOutput(w io.Writer, format string, args ...interface{}) {
	_, err := fmt.Fprintf(w, format, args...)
	if err != nil {
		// Log to stderr if writing fails
		fmt.Fprintf(os.Stderr, "logging error: %v\n", err)
	}
}

func (l *logger) logApp(level LogLevel, msg string, fields map[string]interface{}) {
	if level < l.minLevel {
		return
	}

	entry := logEntry{
		Timestamp: time.Now(),
		Level:     level,
		Message:   msg,
		Fields:    fields,
	}

	l.writeOutput(l.appOutput, "[%s] [%s] %s%s\n",
		entry.Timestamp.Format(time.RFC3339),
		entry.Level,
		entry.Message,
		formatFields(entry.Fields),
	)
}

// Debug logs a debug message
func (l *logger) Debug(msg string, fields map[string]interface{}) {
	l.logApp(DEBUG, msg, fields)
}

// Info logs an informational message
func (l *logger) Info(msg string, fields map[string]interface{}) {
	l.logApp(INFO, msg, fields)
}

// Warn logs a warning message
func (l *logger) Warn(msg string, fields map[string]interface{}) {
	l.logApp(WARN, msg, fields)
}

// Error logs an error message
func (l *logger) Error(err error, fields map[string]interface{}) {
	if fields == nil {
		fields = make(map[string]interface{})
	}
	fields["error"] = err.Error()
	l.logApp(ERROR, "error occurred", fields)
}

// Audit logs an audit event
func (l *logger) Audit(userID int, workspaceID int, action, resource string, details map[string]interface{}) {
	if details == nil {
		details = make(map[string]interface{})
	}
	details["user_id"] = userID
	details["workspace_id"] = workspaceID
	details["action"] = action
	details["resource"] = resource

	l.writeOutput(l.auditOutput, "[%s] [AUDIT] %s on %s%s\n",
		time.Now().Format(time.RFC3339),
		action,
		resource,
		formatFields(details),
	)
}

// Security logs a security event
func (l *logger) Security(level LogLevel, userID int, event string, details map[string]interface{}) {
	if level < l.minLevel {
		return
	}

	l.writeOutput(l.secOutput, "[%s] [%s] [%d] [SECURITY] %s%s\n",
		time.Now().Format(time.RFC3339),
		level,
		userID,
		event,
		formatFields(details),
	)
}

func (l *logger) Close() error {
	var errs []error

	if closer, ok := l.appOutput.(io.Closer); ok {
		if err := closer.Close(); err != nil {
			errs = append(errs, fmt.Errorf("failed to close app output: %w", err))
		}
	}

	if closer, ok := l.auditOutput.(io.Closer); ok {
		if err := closer.Close(); err != nil {
			errs = append(errs, fmt.Errorf("failed to close audit output: %w", err))
		}
	}

	if closer, ok := l.secOutput.(io.Closer); ok {
		if err := closer.Close(); err != nil {
			errs = append(errs, fmt.Errorf("failed to close security output: %w", err))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("failed to close some outputs: %v", errs)
	}
	return nil
}

func formatFields(fields map[string]interface{}) string {
	if len(fields) == 0 {
		return ""
	}
	return fmt.Sprintf(" - Fields: %v", fields)
}
