import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import EditorSettings from './EditorSettings';

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('EditorSettings', () => {
  const mockOnAutoSaveChange = vi.fn();
  const mockOnShowHiddenFilesChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both toggle switches with labels', () => {
    render(
      <EditorSettings
        autoSave={false}
        showHiddenFiles={false}
        onAutoSaveChange={mockOnAutoSaveChange}
        onShowHiddenFilesChange={mockOnShowHiddenFilesChange}
      />
    );

    expect(screen.getByText('Auto Save')).toBeInTheDocument();
    expect(screen.getByText('Show Hidden Files')).toBeInTheDocument();
  });

  it('shows correct toggle states', () => {
    render(
      <EditorSettings
        autoSave={true}
        showHiddenFiles={false}
        onAutoSaveChange={mockOnAutoSaveChange}
        onShowHiddenFilesChange={mockOnShowHiddenFilesChange}
      />
    );

    const toggles = screen.getAllByRole('switch');
    const autoSaveToggle = toggles[0];
    const hiddenFilesToggle = toggles[1];

    expect(autoSaveToggle).toBeChecked();
    expect(hiddenFilesToggle).not.toBeChecked();
  });

  it('calls onShowHiddenFilesChange when toggle is clicked', () => {
    render(
      <EditorSettings
        autoSave={false}
        showHiddenFiles={false}
        onAutoSaveChange={mockOnAutoSaveChange}
        onShowHiddenFilesChange={mockOnShowHiddenFilesChange}
      />
    );

    // Get the show hidden files toggle by finding the one that's not disabled
    const toggles = screen.getAllByRole('switch');
    const hiddenFilesToggle = toggles.find(
      (toggle) => !toggle.hasAttribute('disabled')
    );

    expect(hiddenFilesToggle).toBeDefined();
    fireEvent.click(hiddenFilesToggle!);

    expect(mockOnShowHiddenFilesChange).toHaveBeenCalledWith(true);
  });
});
