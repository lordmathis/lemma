import { Themes } from '@geist-ui/core'

const customDarkTheme = Themes.createFromLight({
  type: 'custom-dark',
  palette: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    selection: '#2c313a',
    secondary: '#858585',
    code: '#d4d4d4',
    border: '#333333',
    success: '#4EC9B0',
    warning: '#9CDCFE',
    error: '#F44747',
  },
  expressiveness: {
    dropdownBoxShadow: '0 0 0 1px #333333',
    shadowSmall: '0 0 0 1px #333333',
    shadowMedium: '0 0 0 1px #333333',
    shadowLarge: '0 0 0 1px #333333',
  },
})

export const customTheme = {
  light: Themes.light,
  dark: customDarkTheme,
}