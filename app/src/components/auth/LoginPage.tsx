import React, { useState, type FormEvent } from 'react';
import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Container,
  Button,
  Text,
  Stack,
} from '@mantine/core';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { login } = useAuth();

  const handleSubmit = (e: FormEvent<HTMLElement>): void => {
    e.preventDefault();
    setLoading(true);
    login(email, password)
      .catch((error) => {
        console.error('Login failed:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Welcome to Lemma</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Please sign in to continue
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit} role="form">
          <Stack>
            <TextInput
              type="email"
              label="Email"
              placeholder="your@email.com"
              data-testid="email-input"
              required
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              data-testid="password-input"
              required
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />

            <Button type="submit" loading={loading} data-testid="login-button">
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default LoginPage;
