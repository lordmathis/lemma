import type { MantineTheme } from '@mantine/core';

// For type safety - this property exists on the MantineTheme but may not be in types
interface ThemeWithColorScheme extends MantineTheme {
  colorScheme?: 'dark' | 'light';
}

// Type-safe hover style function for unstyledButton and similar components
export const getHoverStyle = (theme: MantineTheme) => ({
  borderRadius: theme.radius.sm,
  '&:hover': {
    backgroundColor:
      (theme as ThemeWithColorScheme).colorScheme === 'dark'
        ? theme.colors.dark[5]
        : theme.colors.gray[0],
  },
});

// Type-safe color function for text or components that need conditional colors
export const getConditionalColor = (
  theme: MantineTheme,
  isSelected = false
) => {
  if (isSelected) {
    return (theme as ThemeWithColorScheme).colorScheme === 'dark'
      ? theme.colors.blue[2]
      : theme.colors.blue[7];
  }
  return 'dimmed';
};

// Helper for accordion styling
export const getAccordionStyles = (theme: MantineTheme) => ({
  control: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  item: {
    borderBottom: `1px solid ${
      (theme as ThemeWithColorScheme).colorScheme === 'dark'
        ? theme.colors.dark[4]
        : theme.colors.gray[3]
    }`,
    '&[data-active]': {
      backgroundColor:
        (theme as ThemeWithColorScheme).colorScheme === 'dark'
          ? theme.colors.dark[7]
          : theme.colors.gray[0],
    },
  },
});

// Helper for workspace paper styling
export const getWorkspacePaperStyle = (
  theme: MantineTheme,
  isSelected: boolean
) => ({
  backgroundColor: isSelected
    ? theme.colors.blue[
        (theme as ThemeWithColorScheme).colorScheme === 'dark' ? 8 : 1
      ]
    : undefined,
  borderColor: isSelected
    ? theme.colors.blue[
        (theme as ThemeWithColorScheme).colorScheme === 'dark' ? 7 : 5
      ]
    : undefined,
});

// Helper for text color based on theme and selection
export const getTextColor = (
  theme: MantineTheme,
  isSelected: boolean
): string | null => {
  if (!isSelected) return null;

  return (theme as ThemeWithColorScheme).colorScheme === 'dark'
    ? theme.colors.blue[0]
    : theme.colors.blue[9];
};
