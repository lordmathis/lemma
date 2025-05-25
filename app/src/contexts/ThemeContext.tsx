import React, {
  createContext,
  useContext,
  useCallback,
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
      setColorScheme(newTheme);
    },
    [setColorScheme]
  );

  const value: ThemeContextType = {
    colorScheme,
    updateColorScheme,
  };

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
