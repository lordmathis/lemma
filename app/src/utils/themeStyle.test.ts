import { describe, it, expect } from 'vitest';
import type { MantineTheme } from '@mantine/core';
import {
  getHoverStyle,
  getConditionalColor,
  getAccordionStyles,
  getWorkspacePaperStyle,
  getTextColor,
} from './themeStyles';

// Create partial mock themes with only the properties we need
const createMockTheme = (colorScheme: 'light' | 'dark') => ({
  radius: { sm: '4px' },
  spacing: { md: '16px' },
  colors: {
    dark: [
      '#fff',
      '#f8f9fa',
      '#e9ecef',
      '#dee2e6',
      '#ced4da',
      '#adb5bd',
      '#6c757d',
      '#495057',
      '#343a40',
      '#212529',
    ],
    gray: [
      '#f8f9fa',
      '#e9ecef',
      '#dee2e6',
      '#ced4da',
      '#adb5bd',
      '#6c757d',
      '#495057',
      '#343a40',
      '#212529',
      '#000',
    ],
    blue: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#339af0',
      '#228be6',
      '#1971c2',
      '#1864ab',
      '#0b4fa8',
      '#073e78',
    ],
  },
  colorScheme,
});

const mockLightTheme = createMockTheme('light') as unknown as MantineTheme;
const mockDarkTheme = createMockTheme('dark') as unknown as MantineTheme;

describe('themeStyles utilities', () => {
  describe('getHoverStyle', () => {
    it('returns correct hover styles for light theme', () => {
      const result = getHoverStyle(mockLightTheme);

      expect(result).toEqual({
        borderRadius: '4px',
        '&:hover': {
          backgroundColor: '#f8f9fa', // gray[0] for light theme
        },
      });
    });

    it('returns correct hover styles for dark theme', () => {
      const result = getHoverStyle(mockDarkTheme);

      expect(result).toEqual({
        borderRadius: '4px',
        '&:hover': {
          backgroundColor: '#adb5bd', // dark[5] for dark theme
        },
      });
    });
  });

  describe('getConditionalColor', () => {
    it('returns blue color when selected in light theme', () => {
      const result = getConditionalColor(mockLightTheme, true);
      expect(result).toBe('#1864ab'); // blue[7] for light theme
    });

    it('returns blue color when selected in dark theme', () => {
      const result = getConditionalColor(mockDarkTheme, true);
      expect(result).toBe('#a5d8ff'); // blue[2] for dark theme
    });

    it('returns dimmed when not selected', () => {
      expect(getConditionalColor(mockLightTheme, false)).toBe('dimmed');
      expect(getConditionalColor(mockDarkTheme, false)).toBe('dimmed');
    });

    it('defaults to dimmed when no selection parameter provided', () => {
      expect(getConditionalColor(mockLightTheme)).toBe('dimmed');
      expect(getConditionalColor(mockDarkTheme)).toBe('dimmed');
    });
  });

  describe('getAccordionStyles', () => {
    it('returns correct accordion styles for light theme', () => {
      const result = getAccordionStyles(mockLightTheme);

      expect(result.control.paddingTop).toBe('16px');
      expect(result.control.paddingBottom).toBe('16px');
      expect(result.item.borderBottom).toBe('1px solid #ced4da'); // gray[3]
      expect(result.item['&[data-active]'].backgroundColor).toBe('#f8f9fa'); // gray[0]
    });

    it('returns correct accordion styles for dark theme', () => {
      const result = getAccordionStyles(mockDarkTheme);

      expect(result.control.paddingTop).toBe('16px');
      expect(result.control.paddingBottom).toBe('16px');
      expect(result.item.borderBottom).toBe('1px solid #ced4da'); // dark[4]
      expect(result.item['&[data-active]'].backgroundColor).toBe('#495057'); // dark[7]
    });
  });

  describe('getWorkspacePaperStyle', () => {
    it('returns selected styles for light theme when selected', () => {
      const result = getWorkspacePaperStyle(mockLightTheme, true);

      expect(result.backgroundColor).toBe('#d0ebff'); // blue[1]
      expect(result.borderColor).toBe('#228be6'); // blue[5]
    });

    it('returns selected styles for dark theme when selected', () => {
      const result = getWorkspacePaperStyle(mockDarkTheme, true);

      expect(result.backgroundColor).toBe('#0b4fa8'); // blue[8]
      expect(result.borderColor).toBe('#1864ab'); // blue[7]
    });

    it('returns undefined styles when not selected', () => {
      const result = getWorkspacePaperStyle(mockLightTheme, false);

      expect(result.backgroundColor).toBeUndefined();
      expect(result.borderColor).toBeUndefined();
    });
  });

  describe('getTextColor', () => {
    it('returns blue text color when selected in light theme', () => {
      const result = getTextColor(mockLightTheme, true);
      expect(result).toBe('#073e78'); // blue[9]
    });

    it('returns blue text color when selected in dark theme', () => {
      const result = getTextColor(mockDarkTheme, true);
      expect(result).toBe('#e7f5ff'); // blue[0]
    });

    it('returns null when not selected', () => {
      expect(getTextColor(mockLightTheme, false)).toBeNull();
      expect(getTextColor(mockDarkTheme, false)).toBeNull();
    });
  });
});
