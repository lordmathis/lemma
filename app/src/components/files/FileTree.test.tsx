import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/utils';
import FileTree from './FileTree';
import type { FileNode } from '../../types/models';

// Mock react-arborist
vi.mock('react-arborist', () => ({
  Tree: ({
    children,
    data,
    onActivate,
  }: {
    children: (props: {
      node: {
        data: FileNode;
        isLeaf: boolean;
        isInternal: boolean;
        isOpen: boolean;
        level: number;
        toggle: () => void;
      };
      style: Record<string, unknown>;
      onNodeClick: (node: { isInternal: boolean }) => void;
    }) => React.ReactNode;
    data: FileNode[];
    onActivate: (node: { isInternal: boolean; data: FileNode }) => void;
  }) => (
    <div data-testid="file-tree">
      {data.map((file) => {
        const mockNode = {
          data: file,
          isLeaf: !file.children || file.children.length === 0,
          isInternal: !!(file.children && file.children.length > 0),
          isOpen: false,
          level: 0,
          toggle: vi.fn(),
        };

        return (
          <div
            key={file.id}
            data-testid={`file-node-${file.id}`}
            onClick={() => {
              // Simulate the Tree's onActivate behavior
              if (!mockNode.isInternal) {
                onActivate({ isInternal: mockNode.isInternal, data: file });
              }
            }}
          >
            {children({
              node: mockNode,
              style: {},
              onNodeClick: (node: { isInternal: boolean }) => {
                if (!node.isInternal) {
                  onActivate({ isInternal: node.isInternal, data: file });
                }
              },
            })}
          </div>
        );
      })}
    </div>
  ),
}));

// Mock resize observer hook
vi.mock('@react-hook/resize-observer', () => ({
  default: vi.fn(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

describe('FileTree', () => {
  const mockHandleFileSelect = vi.fn();

  const mockFiles: FileNode[] = [
    {
      id: '1',
      name: 'README.md',
      path: 'README.md',
    },
    {
      id: '2',
      name: 'docs',
      path: 'docs',
      children: [
        {
          id: '3',
          name: 'guide.md',
          path: 'docs/guide.md',
        },
      ],
    },
    {
      id: '4',
      name: '.hidden',
      path: '.hidden',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders file tree with files', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <FileTree
          files={mockFiles}
          handleFileSelect={mockHandleFileSelect}
          showHiddenFiles={true}
        />
      </TestWrapper>
    );

    expect(getByTestId('file-tree')).toBeInTheDocument();
    expect(getByTestId('file-node-1')).toBeInTheDocument();
    expect(getByTestId('file-node-2')).toBeInTheDocument();
  });

  it('calls handleFileSelect when file is clicked', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <FileTree
          files={mockFiles}
          handleFileSelect={mockHandleFileSelect}
          showHiddenFiles={true}
        />
      </TestWrapper>
    );

    const fileNode = getByTestId('file-node-1');
    fireEvent.click(fileNode);

    await waitFor(() => {
      expect(mockHandleFileSelect).toHaveBeenCalledWith('README.md');
    });
  });

  it('filters out hidden files when showHiddenFiles is false', () => {
    const { getByTestId, queryByTestId } = render(
      <TestWrapper>
        <FileTree
          files={mockFiles}
          handleFileSelect={mockHandleFileSelect}
          showHiddenFiles={false}
        />
      </TestWrapper>
    );

    // Should show regular files
    expect(getByTestId('file-node-1')).toBeInTheDocument();
    expect(getByTestId('file-node-2')).toBeInTheDocument();

    // Should not show hidden file
    expect(queryByTestId('file-node-4')).not.toBeInTheDocument();
  });

  it('shows hidden files when showHiddenFiles is true', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <FileTree
          files={mockFiles}
          handleFileSelect={mockHandleFileSelect}
          showHiddenFiles={true}
        />
      </TestWrapper>
    );

    // Should show all files including hidden
    expect(getByTestId('file-node-1')).toBeInTheDocument();
    expect(getByTestId('file-node-2')).toBeInTheDocument();
    expect(getByTestId('file-node-4')).toBeInTheDocument();
  });

  it('renders empty tree when no files provided', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <FileTree
          files={[]}
          handleFileSelect={mockHandleFileSelect}
          showHiddenFiles={true}
        />
      </TestWrapper>
    );

    const tree = getByTestId('file-tree');
    expect(tree).toBeInTheDocument();
    expect(tree.children).toHaveLength(0);
  });

  it('does not call handleFileSelect for folder clicks', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <FileTree
          files={mockFiles}
          handleFileSelect={mockHandleFileSelect}
          showHiddenFiles={true}
        />
      </TestWrapper>
    );

    // Click on folder (has children)
    const folderNode = getByTestId('file-node-2');
    fireEvent.click(folderNode);

    // Should not call handleFileSelect for folders
    await waitFor(() => {
      expect(mockHandleFileSelect).not.toHaveBeenCalled();
    });
  });
});
