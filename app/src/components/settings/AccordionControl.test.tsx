import { describe, it, expect } from 'vitest';
import AccordionControl from './AccordionControl';
import { render } from '@/test/utils';
import { screen } from '@testing-library/react';
import { Accordion } from '@mantine/core';

// Test wrapper component to properly provide Accordion context
const AccordionWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Accordion>
    <Accordion.Item value="test">{children}</Accordion.Item>
  </Accordion>
);

describe('AccordionControl', () => {
  it('renders children correctly', () => {
    render(
      <AccordionWrapper>
        <AccordionControl>Test Content</AccordionControl>
      </AccordionWrapper>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders as a Title with order 4', () => {
    render(
      <AccordionWrapper>
        <AccordionControl>Settings Title</AccordionControl>
      </AccordionWrapper>
    );

    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Settings Title');
  });

  it('renders with complex children', () => {
    render(
      <AccordionWrapper>
        <AccordionControl>
          <span>Complex</span> Content
        </AccordionControl>
      </AccordionWrapper>
    );

    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('handles empty children', () => {
    render(
      <AccordionWrapper>
        <AccordionControl>{''}</AccordionControl>
      </AccordionWrapper>
    );

    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toBeInTheDocument();
    expect(title).toBeEmptyDOMElement();
  });

  it('renders multiple text nodes', () => {
    render(
      <AccordionWrapper>
        <AccordionControl>First Text Second Text</AccordionControl>
      </AccordionWrapper>
    );

    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('First Text Second Text');
  });

  it('preserves React component structure', () => {
    render(
      <AccordionWrapper>
        <AccordionControl>
          <div data-testid="nested-div">Nested Content</div>
        </AccordionControl>
      </AccordionWrapper>
    );

    expect(screen.getByTestId('nested-div')).toBeInTheDocument();
    expect(screen.getByText('Nested Content')).toBeInTheDocument();
  });

  it('renders with string and element children', () => {
    render(
      <AccordionWrapper>
        <AccordionControl>
          Text before <strong>bold text</strong> and after
        </AccordionControl>
      </AccordionWrapper>
    );

    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('Text before bold text and after');
    expect(title.querySelector('strong')).toHaveTextContent('bold text');
  });
});
