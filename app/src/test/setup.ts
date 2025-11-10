import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';

// Suppress console errors during tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Suppress specific expected errors during tests
    const errorString = args.join(' ');
    if (
      errorString.includes('Failed to initialize auth') ||
      errorString.includes('Failed to save last opened file') ||
      errorString.includes('Failed to load last opened file')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Mock window.API_BASE_URL
Object.defineProperty(window, 'API_BASE_URL', {
  value: 'http://localhost:8080/api/v1',
  writable: true,
});

// Mock matchMedia - required for Mantine components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver - sometimes needed for Mantine components
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};
