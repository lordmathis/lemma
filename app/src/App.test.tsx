import { describe, it, expect } from 'vitest';
import { render } from '@/test/utils';

describe('Testing Setup Sanity Check', () => {
  it('should render a basic component', () => {
    const TestComponent = () => <div>Hello, World!</div>;

    const { getByText } = render(<TestComponent />);

    expect(getByText('Hello, World!')).toBeInTheDocument();
  });

  it('should have access to global API_BASE_URL', () => {
    expect(window.API_BASE_URL).toBe('http://localhost:8080/api/v1');
  });
});
