package db_test

import (
	"reflect"
	"testing"

	"lemma/internal/db"
)

func TestNewQuery(t *testing.T) {
	tests := []struct {
		name   string
		dbType db.DBType
	}{
		{
			name:   "SQLite query",
			dbType: db.DBTypeSQLite,
		},
		{
			name:   "Postgres query",
			dbType: db.DBTypePostgres,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := db.NewQuery(tt.dbType, &mockSecrets{})

			// Test that a new query is empty
			if q.String() != "" {
				t.Errorf("NewQuery() should return empty string, got %q", q.String())
			}
			if len(q.Args()) != 0 {
				t.Errorf("NewQuery() should return empty args, got %v", q.Args())
			}

			// Test placeholder behavior - SQLite uses ? and Postgres uses $1
			q.Write("test").Placeholder(1)

			expectedPlaceholder := "?"
			if tt.dbType == db.DBTypePostgres {
				expectedPlaceholder = "$1"
			}

			if q.String() != "test"+expectedPlaceholder {
				t.Errorf("Expected placeholder format %q for %s, got %q",
					"test"+expectedPlaceholder, tt.name, q.String())
			}
		})
	}
}

func TestBasicQueryBuilding(t *testing.T) {
	tests := []struct {
		name     string
		dbType   db.DBType
		buildFn  func(*db.Query) *db.Query
		wantSQL  string
		wantArgs []any
	}{
		{
			name:   "Simple select SQLite",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("id", "name").From("users")
			},
			wantSQL:  "SELECT id, name FROM users",
			wantArgs: []any{},
		},
		{
			name:   "Simple select Postgres",
			dbType: db.DBTypePostgres,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("id", "name").From("users")
			},
			wantSQL:  "SELECT id, name FROM users",
			wantArgs: []any{},
		},
		{
			name:   "Select with where SQLite",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("id", "name").From("users").Where("id = ").Placeholder(1)
			},
			wantSQL:  "SELECT id, name FROM users WHERE id = ?",
			wantArgs: []any{1},
		},
		{
			name:   "Select with where Postgres",
			dbType: db.DBTypePostgres,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("id", "name").From("users").Where("id = ").Placeholder(1)
			},
			wantSQL:  "SELECT id, name FROM users WHERE id = $1",
			wantArgs: []any{1},
		},
		{
			name:   "Multiple where conditions SQLite",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").
					Where("active = ").Placeholder(true).
					And("role = ").Placeholder("admin")
			},
			wantSQL:  "SELECT * FROM users WHERE active = ? AND role = ?",
			wantArgs: []any{true, "admin"},
		},
		{
			name:   "Multiple where conditions Postgres",
			dbType: db.DBTypePostgres,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").
					Where("active = ").Placeholder(true).
					And("role = ").Placeholder("admin")
			},
			wantSQL:  "SELECT * FROM users WHERE active = $1 AND role = $2",
			wantArgs: []any{true, "admin"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := db.NewQuery(tt.dbType, &mockSecrets{})
			q = tt.buildFn(q)

			gotSQL := q.String()
			gotArgs := q.Args()

			if gotSQL != tt.wantSQL {
				t.Errorf("Query.String() = %q, want %q", gotSQL, tt.wantSQL)
			}

			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("Query.Args() = %v, want %v", gotArgs, tt.wantArgs)
			}
		})
	}
}

func TestPlaceholders(t *testing.T) {
	tests := []struct {
		name     string
		dbType   db.DBType
		buildFn  func(*db.Query) *db.Query
		wantSQL  string
		wantArgs []any
	}{
		{
			name:   "Single placeholder SQLite",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Write("SELECT * FROM users WHERE id = ").Placeholder(42)
			},
			wantSQL:  "SELECT * FROM users WHERE id = ?",
			wantArgs: []any{42},
		},
		{
			name:   "Single placeholder Postgres",
			dbType: db.DBTypePostgres,
			buildFn: func(q *db.Query) *db.Query {
				return q.Write("SELECT * FROM users WHERE id = ").Placeholder(42)
			},
			wantSQL:  "SELECT * FROM users WHERE id = $1",
			wantArgs: []any{42},
		},
		{
			name:   "Multiple placeholders SQLite",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Write("SELECT * FROM users WHERE id = ").
					Placeholder(42).
					Write(" AND name = ").
					Placeholder("John")
			},
			wantSQL:  "SELECT * FROM users WHERE id = ? AND name = ?",
			wantArgs: []any{42, "John"},
		},
		{
			name:   "Multiple placeholders Postgres",
			dbType: db.DBTypePostgres,
			buildFn: func(q *db.Query) *db.Query {
				return q.Write("SELECT * FROM users WHERE id = ").
					Placeholder(42).
					Write(" AND name = ").
					Placeholder("John")
			},
			wantSQL:  "SELECT * FROM users WHERE id = $1 AND name = $2",
			wantArgs: []any{42, "John"},
		},
		{
			name:   "Placeholders for IN SQLite",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Write("SELECT * FROM users WHERE id IN (").
					Placeholders(3).
					Write(")").
					AddArgs(1, 2, 3)
			},
			wantSQL:  "SELECT * FROM users WHERE id IN (?, ?, ?)",
			wantArgs: []any{1, 2, 3},
		},
		{
			name:   "Placeholders for IN Postgres",
			dbType: db.DBTypePostgres,
			buildFn: func(q *db.Query) *db.Query {
				return q.Write("SELECT * FROM users WHERE id IN (").
					Placeholders(3).
					Write(")").
					AddArgs(1, 2, 3)
			},
			wantSQL:  "SELECT * FROM users WHERE id IN ($1, $2, $3)",
			wantArgs: []any{1, 2, 3},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := db.NewQuery(tt.dbType, &mockSecrets{})
			q = tt.buildFn(q)

			gotSQL := q.String()
			gotArgs := q.Args()

			if gotSQL != tt.wantSQL {
				t.Errorf("Query.String() = %q, want %q", gotSQL, tt.wantSQL)
			}

			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("Query.Args() = %v, want %v", gotArgs, tt.wantArgs)
			}
		})
	}
}

func TestWhereClauseBuilding(t *testing.T) {
	tests := []struct {
		name     string
		dbType   db.DBType
		buildFn  func(*db.Query) *db.Query
		wantSQL  string
		wantArgs []any
	}{
		{
			name:   "Simple where",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").Where("id = ").Placeholder(1)
			},
			wantSQL:  "SELECT * FROM users WHERE id = ?",
			wantArgs: []any{1},
		},
		{
			name:   "Where with And",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").
					Where("id = ").Placeholder(1).
					And("active = ").Placeholder(true)
			},
			wantSQL:  "SELECT * FROM users WHERE id = ? AND active = ?",
			wantArgs: []any{1, true},
		},
		{
			name:   "Where with Or",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").
					Where("id = ").Placeholder(1).
					Or("id = ").Placeholder(2)
			},
			wantSQL:  "SELECT * FROM users WHERE id = ? OR id = ?",
			wantArgs: []any{1, 2},
		},
		{
			name:   "Where with parentheses",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").
					Where("active = ").Placeholder(true).
					And("(").
					Write("id = ").Placeholder(1).
					Or("id = ").Placeholder(2).
					Write(")")
			},
			wantSQL:  "SELECT * FROM users WHERE active = ? AND (id = ? OR id = ?)",
			wantArgs: []any{true, 1, 2},
		},
		{
			name:   "Where with StartGroup and EndGroup",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").
					Where("active = ").Placeholder(true).
					Write(" AND (").
					Write("id = ").Placeholder(1).
					Or("id = ").Placeholder(2).
					Write(")")
			},
			wantSQL:  "SELECT * FROM users WHERE active = ? AND (id = ? OR id = ?)",
			wantArgs: []any{true, 1, 2},
		},
		{
			name:   "Where with nested groups",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").
					Where("(").
					Write("active = ").Placeholder(true).
					Or("role = ").Placeholder("admin").
					Write(")").
					And("created_at > ").Placeholder("2020-01-01")
			},
			wantSQL:  "SELECT * FROM users WHERE (active = ? OR role = ?) AND created_at > ?",
			wantArgs: []any{true, "admin", "2020-01-01"},
		},
		{
			name:   "WhereIn",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").
					WhereIn("id", 3).
					AddArgs(1, 2, 3)
			},
			wantSQL:  "SELECT * FROM users WHERE id IN (?, ?, ?)",
			wantArgs: []any{1, 2, 3},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := db.NewQuery(tt.dbType, &mockSecrets{})
			q = tt.buildFn(q)

			gotSQL := q.String()
			gotArgs := q.Args()

			if gotSQL != tt.wantSQL {
				t.Errorf("Query.String() = %q, want %q", gotSQL, tt.wantSQL)
			}

			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("Query.Args() = %v, want %v", gotArgs, tt.wantArgs)
			}
		})
	}
}

func TestJoinClauseBuilding(t *testing.T) {
	tests := []struct {
		name     string
		dbType   db.DBType
		buildFn  func(*db.Query) *db.Query
		wantSQL  string
		wantArgs []any
	}{
		{
			name:   "Inner join",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("u.*", "w.name").
					From("users u").
					Join(db.InnerJoin, "workspaces w", "w.user_id = u.id")
			},
			wantSQL:  "SELECT u.*, w.name FROM users u INNER JOIN workspaces w ON w.user_id = u.id",
			wantArgs: []any{},
		},
		{
			name:   "Left join",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("u.*", "w.name").
					From("users u").
					Join(db.LeftJoin, "workspaces w", "w.user_id = u.id")
			},
			wantSQL:  "SELECT u.*, w.name FROM users u LEFT JOIN workspaces w ON w.user_id = u.id",
			wantArgs: []any{},
		},
		{
			name:   "Multiple joins",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("u.*", "w.name", "s.role").
					From("users u").
					Join(db.InnerJoin, "workspaces w", "w.user_id = u.id").
					Join(db.LeftJoin, "settings s", "s.user_id = u.id")
			},
			wantSQL:  "SELECT u.*, w.name, s.role FROM users u INNER JOIN workspaces w ON w.user_id = u.id LEFT JOIN settings s ON s.user_id = u.id",
			wantArgs: []any{},
		},
		{
			name:   "Join with where",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("u.*", "w.name").
					From("users u").
					Join(db.InnerJoin, "workspaces w", "w.user_id = u.id").
					Where("u.active = ").Placeholder(true)
			},
			wantSQL:  "SELECT u.*, w.name FROM users u INNER JOIN workspaces w ON w.user_id = u.id WHERE u.active = ?",
			wantArgs: []any{true},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := db.NewQuery(tt.dbType, &mockSecrets{})
			q = tt.buildFn(q)

			gotSQL := q.String()
			gotArgs := q.Args()

			if gotSQL != tt.wantSQL {
				t.Errorf("Query.String() = %q, want %q", gotSQL, tt.wantSQL)
			}

			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("Query.Args() = %v, want %v", gotArgs, tt.wantArgs)
			}
		})
	}
}

func TestOrderLimitOffset(t *testing.T) {
	tests := []struct {
		name     string
		dbType   db.DBType
		buildFn  func(*db.Query) *db.Query
		wantSQL  string
		wantArgs []any
	}{
		{
			name:   "Order by",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").OrderBy("name ASC")
			},
			wantSQL:  "SELECT * FROM users ORDER BY name ASC",
			wantArgs: []any{},
		},
		{
			name:   "Order by multiple columns",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").OrderBy("name ASC", "created_at DESC")
			},
			wantSQL:  "SELECT * FROM users ORDER BY name ASC, created_at DESC",
			wantArgs: []any{},
		},
		{
			name:   "Limit",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").Limit(10)
			},
			wantSQL:  "SELECT * FROM users LIMIT 10",
			wantArgs: []any{},
		},
		{
			name:   "Limit and offset",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").From("users").Limit(10).Offset(20)
			},
			wantSQL:  "SELECT * FROM users LIMIT 10 OFFSET 20",
			wantArgs: []any{},
		},
		{
			name:   "Complete query with all clauses",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("*").
					From("users").
					Where("active = ").Placeholder(true).
					OrderBy("name ASC").
					Limit(10).
					Offset(20)
			},
			wantSQL:  "SELECT * FROM users WHERE active = ? ORDER BY name ASC LIMIT 10 OFFSET 20",
			wantArgs: []any{true},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := db.NewQuery(tt.dbType, &mockSecrets{})
			q = tt.buildFn(q)

			gotSQL := q.String()
			gotArgs := q.Args()

			if gotSQL != tt.wantSQL {
				t.Errorf("Query.String() = %q, want %q", gotSQL, tt.wantSQL)
			}

			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("Query.Args() = %v, want %v", gotArgs, tt.wantArgs)
			}
		})
	}
}

func TestInsertUpdateDelete(t *testing.T) {
	tests := []struct {
		name     string
		dbType   db.DBType
		buildFn  func(*db.Query) *db.Query
		wantSQL  string
		wantArgs []any
	}{
		{
			name:   "Insert SQLite",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Insert("users", "name", "email").
					Values(2).
					AddArgs("John", "john@example.com")
			},
			wantSQL:  "INSERT INTO users (name, email) VALUES (?, ?)",
			wantArgs: []any{"John", "john@example.com"},
		},
		{
			name:   "Insert Postgres",
			dbType: db.DBTypePostgres,
			buildFn: func(q *db.Query) *db.Query {
				return q.Insert("users", "name", "email").
					Values(2).
					AddArgs("John", "john@example.com")
			},
			wantSQL:  "INSERT INTO users (name, email) VALUES ($1, $2)",
			wantArgs: []any{"John", "john@example.com"},
		},
		{
			name:   "Update SQLite",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Update("users").
					Set("name").Placeholder("John").
					Set("email").Placeholder("john@example.com").
					Where("id = ").Placeholder(1)
			},
			wantSQL:  "UPDATE users SET name = ?, email = ? WHERE id = ?",
			wantArgs: []any{"John", "john@example.com", 1},
		},
		{
			name:   "Update Postgres",
			dbType: db.DBTypePostgres,
			buildFn: func(q *db.Query) *db.Query {
				return q.Update("users").
					Set("name").Placeholder("John").
					Set("email").Placeholder("john@example.com").
					Where("id = ").Placeholder(1)
			},
			wantSQL:  "UPDATE users SET name = $1, email = $2 WHERE id = $3",
			wantArgs: []any{"John", "john@example.com", 1},
		},
		{
			name:   "Delete SQLite",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Delete().From("users").Where("id = ").Placeholder(1)
			},
			wantSQL:  "DELETE FROM users WHERE id = ?",
			wantArgs: []any{1},
		},
		{
			name:   "Delete Postgres",
			dbType: db.DBTypePostgres,
			buildFn: func(q *db.Query) *db.Query {
				return q.Delete().From("users").Where("id = ").Placeholder(1)
			},
			wantSQL:  "DELETE FROM users WHERE id = $1",
			wantArgs: []any{1},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := db.NewQuery(tt.dbType, &mockSecrets{})
			q = tt.buildFn(q)

			gotSQL := q.String()
			gotArgs := q.Args()

			if gotSQL != tt.wantSQL {
				t.Errorf("Query.String() = %q, want %q", gotSQL, tt.wantSQL)
			}

			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("Query.Args() = %v, want %v", gotArgs, tt.wantArgs)
			}
		})
	}
}

func TestHavingClause(t *testing.T) {
	tests := []struct {
		name     string
		dbType   db.DBType
		buildFn  func(*db.Query) *db.Query
		wantSQL  string
		wantArgs []any
	}{
		{
			name:   "Simple having",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("department", "COUNT(*) as count").
					From("employees").
					GroupBy("department").
					Having("count > ").Placeholder(5)
			},
			wantSQL:  "SELECT department, COUNT(*) as count FROM employees GROUP BY department HAVING count > ?",
			wantArgs: []any{5},
		},
		{
			name:   "Having with multiple conditions",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("department", "AVG(salary) as avg_salary").
					From("employees").
					GroupBy("department").
					Having("avg_salary > ").Placeholder(50000).
					And("COUNT(*) > ").Placeholder(3)
			},
			wantSQL:  "SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING avg_salary > ? AND COUNT(*) > ?",
			wantArgs: []any{50000, 3},
		},
		{
			name:   "Having with postgres placeholders",
			dbType: db.DBTypePostgres,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("department", "COUNT(*) as count").
					From("employees").
					GroupBy("department").
					Having("count > ").Placeholder(5)
			},
			wantSQL:  "SELECT department, COUNT(*) as count FROM employees GROUP BY department HAVING count > $1",
			wantArgs: []any{5},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := db.NewQuery(tt.dbType, &mockSecrets{})
			q = tt.buildFn(q)

			gotSQL := q.String()
			gotArgs := q.Args()

			if gotSQL != tt.wantSQL {
				t.Errorf("Query.String() = %q, want %q", gotSQL, tt.wantSQL)
			}

			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("Query.Args() = %v, want %v", gotArgs, tt.wantArgs)
			}
		})
	}
}

func TestQueryReturning(t *testing.T) {
	testCases := []struct {
		name         string
		dbType       db.DBType
		buildQuery   func(q *db.Query) *db.Query
		expectedSQL  string
		expectedArgs []any
	}{
		{
			name:   "SQLite INSERT with RETURNING single column",
			dbType: db.DBTypeSQLite,
			buildQuery: func(q *db.Query) *db.Query {
				return q.Insert("users", "name", "email").
					Values(2).
					AddArgs("John Doe", "john@example.com").
					Returning("id")
			},
			expectedSQL:  "INSERT INTO users (name, email) VALUES (?, ?) RETURNING id",
			expectedArgs: []any{"John Doe", "john@example.com"},
		},
		{
			name:   "PostgreSQL INSERT with RETURNING single column",
			dbType: db.DBTypePostgres,
			buildQuery: func(q *db.Query) *db.Query {
				return q.Insert("users", "name", "email").
					Values(2).
					AddArgs("John Doe", "john@example.com").
					Returning("id")
			},
			expectedSQL:  "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
			expectedArgs: []any{"John Doe", "john@example.com"},
		},
		{
			name:   "SQLite INSERT with RETURNING multiple columns",
			dbType: db.DBTypeSQLite,
			buildQuery: func(q *db.Query) *db.Query {
				return q.Insert("users", "name", "email").
					Values(2).
					AddArgs("John Doe", "john@example.com").
					Returning("id", "created_at")
			},
			expectedSQL:  "INSERT INTO users (name, email) VALUES (?, ?) RETURNING id, created_at",
			expectedArgs: []any{"John Doe", "john@example.com"},
		},
		{
			name:   "PostgreSQL INSERT with RETURNING multiple columns",
			dbType: db.DBTypePostgres,
			buildQuery: func(q *db.Query) *db.Query {
				return q.Insert("users", "name", "email").
					Values(2).
					AddArgs("John Doe", "john@example.com").
					Returning("id", "created_at")
			},
			expectedSQL:  "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, created_at",
			expectedArgs: []any{"John Doe", "john@example.com"},
		},
		{
			name:   "SQLite UPDATE with RETURNING",
			dbType: db.DBTypeSQLite,
			buildQuery: func(q *db.Query) *db.Query {
				return q.Update("users").
					Set("name").Placeholder("Jane Doe").
					Where("id = ").Placeholder(1).
					Returning("name", "updated_at")
			},
			expectedSQL:  "UPDATE users SET name = ? WHERE id = ? RETURNING name, updated_at",
			expectedArgs: []any{"Jane Doe", 1},
		},
		{
			name:   "PostgreSQL UPDATE with RETURNING",
			dbType: db.DBTypePostgres,
			buildQuery: func(q *db.Query) *db.Query {
				return q.Update("users").
					Set("name").Placeholder("Jane Doe").
					Where("id = ").Placeholder(1).
					Returning("name", "updated_at")
			},
			expectedSQL:  "UPDATE users SET name = $1 WHERE id = $2 RETURNING name, updated_at",
			expectedArgs: []any{"Jane Doe", 1},
		},
		{
			name:   "SQLite DELETE with RETURNING",
			dbType: db.DBTypeSQLite,
			buildQuery: func(q *db.Query) *db.Query {
				return q.Delete().
					From("users").
					Where("id = ").Placeholder(1).
					Returning("id", "name", "email")
			},
			expectedSQL:  "DELETE FROM users WHERE id = ? RETURNING id, name, email",
			expectedArgs: []any{1},
		},
		{
			name:   "PostgreSQL DELETE with RETURNING",
			dbType: db.DBTypePostgres,
			buildQuery: func(q *db.Query) *db.Query {
				return q.Delete().
					From("users").
					Where("id = ").Placeholder(1).
					Returning("id", "name", "email")
			},
			expectedSQL:  "DELETE FROM users WHERE id = $1 RETURNING id, name, email",
			expectedArgs: []any{1},
		},
		{
			name:   "SQLite INSERT with RETURNING *",
			dbType: db.DBTypeSQLite,
			buildQuery: func(q *db.Query) *db.Query {
				return q.Insert("users", "name", "email").
					Values(2).
					AddArgs("John Doe", "john@example.com").
					Returning("*")
			},
			expectedSQL:  "INSERT INTO users (name, email) VALUES (?, ?) RETURNING *",
			expectedArgs: []any{"John Doe", "john@example.com"},
		},
		{
			name:   "PostgreSQL INSERT with RETURNING *",
			dbType: db.DBTypePostgres,
			buildQuery: func(q *db.Query) *db.Query {
				return q.Insert("users", "name", "email").
					Values(2).
					AddArgs("John Doe", "john@example.com").
					Returning("*")
			},
			expectedSQL:  "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
			expectedArgs: []any{"John Doe", "john@example.com"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			query := db.NewQuery(tc.dbType, &mockSecrets{})
			result := tc.buildQuery(query)

			if result.String() != tc.expectedSQL {
				t.Errorf("Expected SQL: %s, got: %s", tc.expectedSQL, result.String())
			}

			if len(result.Args()) != len(tc.expectedArgs) {
				t.Errorf("Expected %d args, got %d", len(tc.expectedArgs), len(result.Args()))
			}

			for i, arg := range result.Args() {
				if arg != tc.expectedArgs[i] {
					t.Errorf("Expected arg %d to be %v, got %v", i, tc.expectedArgs[i], arg)
				}
			}
		})
	}
}

func TestComplexQueries(t *testing.T) {
	tests := []struct {
		name     string
		dbType   db.DBType
		buildFn  func(*db.Query) *db.Query
		wantSQL  string
		wantArgs []any
	}{
		{
			name:   "Complex select with join and where",
			dbType: db.DBTypeSQLite,
			buildFn: func(q *db.Query) *db.Query {
				return q.Select("u.id", "u.name", "COUNT(w.id) as workspace_count").
					From("users u").
					Join(db.LeftJoin, "workspaces w", "w.user_id = u.id").
					Where("u.active = ").Placeholder(true).
					GroupBy("u.id", "u.name").
					Having("COUNT(w.id) > ").Placeholder(0).
					OrderBy("workspace_count DESC").
					Limit(10)
			},
			wantSQL:  "SELECT u.id, u.name, COUNT(w.id) as workspace_count FROM users u LEFT JOIN workspaces w ON w.user_id = u.id WHERE u.active = ? GROUP BY u.id, u.name HAVING COUNT(w.id) > ? ORDER BY workspace_count DESC LIMIT 10",
			wantArgs: []any{true, 0},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := db.NewQuery(tt.dbType, &mockSecrets{})
			q = tt.buildFn(q)

			gotSQL := q.String()
			gotArgs := q.Args()

			if gotSQL != tt.wantSQL {
				t.Errorf("Query.String() = %q, want %q", gotSQL, tt.wantSQL)
			}

			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("Query.Args() = %v, want %v", gotArgs, tt.wantArgs)
			}
		})
	}
}
