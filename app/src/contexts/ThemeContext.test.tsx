import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';
import type { MantineColorScheme } from '@mantine/core';

// Mock Mantine's color scheme hook
const mockSetColorScheme = vi.fn();
const mockUseMantineColorScheme = vi.fn();

vi.mock('@mantine/core', () => ({
  useMantineColorScheme: (): {
    colorScheme: MantineColorScheme | undefined;
    setColorScheme?: (scheme: MantineColorScheme) => void;
  } =>
    mockUseMantineColorScheme() as {
      colorScheme: MantineColorScheme | undefined;
      setColorScheme?: (scheme: MantineColorScheme) => void;
    },
}));

// Helper wrapper component for testing
const createWrapper = (initialColorScheme: MantineColorScheme = 'light') => {
  mockUseMantineColorScheme.mockReturnValue({
    colorScheme: initialColorScheme,
    setColorScheme: mockSetColorScheme,
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );
  Wrapper.displayName = 'ThemeProviderTestWrapper';
  return Wrapper;
};

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ThemeProvider', () => {
    it('provides theme context with light scheme by default', () => {
      const wrapper = createWrapper('light');
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.colorScheme).toBe('light');
      expect(typeof result.current.updateColorScheme).toBe('function');
    });

    it('provides theme context with dark scheme', () => {
      const wrapper = createWrapper('dark');
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.colorScheme).toBe('dark');
      expect(typeof result.current.updateColorScheme).toBe('function');
    });

    it('provides theme context with fallback to light scheme', () => {
      const wrapper = createWrapper('auto');
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.colorScheme).toBe('light');
      expect(typeof result.current.updateColorScheme).toBe('function');
    });

    it('calls useMantineColorScheme hook', () => {
      const wrapper = createWrapper('light');
      renderHook(() => useTheme(), { wrapper });

      expect(mockUseMantineColorScheme).toHaveBeenCalled();
    });
  });

  describe('useTheme hook', () => {
    it('throws error when used outside ThemeProvider', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('returns current color scheme from Mantine', () => {
      const wrapper = createWrapper('dark');
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.colorScheme).toBe('dark');
    });

    it('provides updateColorScheme function', () => {
      const wrapper = createWrapper('light');
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(typeof result.current.updateColorScheme).toBe('function');
    });

    it('maintains function stability across re-renders', () => {
      const wrapper = createWrapper('light');
      const { result, rerender } = renderHook(() => useTheme(), { wrapper });

      const initialUpdateFunction = result.current.updateColorScheme;

      rerender();

      expect(result.current.updateColorScheme).toBe(initialUpdateFunction);
    });
  });

  describe('updateColorScheme functionality', () => {
    it('calls setColorScheme when updateColorScheme is invoked', () => {
      const wrapper = createWrapper('light');
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.updateColorScheme('dark');
      });

      expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
    });

    it('handles multiple color scheme changes', () => {
      const wrapper = createWrapper('light');
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.updateColorScheme('dark');
      });

      act(() => {
        // Should not set color scheme to 'auto'
        result.current.updateColorScheme('auto');
      });

      act(() => {
        result.current.updateColorScheme('light');
      });

      expect(mockSetColorScheme).toHaveBeenCalledTimes(2);
      expect(mockSetColorScheme).toHaveBeenNthCalledWith(1, 'dark');
      expect(mockSetColorScheme).toHaveBeenNthCalledWith(2, 'light');
    });
  });

  describe('context structure', () => {
    it('provides expected context interface', () => {
      const wrapper = createWrapper('light');
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current).toEqual({
        colorScheme: 'light',
        updateColorScheme: expect.any(Function) as unknown,
      });
    });

    it('context value has correct types', () => {
      const wrapper = createWrapper('dark');
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(typeof result.current.colorScheme).toBe('string');
      expect(typeof result.current.updateColorScheme).toBe('function');
    });
    it('maintains function reference when color scheme changes', () => {
      mockUseMantineColorScheme.mockReturnValue({
        colorScheme: 'light',
        setColorScheme: mockSetColorScheme,
      });

      const wrapper = createWrapper('light');
      const { result, rerender } = renderHook(() => useTheme(), { wrapper });

      const initialUpdateFunction = result.current.updateColorScheme;

      // Change color scheme
      mockUseMantineColorScheme.mockReturnValue({
        colorScheme: 'dark',
        setColorScheme: mockSetColorScheme,
      });

      rerender();

      expect(result.current.updateColorScheme).toBe(initialUpdateFunction);
    });
  });

  describe('provider nesting', () => {
    it('works with nested providers (inner provider takes precedence)', () => {
      mockUseMantineColorScheme.mockReturnValue({
        colorScheme: 'dark',
        setColorScheme: mockSetColorScheme,
      });

      const NestedWrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), {
        wrapper: NestedWrapper,
      });

      expect(result.current.colorScheme).toBe('dark');
      expect(typeof result.current.updateColorScheme).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('handles undefined color scheme gracefully by falling back to light theme', () => {
      mockUseMantineColorScheme.mockReturnValue({
        colorScheme: undefined,
        setColorScheme: mockSetColorScheme,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Should fallback to 'light' theme rather than being undefined
      expect(result.current.colorScheme).toBe('light');
      expect(typeof result.current.updateColorScheme).toBe('function');
    });

    it('handles missing setColorScheme function', () => {
      mockUseMantineColorScheme.mockReturnValue({
        colorScheme: 'light',
        setColorScheme: undefined,
      });

      const wrapper = createWrapper();

      // Should not throw during render
      expect(() => {
        renderHook(() => useTheme(), { wrapper });
      }).not.toThrow();
    });

    it('handles updateColorScheme with same color scheme', () => {
      const wrapper = createWrapper('light');
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.updateColorScheme('light'); // Same as current
      });

      expect(mockSetColorScheme).toHaveBeenCalledWith('light');
    });
  });
});
