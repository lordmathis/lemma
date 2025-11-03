package db_test

import (
	"reflect"
	"testing"
	"time"

	"lemma/internal/db"
	"lemma/internal/models"
	_ "lemma/internal/testenv"
)

// TestStructTagsToFields tests the exported StructTagsToFields function
func TestStructTagsToFields(t *testing.T) {
	type testStruct struct {
		ID        int       `db:"id"`
		Name      string    `db:"custom_name"`
		CreatedAt time.Time `db:"created_at,default"`
		Skip      string    `db:"-"`
		Empty     string    `db:"empty,omitempty"`
		Secret    string    `db:"secret,encrypted"`
		NoTag     string
	}

	tests := []struct {
		name       string
		input      interface{}
		wantFields int
		wantErr    bool
	}{
		{
			name: "valid struct",
			input: testStruct{
				ID:        1,
				Name:      "Test",
				CreatedAt: time.Now(),
				Skip:      "skip me",
				Secret:    "secret value",
				NoTag:     "no tag",
			},
			wantFields: 5, // ID, Name, CreatedAt, Secret, NoTag (Empty is omitted)
			wantErr:    false,
		},
		{
			name:       "nil pointer",
			input:      (*testStruct)(nil),
			wantFields: 0,
			wantErr:    true,
		},
		{
			name:       "non-struct",
			input:      "not a struct",
			wantFields: 0,
			wantErr:    true,
		},
		{
			name: "struct pointer",
			input: &testStruct{
				ID:   2,
				Name: "Test Pointer",
			},
			wantFields: 5, // Same fields as above
			wantErr:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fields, err := db.StructTagsToFields(tt.input)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			if len(fields) != tt.wantFields {
				t.Errorf("Expected %d fields, got %d", tt.wantFields, len(fields))
			}

			// Check specific field handling for valid struct test
			if tt.name == "valid struct" {
				// Find fields by name
				var idField, nameField, createdAtField, secretField, emptyField, noTagField *db.DBField
				for i := range fields {
					f := &fields[i]
					switch f.Name {
					case "id":
						idField = f
					case "custom_name":
						nameField = f
					case "created_at":
						createdAtField = f
					case "secret":
						secretField = f
					case "empty":
						emptyField = f
					case "no_tag":
						noTagField = f
					}
				}

				// Check fields exist
				if idField == nil {
					t.Error("ID field not found")
				}
				if nameField == nil {
					t.Error("Name field not found")
				}
				if createdAtField == nil {
					t.Error("CreatedAt field not found")
				}
				if secretField == nil {
					t.Error("Secret field not found")
				}
				if noTagField == nil {
					t.Error("NoTag field not found")
				}
				if emptyField != nil {
					t.Error("Empty field should be omitted")
				}

				// Check original names
				if idField != nil && idField.OriginalName != "ID" {
					t.Errorf("Expected OriginalName 'ID', got '%s'", idField.OriginalName)
				}
				if nameField != nil && nameField.OriginalName != "Name" {
					t.Errorf("Expected OriginalName 'Name', got '%s'", nameField.OriginalName)
				}
			}
		})
	}
}

// TestStructQueries tests the struct-based query methods using the test database
func TestStructQueries(t *testing.T) {
	// Setup test database
	database, err := db.NewTestSQLiteDB(&mockSecrets{})
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	// Define test data
	user := &models.User{
		Email:        "structquery@example.com",
		DisplayName:  "Struct Query Test",
		PasswordHash: "hashed_password",
		Role:         models.RoleEditor,
		Theme:        "dark",
	}

	t.Run("InsertStructQuery", func(t *testing.T) {
		// Insert user with struct query
		createdUser, err := database.CreateUser(user)
		if err != nil {
			t.Fatalf("Failed to create user with struct query: %v", err)
		}

		// Verify user was created with proper values
		if createdUser.ID == 0 {
			t.Error("Expected non-zero user ID")
		}

		if createdUser.Email != user.Email {
			t.Errorf("Email = %v, want %v", createdUser.Email, user.Email)
		}

		if createdUser.DisplayName != user.DisplayName {
			t.Errorf("DisplayName = %v, want %v", createdUser.DisplayName, user.DisplayName)
		}

		if createdUser.Role != user.Role {
			t.Errorf("Role = %v, want %v", createdUser.Role, user.Role)
		}

		// We will use this user for the next test cases
		user = createdUser
	})

	t.Run("SelectStructQuery", func(t *testing.T) {
		// Get the created user
		fetchedUser, err := database.GetUserByID(user.ID)
		if err != nil {
			t.Fatalf("Failed to get user with struct query: %v", err)
		}

		// Verify fetched user matches the original
		if fetchedUser.ID != user.ID {
			t.Errorf("ID = %v, want %v", fetchedUser.ID, user.ID)
		}

		if fetchedUser.Email != user.Email {
			t.Errorf("Email = %v, want %v", fetchedUser.Email, user.Email)
		}

		if fetchedUser.DisplayName != user.DisplayName {
			t.Errorf("DisplayName = %v, want %v", fetchedUser.DisplayName, user.DisplayName)
		}

		if fetchedUser.Role != user.Role {
			t.Errorf("Role = %v, want %v", fetchedUser.Role, user.Role)
		}
	})

	t.Run("UpdateStructQuery", func(t *testing.T) {
		// Update the user
		user.DisplayName = "Updated Display Name"
		user.Role = models.RoleAdmin

		err := database.UpdateUser(user)
		if err != nil {
			t.Fatalf("Failed to update user with struct query: %v", err)
		}

		// Verify update worked
		updatedUser, err := database.GetUserByID(user.ID)
		if err != nil {
			t.Fatalf("Failed to get updated user: %v", err)
		}

		if updatedUser.DisplayName != "Updated Display Name" {
			t.Errorf("DisplayName = %v, want %v", updatedUser.DisplayName, "Updated Display Name")
		}

		if updatedUser.Role != models.RoleAdmin {
			t.Errorf("Role = %v, want %v", updatedUser.Role, models.RoleAdmin)
		}
	})

	t.Run("ScanStructs", func(t *testing.T) {
		// Create another user to test multiple rows
		secondUser := &models.User{
			Email:        "structquery2@example.com",
			DisplayName:  "Struct Query Test 2",
			PasswordHash: "hashed_password2",
			Role:         models.RoleViewer,
			Theme:        "light",
		}

		createdUser2, err := database.CreateUser(secondUser)
		if err != nil {
			t.Fatalf("Failed to create second user: %v", err)
		}

		// Get all users
		users, err := database.GetAllUsers()
		if err != nil {
			t.Fatalf("Failed to get all users: %v", err)
		}

		// Verify we have at least the two users we created
		if len(users) < 2 {
			t.Errorf("Expected at least 2 users, got %d", len(users))
		}

		// Check if both our users are in the result
		foundUser1 := false
		foundUser2 := false

		for _, u := range users {
			if u.ID == user.ID {
				foundUser1 = true
				if u.DisplayName != user.DisplayName {
					t.Errorf("DisplayName = %v, want %v", u.DisplayName, user.DisplayName)
				}
			}
			if u.ID == createdUser2.ID {
				foundUser2 = true
				if u.DisplayName != secondUser.DisplayName {
					t.Errorf("DisplayName = %v, want %v", u.DisplayName, secondUser.DisplayName)
				}
			}
		}

		if !foundUser1 {
			t.Errorf("First user (ID: %d) not found in results", user.ID)
		}
		if !foundUser2 {
			t.Errorf("Second user (ID: %d) not found in results", createdUser2.ID)
		}
	})

	t.Run("ScanStruct with null values", func(t *testing.T) {
		// Test handling of NULL values by creating a workspace with null values
		workspace := &models.Workspace{
			UserID: user.ID,
			Name:   "Null Test Workspace",
			// Leave all optional fields as zero values
		}
		workspace.SetDefaultSettings() // This will set default values

		err := database.CreateWorkspace(workspace)
		if err != nil {
			t.Fatalf("Failed to create test workspace: %v", err)
		}

		// Clear the GitToken to test NULL handling
		testDB := database.TestDB()
		_, err = testDB.Exec("UPDATE workspaces SET git_token = NULL WHERE id = ?", workspace.ID)
		if err != nil {
			t.Fatalf("Failed to set git_token to NULL: %v", err)
		}

		// Fetch the workspace with NULL field
		fetchedWorkspace, err := database.GetWorkspaceByID(workspace.ID)
		if err != nil {
			t.Fatalf("Failed to get workspace with NULL field: %v", err)
		}

		// Verify the NULL field is empty
		if fetchedWorkspace.GitToken != "" {
			t.Errorf("Expected empty GitToken, got '%s'", fetchedWorkspace.GitToken)
		}
	})

	t.Run("ScanStructErrors", func(t *testing.T) {
		// Test error handling in ScanStruct
		testDB := database.TestDB()

		// Attempt to scan too many columns into a struct with fewer fields
		row := testDB.QueryRow("SELECT 1, 2, 3")
		var singleField struct {
			One int `db:"one"`
		}

		err := database.ScanStruct(row, &singleField)
		if err == nil {
			t.Error("Expected error when scanning too many columns, got nil")
		}

		// Test scanning into a non-struct
		var notAStruct int
		row = testDB.QueryRow("SELECT 1")
		err = database.ScanStruct(row, &notAStruct)
		if err == nil {
			t.Error("Expected error when scanning into non-struct, got nil")
		}

		// Test scanning into nil
		var nilPtr *struct{}
		row = testDB.QueryRow("SELECT 1")
		err = database.ScanStruct(row, nilPtr)
		if err == nil {
			t.Error("Expected error when scanning into nil pointer, got nil")
		}
	})
}

// TestScanStructsErrors tests error handling for ScanStructs
func TestScanStructsErrors(t *testing.T) {
	database, err := db.NewTestSQLiteDB(&mockSecrets{})
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	testDB := database.TestDB()

	t.Run("ScanStructsWithNilRows", func(t *testing.T) {
		var users []*models.User
		err := database.ScanStructs(nil, &users)
		if err == nil {
			t.Error("Expected error with nil rows, got nil")
		}
	})

	t.Run("ScanStructsWithNilDest", func(t *testing.T) {
		rows, err := testDB.Query("SELECT 1")
		if err != nil {
			t.Fatalf("Failed to execute query: %v", err)
		}
		defer rows.Close()

		var nilSlice *[]*models.User
		err = database.ScanStructs(rows, nilSlice)
		if err == nil {
			t.Error("Expected error with nil destination, got nil")
		}
	})

	t.Run("ScanStructsWithNonSlice", func(t *testing.T) {
		rows, err := testDB.Query("SELECT 1")
		if err != nil {
			t.Fatalf("Failed to execute query: %v", err)
		}
		defer rows.Close()

		var nonSlice int
		err = database.ScanStructs(rows, &nonSlice)
		if err == nil {
			t.Error("Expected error with non-slice destination, got nil")
		}
	})

	t.Run("ScanStructsWithNonStructSlice", func(t *testing.T) {
		rows, err := testDB.Query("SELECT 1")
		if err != nil {
			t.Fatalf("Failed to execute query: %v", err)
		}
		defer rows.Close()

		var intSlice []int
		err = database.ScanStructs(rows, &intSlice)
		if err == nil {
			t.Error("Expected error with non-struct slice, got nil")
		}
	})
}

// TestEncryptedFields tests handling of encrypted fields
func TestEncryptedFields(t *testing.T) {
	database, err := db.NewTestSQLiteDB(&mockSecrets{})
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	// Create user with workspace that has encrypted token
	user, err := database.CreateUser(&models.User{
		Email:        "encrypted@example.com",
		DisplayName:  "Encryption Test",
		PasswordHash: "hash",
		Role:         models.RoleEditor,
		Theme:        "dark",
	})
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create workspace with encrypted field
	workspace := &models.Workspace{
		UserID:         user.ID,
		Name:           "Encryption Test",
		Theme:          "dark",
		GitEnabled:     true,
		GitURL:         "https://github.com/user/repo",
		GitUser:        "username",
		GitToken:       "secret-token", // This field is encrypted
		GitCommitName:  "Test User",
		GitCommitEmail: "test@example.com",
	}

	if err := database.CreateWorkspace(workspace); err != nil {
		t.Fatalf("Failed to create test workspace: %v", err)
	}

	// Verify our mock secrets service passed the token through unmodified
	// In a real application, the token would be encrypted in the database
	testDB := database.TestDB()
	var rawToken string
	err = testDB.QueryRow("SELECT git_token FROM workspaces WHERE id = ?", workspace.ID).Scan(&rawToken)
	if err != nil {
		t.Fatalf("Failed to query raw token: %v", err)
	}

	// With the mock secrets service, encryption is a no-op so the token is stored as-is
	if rawToken != "secret-token" {
		t.Errorf("Expected raw token 'secret-token', got '%s'", rawToken)
	}

	// Verify the fetched workspace has the correct token
	fetchedWorkspace, err := database.GetWorkspaceByID(workspace.ID)
	if err != nil {
		t.Fatalf("Failed to get workspace: %v", err)
	}

	if fetchedWorkspace.GitToken != "secret-token" {
		t.Errorf("Expected GitToken 'secret-token', got '%s'", fetchedWorkspace.GitToken)
	}
}

// Helper function to compare slices of DBFields
func compareDBFields(t *testing.T, got, want []db.DBField) {
	t.Helper()

	if len(got) != len(want) {
		t.Errorf("Got %d fields, want %d", len(got), len(want))
		return
	}

	for i := range got {
		if got[i].Name != want[i].Name {
			t.Errorf("Field %d name: got %s, want %s", i, got[i].Name, want[i].Name)
		}
		if got[i].OriginalName != want[i].OriginalName {
			t.Errorf("Field %d original name: got %s, want %s", i, got[i].OriginalName, want[i].OriginalName)
		}
		if !reflect.DeepEqual(got[i].Value, want[i].Value) {
			t.Errorf("Field %d value: got %v, want %v", i, got[i].Value, want[i].Value)
		}
	}
}
