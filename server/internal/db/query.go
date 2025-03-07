package db

import (
	"fmt"
	"lemma/internal/secrets"
	"strings"
)

type JoinType string

const (
	InnerJoin JoinType = "INNER JOIN"
	LeftJoin  JoinType = "LEFT JOIN"
	RightJoin JoinType = "RIGHT JOIN"
)

// Query represents a SQL query with its parameters
type Query struct {
	builder        strings.Builder
	args           []any
	dbType         DBType
	secretsService secrets.Service
	pos            int // tracks the current placeholder position
	hasSelect      bool
	hasFrom        bool
	hasWhere       bool
	hasOrderBy     bool
	hasGroupBy     bool
	hasHaving      bool
	hasLimit       bool
	hasOffset      bool
	isInParens     bool
	parensDepth    int
}

// NewQuery creates a new Query instance
func NewQuery(dbType DBType, secretsService secrets.Service) *Query {
	return &Query{
		dbType:         dbType,
		secretsService: secretsService,
		args:           make([]any, 0),
	}
}

// Select adds a SELECT clause
func (q *Query) Select(columns ...string) *Query {
	if !q.hasSelect {
		q.Write("SELECT ")
		q.Write(strings.Join(columns, ", "))
		q.hasSelect = true
	}
	return q
}

// From adds a FROM clause
func (q *Query) From(table string) *Query {
	if !q.hasFrom {
		q.Write(" FROM ")
		q.Write(table)
		q.hasFrom = true
	}
	return q
}

// Where adds a WHERE clause
func (q *Query) Where(condition string) *Query {
	if !q.hasWhere {
		q.Write(" WHERE ")
		q.hasWhere = true
	} else {
		q.Write(" AND ")
	}
	q.Write(condition)
	return q
}

// WhereIn adds a WHERE IN clause
func (q *Query) WhereIn(column string, count int) *Query {
	if !q.hasWhere {
		q.Write(" WHERE ")
		q.hasWhere = true
	} else {
		q.Write(" AND ")
	}
	q.Write(column)
	q.Write(" IN (")
	q.Placeholders(count)
	q.Write(")")
	return q
}

// And adds an AND condition
func (q *Query) And(condition string) *Query {
	q.Write(" AND ")
	q.Write(condition)
	return q
}

// Or adds an OR condition
func (q *Query) Or(condition string) *Query {
	q.Write(" OR ")
	q.Write(condition)
	return q
}

// Join adds a JOIN clause
func (q *Query) Join(joinType JoinType, table, condition string) *Query {
	q.Write(" ")
	q.Write(string(joinType))
	q.Write(" ")
	q.Write(table)
	q.Write(" ON ")
	q.Write(condition)
	return q
}

// OrderBy adds an ORDER BY clause
func (q *Query) OrderBy(columns ...string) *Query {
	if !q.hasOrderBy {
		q.Write(" ORDER BY ")
		q.Write(strings.Join(columns, ", "))
		q.hasOrderBy = true
	}
	return q
}

// GroupBy adds a GROUP BY clause
func (q *Query) GroupBy(columns ...string) *Query {
	if !q.hasGroupBy {
		q.Write(" GROUP BY ")
		q.Write(strings.Join(columns, ", "))
		q.hasGroupBy = true
	}
	return q
}

// Having adds a HAVING clause for filtering groups
func (q *Query) Having(condition string) *Query {
	if !q.hasHaving {
		q.Write(" HAVING ")
		q.hasHaving = true
	} else {
		q.Write(" AND ")
	}
	q.Write(condition)
	return q
}

// Limit adds a LIMIT clause
func (q *Query) Limit(limit int) *Query {
	if !q.hasLimit {
		q.Write(" LIMIT ")
		q.Write(fmt.Sprintf("%d", limit))
		q.hasLimit = true
	}
	return q
}

// Offset adds an OFFSET clause
func (q *Query) Offset(offset int) *Query {
	if !q.hasOffset {
		q.Write(" OFFSET ")
		q.Write(fmt.Sprintf("%d", offset))
		q.hasOffset = true
	}
	return q
}

// Insert starts an INSERT statement
func (q *Query) Insert(table string, columns ...string) *Query {
	q.Write("INSERT INTO ")
	q.Write(table)
	q.Write(" (")
	q.Write(strings.Join(columns, ", "))
	q.Write(") VALUES ")
	return q
}

// Values adds a VALUES clause
func (q *Query) Values(count int) *Query {
	q.Write("(")
	q.Placeholders(count)
	q.Write(")")
	return q
}

// Update starts an UPDATE statement
func (q *Query) Update(table string) *Query {
	q.Write("UPDATE ")
	q.Write(table)
	q.Write(" SET ")
	return q
}

// Set adds a SET clause for updates
func (q *Query) Set(column string) *Query {
	if strings.Contains(q.builder.String(), "SET ") &&
		!strings.HasSuffix(q.builder.String(), "SET ") {
		q.Write(", ")
	}
	q.Write(column)
	q.Write(" = ")
	return q
}

// Delete starts a DELETE statement
func (q *Query) Delete() *Query {
	q.Write("DELETE")
	return q
}

// StartGroup starts a parenthetical group
func (q *Query) StartGroup() *Query {
	if q.hasWhere {
		q.Write(" AND (")
	} else {
		q.Write(" WHERE (")
		q.hasWhere = true
	}
	q.parensDepth++
	return q
}

// EndGroup ends a parenthetical group
func (q *Query) EndGroup() *Query {
	if q.parensDepth > 0 {
		q.Write(")")
		q.parensDepth--
	}
	return q
}

// Returning adds a RETURNING clause for both PostgreSQL and SQLite (3.35.0+)
func (q *Query) Returning(columns ...string) *Query {
	q.Write(" RETURNING ")
	if len(columns) == 1 && columns[0] == "*" {
		q.Write("*")
	} else {
		q.Write(strings.Join(columns, ", "))
	}

	return q
}

// Write adds a string to the query
func (q *Query) Write(s string) *Query {
	q.builder.WriteString(s)
	return q
}

// Placeholder adds a placeholder for a single argument
func (q *Query) Placeholder(arg any) *Query {
	q.pos++
	q.args = append(q.args, arg)

	if q.dbType == DBTypePostgres {
		q.builder.WriteString(fmt.Sprintf("$%d", q.pos))
	} else {
		q.builder.WriteString("?")
	}

	return q
}

// Placeholders adds n placeholders separated by commas
func (q *Query) Placeholders(n int) *Query {
	placeholders := make([]string, n)

	for i := range n {
		q.pos++
		if q.dbType == DBTypePostgres {
			placeholders[i] = fmt.Sprintf("$%d", q.pos)
		} else {
			placeholders[i] = "?"
		}
	}

	q.builder.WriteString(strings.Join(placeholders, ", "))
	return q
}

func (q *Query) TimeSince(days int) string {
	if q.dbType == DBTypePostgres {
		return fmt.Sprintf("NOW() - INTERVAL '%d days'", days)
	}

	return fmt.Sprintf("datetime('now', '-%d days')", days)
}

// AddArgs adds arguments to the query
func (q *Query) AddArgs(args ...any) *Query {
	q.args = append(q.args, args...)
	return q
}

// String returns the formatted query string
func (q *Query) String() string {
	return q.builder.String()
}

// Args returns the query arguments
func (q *Query) Args() []any {
	return q.args
}
