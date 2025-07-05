import { describe, it, expect, vi } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MantineProvider, Accordion } from '@mantine/core';
import AccordionControl from './AccordionControl';

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

// Test wrapper component to properly provide Accordion context
const AccordionWrapper: React.FC<{
  children: React.ReactNode;
  defaultValue?: string[];
}> = ({ children, defaultValue = ['test'] }) => (
  <Accordion defaultValue={defaultValue} multiple>
    <Accordion.Item value="test">{children}</Accordion.Item>
  </Accordion>
);

describe('AccordionControl', () => {
  describe('Normal Operation', () => {
    it('renders children as Title with order 4', () => {
      render(
        <AccordionWrapper>
          <AccordionControl>Settings Title</AccordionControl>
        </AccordionWrapper>
      );

      const title = screen.getByRole('heading', { level: 4 });
      expect(title).toHaveTextContent('Settings Title');
    });

    it('renders complex children correctly', () => {
      render(
        <AccordionWrapper>
          <AccordionControl>
            <span data-testid="complex-child">Complex</span> Content
          </AccordionControl>
        </AccordionWrapper>
      );

      expect(screen.getByTestId('complex-child')).toBeInTheDocument();
      expect(screen.getByText('Complex')).toBeInTheDocument();
    });

    it('functions as accordion control', () => {
      render(
        <AccordionWrapper defaultValue={[]}>
          <AccordionControl>Toggle Section</AccordionControl>
          <Accordion.Panel>Hidden Content</Accordion.Panel>
        </AccordionWrapper>
      );

      const control = screen.getByRole('button');
      fireEvent.click(control);

      expect(screen.getByText('Hidden Content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children gracefully', () => {
      render(
        <AccordionWrapper>
          <AccordionControl>{''}</AccordionControl>
        </AccordionWrapper>
      );

      const title = screen.getByRole('heading', { level: 4 });
      expect(title).toBeInTheDocument();
    });

    it('passes through children props correctly', () => {
      const mockClickHandler = vi.fn();

      render(
        <AccordionWrapper>
          <AccordionControl>
            <button onClick={mockClickHandler} data-testid="inner-button">
              Click Me
            </button>
          </AccordionControl>
        </AccordionWrapper>
      );

      const innerButton = screen.getByTestId('inner-button');
      fireEvent.click(innerButton);
      expect(mockClickHandler).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('provides proper semantic structure', () => {
      render(
        <AccordionWrapper>
          <AccordionControl>Accessible Title</AccordionControl>
        </AccordionWrapper>
      );

      const title = screen.getByRole('heading', { level: 4 });
      const button = screen.getByRole('button');

      expect(title).toHaveTextContent('Accessible Title');
      expect(button).toContainElement(title);
    });
  });
});
