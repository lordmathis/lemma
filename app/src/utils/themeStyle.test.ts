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
    // Use different color values for light and dark themes
    // so we can test that different themes produce different results
    dark: Array(10)
      .fill(0)
      .map((_, i) =>
        colorScheme === 'light' ? `#dark-light-${i}` : `#dark-dark-${i}`
      ),
    gray: Array(10)
      .fill(0)
      .map((_, i) =>
        colorScheme === 'light' ? `#gray-light-${i}` : `#gray-dark-${i}`
      ),
    blue: Array(10)
      .fill(0)
      .map((_, i) =>
        colorScheme === 'light' ? `#blue-light-${i}` : `#blue-dark-${i}`
      ),
  },
  colorScheme,
});

const mockLightTheme = createMockTheme('light') as unknown as MantineTheme;
const mockDarkTheme = createMockTheme('dark') as unknown as MantineTheme;

describe('themeStyles utilities', () => {
  describe('getHoverStyle', () => {
    it('returns hover styles with theme-appropriate values', () => {
      const lightResult = getHoverStyle(mockLightTheme);
      const darkResult = getHoverStyle(mockDarkTheme);

      // Test structure is correct
      expect(lightResult).toHaveProperty('borderRadius');
      expect(lightResult).toHaveProperty('&:hover.backgroundColor');
      expect(darkResult).toHaveProperty('borderRadius');
      expect(darkResult).toHaveProperty('&:hover.backgroundColor');

      // Both themes should use the small border radius
      expect(lightResult.borderRadius).toBe(mockLightTheme.radius.sm);
      expect(darkResult.borderRadius).toBe(mockDarkTheme.radius.sm);

      // Dark and light themes should have different hover colors
      expect(lightResult['&:hover'].backgroundColor).not.toBe(
        darkResult['&:hover'].backgroundColor
      );
    });
  });

  describe('getConditionalColor', () => {
    it('returns theme-specific colors when selected', () => {
      // Test behavior, not specific hex values
      const lightResult = getConditionalColor(mockLightTheme, true);
      const darkResult = getConditionalColor(mockDarkTheme, true);

      // Different colors for different themes
      expect(lightResult).not.toBe(darkResult);
      // Not using the fallback value
      expect(lightResult).not.toBe('dimmed');
      expect(darkResult).not.toBe('dimmed');
      // Should be a color string
      expect(typeof lightResult).toBe('string');
      expect(typeof darkResult).toBe('string');
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
    it('returns theme-appropriate accordion styles', () => {
      const lightResult = getAccordionStyles(mockLightTheme);
      const darkResult = getAccordionStyles(mockDarkTheme);

      // Test structure is correct
      expect(lightResult.control).toHaveProperty('paddingTop');
      expect(lightResult.control).toHaveProperty('paddingBottom');
      expect(lightResult.item).toHaveProperty('borderBottom');
      expect(lightResult.item['&[data-active]']).toHaveProperty(
        'backgroundColor'
      );

      // Padding should use theme spacing
      expect(lightResult.control.paddingTop).toBe(mockLightTheme.spacing.md);
      expect(lightResult.control.paddingBottom).toBe(mockLightTheme.spacing.md);

      // Active state should have different background colors in different themes
      expect(lightResult.item['&[data-active]'].backgroundColor).not.toBe(
        darkResult.item['&[data-active]'].backgroundColor
      );
    });
  });

  describe('getWorkspacePaperStyle', () => {
    it('returns theme-appropriate styles when selected', () => {
      const lightResult = getWorkspacePaperStyle(mockLightTheme, true);
      const darkResult = getWorkspacePaperStyle(mockDarkTheme, true);

      // Test structure is correct
      expect(lightResult).toHaveProperty('backgroundColor');
      expect(lightResult).toHaveProperty('borderColor');
      expect(darkResult).toHaveProperty('backgroundColor');
      expect(darkResult).toHaveProperty('borderColor');

      // Different themes should use different colors
      expect(lightResult.backgroundColor).not.toBe(darkResult.backgroundColor);
      expect(lightResult.borderColor).not.toBe(darkResult.borderColor);
    });

    it('returns undefined styles when not selected', () => {
      const result = getWorkspacePaperStyle(mockLightTheme, false);

      expect(result.backgroundColor).toBeUndefined();
      expect(result.borderColor).toBeUndefined();
    });
  });

  describe('getTextColor', () => {
    it('returns theme-dependent color when selected', () => {
      const lightResult = getTextColor(mockLightTheme, true);
      const darkResult = getTextColor(mockDarkTheme, true);

      // Should return a string for selected state
      expect(typeof lightResult).toBe('string');
      expect(typeof darkResult).toBe('string');

      // Different themes should have different text colors
      expect(lightResult).not.toBe(darkResult);
    });

    it('returns null when not selected', () => {
      expect(getTextColor(mockLightTheme, false)).toBeNull();
      expect(getTextColor(mockDarkTheme, false)).toBeNull();
    });
  });
});
