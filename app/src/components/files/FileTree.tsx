import React, { useRef, useState, useLayoutEffect } from 'react';
import { Tree, type NodeApi } from 'react-arborist';
import { IconFile, IconFolder, IconFolderOpen } from '@tabler/icons-react';
import { Tooltip } from '@mantine/core';
import useResizeObserver from '@react-hook/resize-observer';
import type { FileNode } from '@/types/models';

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
function Node({
  node,
  style,
  dragHandle,
  onNodeClick,
  ...rest
}: {
  node: NodeApi<FileNode>;
  style: React.CSSProperties;
  dragHandle?: React.Ref<HTMLDivElement>;
  onNodeClick?: (node: NodeApi<FileNode>) => void;
  // Accept any extra props from Arborist, but do not use an index signature
} & Record<string, unknown>) {
  const handleClick = () => {
    if (node.isInternal) {
      node.toggle();
    } else if (typeof onNodeClick === 'function') {
      onNodeClick(node);
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
        {...rest}
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

  // Handler for node click
  const onNodeClick = (node: NodeApi<FileNode>) => {
    const fileNode = node.data;
    if (!node.isInternal) {
      void handleFileSelect(fileNode.path);
    }
  };

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
            const fileNode = node.data;
            if (!node.isInternal) {
              void handleFileSelect(fileNode.path);
            }
          }}
        >
          {(props) => <Node {...props} onNodeClick={onNodeClick} />}
        </Tree>
      )}
    </div>
  );
};

export default FileTree;
