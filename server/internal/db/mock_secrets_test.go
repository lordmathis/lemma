package db_test

type mockSecrets struct{}

func (m *mockSecrets) Encrypt(s string) (string, error) { return s, nil }
func (m *mockSecrets) Decrypt(s string) (string, error) { return s, nil }
