import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import GeneralSettings from './GeneralSettings';

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('GeneralSettings', () => {
  const mockOnInputChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders workspace name input with current value', () => {
    render(
      <GeneralSettings name="My Workspace" onInputChange={mockOnInputChange} />
    );

    const nameInput = screen.getByDisplayValue('My Workspace');
    expect(nameInput).toBeInTheDocument();
    expect(screen.getByText('Workspace Name')).toBeInTheDocument();
  });

  it('renders with empty name', () => {
    render(<GeneralSettings name="" onInputChange={mockOnInputChange} />);

    const nameInput = screen.getByPlaceholderText('Enter workspace name');
    expect(nameInput).toHaveValue('');
  });

  it('calls onInputChange when name is modified', () => {
    render(
      <GeneralSettings name="Old Name" onInputChange={mockOnInputChange} />
    );

    const nameInput = screen.getByDisplayValue('Old Name');
    fireEvent.change(nameInput, { target: { value: 'New Workspace Name' } });

    expect(mockOnInputChange).toHaveBeenCalledWith(
      'name',
      'New Workspace Name'
    );
  });

  it('has required attribute on input', () => {
    render(<GeneralSettings name="Test" onInputChange={mockOnInputChange} />);

    const nameInput = screen.getByDisplayValue('Test');
    expect(nameInput).toHaveAttribute('required');
  });
});
