import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import GitSettings from './GitSettings';

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('GitSettings', () => {
  const mockOnInputChange = vi.fn();

  const defaultProps = {
    gitEnabled: false,
    gitUrl: '',
    gitUser: '',
    gitToken: '',
    gitAutoCommit: false,
    gitCommitMsgTemplate: '',
    gitCommitName: '',
    gitCommitEmail: '',
    onInputChange: mockOnInputChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all git settings fields', () => {
    render(<GitSettings {...defaultProps} />);

    expect(screen.getByText('Enable Git Repository')).toBeInTheDocument();
    expect(screen.getByText('Git URL')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Access Token')).toBeInTheDocument();
    expect(screen.getByText('Commit on Save')).toBeInTheDocument();
    expect(screen.getByText('Commit Message Template')).toBeInTheDocument();
    expect(screen.getByText('Commit Author')).toBeInTheDocument();
    expect(screen.getByText('Commit Author Email')).toBeInTheDocument();
  });

  it('disables all inputs when git is not enabled', () => {
    render(<GitSettings {...defaultProps} gitEnabled={false} />);

    expect(screen.getByPlaceholderText('Enter Git URL')).toBeDisabled();
    expect(screen.getByPlaceholderText('Enter Git username')).toBeDisabled();
    expect(screen.getByPlaceholderText('Enter Git token')).toBeDisabled();

    const switches = screen.getAllByRole('switch');
    const commitOnSaveSwitch = switches[1]; // Second switch is commit on save
    expect(commitOnSaveSwitch).toBeDisabled();
  });

  it('enables all inputs when git is enabled', () => {
    render(<GitSettings {...defaultProps} gitEnabled={true} />);

    expect(screen.getByPlaceholderText('Enter Git URL')).not.toBeDisabled();
    expect(
      screen.getByPlaceholderText('Enter Git username')
    ).not.toBeDisabled();
    expect(screen.getByPlaceholderText('Enter Git token')).not.toBeDisabled();

    const switches = screen.getAllByRole('switch');
    const commitOnSaveSwitch = switches[1];
    expect(commitOnSaveSwitch).not.toBeDisabled();
  });

  it('calls onInputChange when git enabled toggle is changed', () => {
    render(<GitSettings {...defaultProps} />);

    const switches = screen.getAllByRole('switch');
    const gitEnabledSwitch = switches[0];
    expect(gitEnabledSwitch).toBeDefined();

    fireEvent.click(gitEnabledSwitch!);

    expect(mockOnInputChange).toHaveBeenCalledWith('gitEnabled', true);
  });

  it('calls onInputChange when git URL is changed', () => {
    render(<GitSettings {...defaultProps} gitEnabled={true} />);

    const urlInput = screen.getByPlaceholderText('Enter Git URL');
    fireEvent.change(urlInput, {
      target: { value: 'https://github.com/user/repo.git' },
    });

    expect(mockOnInputChange).toHaveBeenCalledWith(
      'gitUrl',
      'https://github.com/user/repo.git'
    );
  });

  it('calls onInputChange when commit template is changed', () => {
    render(<GitSettings {...defaultProps} gitEnabled={true} />);

    const templateInput = screen.getByPlaceholderText(
      'Enter commit message template'
    );
    fireEvent.change(templateInput, {
      target: { value: '${action}: ${filename}' },
    });

    expect(mockOnInputChange).toHaveBeenCalledWith(
      'gitCommitMsgTemplate',
      '${action}: ${filename}'
    );
  });

  it('shows current values in form fields', () => {
    const propsWithValues = {
      ...defaultProps,
      gitEnabled: true,
      gitUrl: 'https://github.com/test/repo.git',
      gitUser: 'testuser',
      gitCommitMsgTemplate: 'Update ${filename}',
    };

    render(<GitSettings {...propsWithValues} />);

    expect(
      screen.getByDisplayValue('https://github.com/test/repo.git')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Update ${filename}')).toBeInTheDocument();
  });
});
