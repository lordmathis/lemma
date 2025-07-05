import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import AdminStatsTab from './AdminStatsTab';
import type { SystemStats } from '@/types/models';

// Mock the admin data hook
vi.mock('../../../hooks/useAdminData', () => ({
  useAdminData: vi.fn(),
}));

// Mock the formatBytes utility
vi.mock('../../../utils/formatBytes', () => ({
  formatBytes: (bytes: number) => `${bytes} bytes`,
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('AdminStatsTab', () => {
  const mockStats: SystemStats = {
    totalUsers: 150,
    activeUsers: 120,
    totalWorkspaces: 85,
    totalFiles: 2500,
    totalSize: 1073741824, // 1GB in bytes
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useAdminData } = await import('../../../hooks/useAdminData');
    vi.mocked(useAdminData).mockReturnValue({
      data: mockStats,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it('renders statistics table with all metrics', () => {
    render(<AdminStatsTab />);

    expect(screen.getByText('System Statistics')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Total Workspaces')).toBeInTheDocument();
    expect(screen.getByText('Total Files')).toBeInTheDocument();
    expect(screen.getByText('Total Storage Size')).toBeInTheDocument();
  });

  it('displays correct statistics values', () => {
    render(<AdminStatsTab />);

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('2500')).toBeInTheDocument();
    expect(screen.getByText('1073741824 bytes')).toBeInTheDocument();
  });

  it('shows loading state', async () => {
    const { useAdminData } = await import('../../../hooks/useAdminData');
    vi.mocked(useAdminData).mockReturnValue({
      data: {} as SystemStats,
      loading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<AdminStatsTab />);

    // Mantine LoadingOverlay should be visible
    expect(
      document.querySelector('.mantine-LoadingOverlay-root')
    ).toBeInTheDocument();
  });

  it('shows error state', async () => {
    const { useAdminData } = await import('../../../hooks/useAdminData');
    vi.mocked(useAdminData).mockReturnValue({
      data: {} as SystemStats,
      loading: false,
      error: 'Failed to load statistics',
      reload: vi.fn(),
    });

    render(<AdminStatsTab />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load statistics')).toBeInTheDocument();
  });

  it('handles zero values correctly', async () => {
    const zeroStats: SystemStats = {
      totalUsers: 0,
      activeUsers: 0,
      totalWorkspaces: 0,
      totalFiles: 0,
      totalSize: 0,
    };

    const { useAdminData } = await import('../../../hooks/useAdminData');
    vi.mocked(useAdminData).mockReturnValue({
      data: zeroStats,
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AdminStatsTab />);

    // Should display zeros without issues
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
    expect(screen.getByText('0 bytes')).toBeInTheDocument();
  });
});
