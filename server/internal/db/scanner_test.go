package db_test

import (
	"database/sql"
	"testing"
	"time"

	"lemma/internal/db"
)

func TestScannerQueryRow(t *testing.T) {
	mockSecrets := &mockSecretsService{}
	testDB, err := db.NewTestDB(mockSecrets)
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer testDB.Close()

	// Create a test table
	_, err = testDB.TestDB().Exec(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY,
			email TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL,
			active BOOLEAN NOT NULL
		)
	`)
	if err != nil {
		t.Fatalf("Failed to create test table: %v", err)
	}

	type User struct {
		ID        int
		Email     string
		CreatedAt time.Time
		Active    bool
	}

	// Insert test data
	now := time.Now().UTC().Truncate(time.Second)
	_, err = testDB.TestDB().Exec(
		"INSERT INTO users (id, email, created_at, active) VALUES (?, ?, ?, ?)",
		1, "test@example.com", now, true,
	)
	if err != nil {
		t.Fatalf("Failed to insert test data: %v", err)
	}

	// Test query row success
	t.Run("QueryRow success", func(t *testing.T) {
		scanner := db.NewScanner(testDB.TestDB(), db.DBTypeSQLite)
		q := db.NewQuery(db.DBTypeSQLite)
		q.Select("id", "email", "created_at", "active").
			From("users").
			Where("id = ").
			Placeholder(1)

		var user User
		err := scanner.QueryRow(&user, q)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}

		if user.ID != 1 {
			t.Errorf("Expected ID 1, got %d", user.ID)
		}
		if user.Email != "test@example.com" {
			t.Errorf("Expected Email test@example.com, got %s", user.Email)
		}
		if !user.CreatedAt.Equal(now) {
			t.Errorf("Expected CreatedAt %v, got %v", now, user.CreatedAt)
		}
		if !user.Active {
			t.Errorf("Expected Active true, got %v", user.Active)
		}
	})

	// Test query row no results
	t.Run("QueryRow no results", func(t *testing.T) {
		scanner := db.NewScanner(testDB.TestDB(), db.DBTypeSQLite)
		q := db.NewQuery(db.DBTypeSQLite)
		q.Select("id", "email", "created_at", "active").
			From("users").
			Where("id = ").
			Placeholder(999)

		var user User
		err := scanner.QueryRow(&user, q)

		if err != sql.ErrNoRows {
			t.Errorf("Expected ErrNoRows, got %v", err)
		}
	})

	// Test scanning a single value
	t.Run("QueryRow single value", func(t *testing.T) {
		scanner := db.NewScanner(testDB.TestDB(), db.DBTypeSQLite)
		q := db.NewQuery(db.DBTypeSQLite)
		q.Select("COUNT(*)").From("users")

		var count int
		err := scanner.QueryRow(&count, q)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}

		if count != 1 {
			t.Errorf("Expected count 1, got %d", count)
		}
	})
}

func TestScannerQuery(t *testing.T) {
	mockSecrets := &mockSecretsService{}
	testDB, err := db.NewTestDB(mockSecrets)
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer testDB.Close()

	// Create a test table
	_, err = testDB.TestDB().Exec(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY,
			email TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL,
			active BOOLEAN NOT NULL
		)
	`)
	if err != nil {
		t.Fatalf("Failed to create test table: %v", err)
	}

	type User struct {
		ID        int
		Email     string
		CreatedAt time.Time
		Active    bool
	}

	// Insert test data
	now := time.Now().UTC().Truncate(time.Second)
	testUsers := []User{
		{ID: 1, Email: "user1@example.com", CreatedAt: now, Active: true},
		{ID: 2, Email: "user2@example.com", CreatedAt: now, Active: false},
		{ID: 3, Email: "user3@example.com", CreatedAt: now, Active: true},
	}

	for _, user := range testUsers {
		_, err = testDB.TestDB().Exec(
			"INSERT INTO users (id, email, created_at, active) VALUES (?, ?, ?, ?)",
			user.ID, user.Email, user.CreatedAt, user.Active,
		)
		if err != nil {
			t.Fatalf("Failed to insert test data: %v", err)
		}
	}

	// Test query multiple rows
	t.Run("Query multiple rows", func(t *testing.T) {
		scanner := db.NewScanner(testDB.TestDB(), db.DBTypeSQLite)
		q := db.NewQuery(db.DBTypeSQLite)
		q.Select("id", "email", "created_at", "active").
			From("users").
			OrderBy("id ASC")

		var users []User
		err := scanner.Query(&users, q)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}

		if len(users) != len(testUsers) {
			t.Errorf("Expected %d users, got %d", len(testUsers), len(users))
		}

		for i, u := range users {
			if u.ID != testUsers[i].ID {
				t.Errorf("Expected user[%d].ID %d, got %d", i, testUsers[i].ID, u.ID)
			}
			if u.Email != testUsers[i].Email {
				t.Errorf("Expected user[%d].Email %s, got %s", i, testUsers[i].Email, u.Email)
			}
			if !u.CreatedAt.Equal(testUsers[i].CreatedAt) {
				t.Errorf("Expected user[%d].CreatedAt %v, got %v", i, testUsers[i].CreatedAt, u.CreatedAt)
			}
			if u.Active != testUsers[i].Active {
				t.Errorf("Expected user[%d].Active %v, got %v", i, testUsers[i].Active, u.Active)
			}
		}
	})

	// Test query with filter
	t.Run("Query with filter", func(t *testing.T) {
		scanner := db.NewScanner(testDB.TestDB(), db.DBTypeSQLite)
		q := db.NewQuery(db.DBTypeSQLite)
		q.Select("id", "email", "created_at", "active").
			From("users").
			Where("active = ").
			Placeholder(true).
			OrderBy("id ASC")

		var users []User
		err := scanner.Query(&users, q)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}

		if len(users) != 2 {
			t.Errorf("Expected 2 users, got %d", len(users))
		}

		for _, u := range users {
			if !u.Active {
				t.Errorf("Expected only active users, got inactive user: %+v", u)
			}
		}
	})

	// Test query empty result
	t.Run("Query empty result", func(t *testing.T) {
		scanner := db.NewScanner(testDB.TestDB(), db.DBTypeSQLite)
		q := db.NewQuery(db.DBTypeSQLite)
		q.Select("id", "email", "created_at", "active").
			From("users").
			Where("id > ").
			Placeholder(100)

		var users []User
		err := scanner.Query(&users, q)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}

		if len(users) != 0 {
			t.Errorf("Expected 0 users, got %d", len(users))
		}
	})
}

func TestScanErrors(t *testing.T) {
	mockSecrets := &mockSecretsService{}
	testDB, err := db.NewTestDB(mockSecrets)
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer testDB.Close()

	scanner := db.NewScanner(testDB.TestDB(), db.DBTypeSQLite)
	q := db.NewQuery(db.DBTypeSQLite)
	q.Select("1")

	// Test non-pointer
	t.Run("QueryRow non-pointer", func(t *testing.T) {
		var user struct{}
		err := scanner.QueryRow(user, q) // Passing non-pointer

		if err == nil {
			t.Error("Expected error for non-pointer, got nil")
		}
	})

	// Test pointer to non-slice for Query
	t.Run("Query pointer to non-slice", func(t *testing.T) {
		var user struct{}
		err := scanner.Query(&user, q) // Passing pointer to struct, not slice

		if err == nil {
			t.Error("Expected error for non-slice pointer, got nil")
		}
	})

	// Test non-pointer for Query
	t.Run("Query non-pointer", func(t *testing.T) {
		var users []struct{}
		err := scanner.Query(users, q) // Passing non-pointer

		if err == nil {
			t.Error("Expected error for non-pointer, got nil")
		}
	})
}

// Mock secrets service for testing
type mockSecretsService struct{}

func (m *mockSecretsService) Encrypt(plaintext string) (string, error) {
	return plaintext, nil
}

func (m *mockSecretsService) Decrypt(ciphertext string) (string, error) {
	return ciphertext, nil
}
