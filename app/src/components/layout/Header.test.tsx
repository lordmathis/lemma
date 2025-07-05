import { describe, it, expect, vi } from 'vitest';
import { render } from '../../test/utils';
import Header from './Header';

// Mock the child components
vi.mock('../navigation/UserMenu', () => ({
  default: () => <div data-testid="user-menu">User Menu</div>,
}));

vi.mock('../navigation/WorkspaceSwitcher', () => ({
  default: () => <div data-testid="workspace-switcher">Workspace Switcher</div>,
}));

vi.mock('../settings/workspace/WorkspaceSettings', () => ({
  default: () => <div data-testid="workspace-settings">Workspace Settings</div>,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

describe('Header', () => {
  it('renders the app title', () => {
    const { getByText } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    expect(getByText('Lemma')).toBeInTheDocument();
  });

  it('renders user menu component', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    expect(getByTestId('user-menu')).toBeInTheDocument();
  });

  it('renders workspace switcher component', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    expect(getByTestId('workspace-switcher')).toBeInTheDocument();
  });

  it('renders workspace settings component', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    );

    expect(getByTestId('workspace-settings')).toBeInTheDocument();
  });
});
