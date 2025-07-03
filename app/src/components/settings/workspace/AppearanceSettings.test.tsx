import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import AppearanceSettings from './AppearanceSettings';
import { Theme } from '@/types/models';

const mockUpdateColorScheme = vi.fn();

vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('AppearanceSettings', () => {
  const mockOnThemeChange = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const { useTheme } = await import('../../../contexts/ThemeContext');
    vi.mocked(useTheme).mockReturnValue({
      colorScheme: 'light',
      updateColorScheme: mockUpdateColorScheme,
    });
  });

  it('renders dark mode toggle with correct state', () => {
    render(<AppearanceSettings onThemeChange={mockOnThemeChange} />);

    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
  });

  it('shows toggle as checked when in dark mode', async () => {
    const { useTheme } = await import('../../../contexts/ThemeContext');
    vi.mocked(useTheme).mockReturnValue({
      colorScheme: 'dark',
      updateColorScheme: mockUpdateColorScheme,
    });

    render(<AppearanceSettings onThemeChange={mockOnThemeChange} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked();
  });

  it('toggles theme from light to dark', () => {
    render(<AppearanceSettings onThemeChange={mockOnThemeChange} />);

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(mockUpdateColorScheme).toHaveBeenCalledWith(Theme.Dark);
    expect(mockOnThemeChange).toHaveBeenCalledWith(Theme.Dark);
  });

  it('toggles theme from dark to light', async () => {
    const { useTheme } = await import('../../../contexts/ThemeContext');
    vi.mocked(useTheme).mockReturnValue({
      colorScheme: 'dark',
      updateColorScheme: mockUpdateColorScheme,
    });

    render(<AppearanceSettings onThemeChange={mockOnThemeChange} />);

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(mockUpdateColorScheme).toHaveBeenCalledWith(Theme.Light);
    expect(mockOnThemeChange).toHaveBeenCalledWith(Theme.Light);
  });
});
