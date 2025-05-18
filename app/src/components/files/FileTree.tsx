import React, { useRef, useState, useLayoutEffect } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { IconFile, IconFolder, IconFolderOpen } from '@tabler/icons-react';
import { Tooltip } from '@mantine/core';
import useResizeObserver from '@react-hook/resize-observer';
import { FileNode } from '../../types/fileApi';

interface Size {
  width: number;
  height: number;
}

interface FileTreeProps {
  files: FileNode[];
  handleFileSelect: (filePath: string | null) => Promise<void>;
  showHiddenFiles: boolean;
}

const useSize = (target: React.RefObject<HTMLElement>): Size | undefined => {
  const [size, setSize] = useState<Size>();

  useLayoutEffect(() => {
    if (target.current) {
      setSize(target.current.getBoundingClientRect());
    }
  }, [target]);

  useResizeObserver(target, (entry) => setSize(entry.contentRect));
  return size;
};

const FileIcon = ({ node }: { node: NodeApi<FileNode> }) => {
  if (node.isLeaf) {
    return <IconFile size={16} />;
  }
  return node.isOpen ? (
    <IconFolderOpen size={16} color="var(--mantine-color-yellow-filled)" />
  ) : (
    <IconFolder size={16} color="var(--mantine-color-yellow-filled)" />
  );
};

// Define a Node component that matches what React-Arborist expects
function Node(props: any) {
  const { node, style, dragHandle } = props;

  const handleClick = () => {
    if (node.isInternal) {
      node.toggle();
    } else {
      const treeProps = node.tree.props as any;
      if (typeof treeProps.onNodeClick === 'function') {
        treeProps.onNodeClick(node);
      }
    }
  };

  return (
    <Tooltip label={node.data.name} openDelay={500}>
      <div
        ref={dragHandle}
        style={{
          ...style,
          paddingLeft: `${node.level * 20}px`,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onClick={handleClick}
      >
        <FileIcon node={node} />
        <span
          style={{
            marginLeft: '8px',
            fontSize: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexGrow: 1,
          }}
        >
          {node.data.name}
        </span>
      </div>
    </Tooltip>
  );
}

const FileTree: React.FC<FileTreeProps> = ({
  files,
  handleFileSelect,
  showHiddenFiles,
}) => {
  const target = useRef<HTMLDivElement>(null);
  const size = useSize(target);

  const filteredFiles = files.filter((file) => {
    if (file.name.startsWith('.') && !showHiddenFiles) {
      return false;
    }
    return true;
  });

  return (
    <div
      ref={target}
      style={{ height: 'calc(100vh - 140px)', marginTop: '20px' }}
    >
      {size && (
        <Tree
          data={filteredFiles}
          openByDefault={false}
          width={size.width}
          height={size.height}
          indent={24}
          rowHeight={28}
          onActivate={(node) => {
            const fileNode = node.data as FileNode;
            if (!node.isInternal) {
              handleFileSelect(fileNode.path);
            }
          }}
          {...({
            // Use a spread with type assertion to add onNodeClick
            onNodeClick: (node: NodeApi<FileNode>) => {
              const fileNode = node.data as FileNode;
              if (!node.isInternal) {
                handleFileSelect(fileNode.path);
              }
            },
          } as any)}
        >
          {Node}
        </Tree>
      )}
    </div>
  );
};

export default FileTree;
