import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useMantineColorScheme, type MantineColorScheme } from '@mantine/core';

interface ThemeContextType {
  colorScheme: MantineColorScheme;
  updateColorScheme: (newTheme: MantineColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const updateColorScheme = useCallback(
    (newTheme: MantineColorScheme): void => {
      if (newTheme === 'light' || newTheme === 'dark') {
        if (setColorScheme) {
          setColorScheme(newTheme);
        }
      }
    },
    [setColorScheme]
  );

  // Ensure colorScheme is never undefined by falling back to light theme
  const normalizedColorScheme =
    colorScheme === 'light' || colorScheme === 'dark' ? colorScheme : 'light';

  const value: ThemeContextType = useMemo(
    () => ({
      colorScheme: normalizedColorScheme,
      updateColorScheme,
    }),
    [normalizedColorScheme, updateColorScheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
