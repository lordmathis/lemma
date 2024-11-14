package testutils

import (
	"testing"
)

// TestCase defines a generic test case structure that can be used across packages
type TestCase struct {
	Name     string
	Setup    func(t *testing.T, fixtures any)
	Fixtures any
	Validate func(t *testing.T, result any, err error)
}
