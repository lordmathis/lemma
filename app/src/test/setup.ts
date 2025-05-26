import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
