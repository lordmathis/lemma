import { useEffect } from 'react';
// Import theme CSS as text that will be bundled
import atomOneLightTheme from 'highlight.js/styles/atom-one-light.css?inline';
import atomOneDarkTheme from 'highlight.js/styles/atom-one-dark.css?inline';

export const useHighlightTheme = (colorScheme: 'light' | 'dark') => {
  useEffect(() => {
    // Remove existing highlight theme
    const existingStylesheet = document.querySelector(
      'style[data-highlight-theme]'
    );
    if (existingStylesheet) {
      existingStylesheet.remove();
    }

    // Add new theme stylesheet using bundled CSS
    const style = document.createElement('style');
    style.setAttribute('data-highlight-theme', 'true');

    if (colorScheme === 'dark') {
      style.textContent = atomOneDarkTheme as string;
    } else {
      style.textContent = atomOneLightTheme as string;
    }

    document.head.appendChild(style);

    return () => {
      // Cleanup on unmount
      const stylesheet = document.querySelector('style[data-highlight-theme]');
      if (stylesheet) {
        stylesheet.remove();
      }
    };
  }, [colorScheme]);
};
