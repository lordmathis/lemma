import React, { useRef, useState, useLayoutEffect, useCallback } from 'react';
import { Tree, type NodeApi } from 'react-arborist';
import {
  IconFile,
  IconFolder,
  IconFolderOpen,
  IconUpload,
} from '@tabler/icons-react';
import { Tooltip, Text, Box } from '@mantine/core';
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
  onFileMove?: (
    dragIds: string[],
    parentId: string | null,
    index: number
  ) => Promise<void>;
  onFileUpload?: (files: FileList, targetPath?: string) => Promise<void>;
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

// Enhanced Node component with drag handle
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
        ref={dragHandle} // This enables dragging for the node
        style={{
          ...style,
          paddingLeft: `${node.level * 20}px`,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          // Add visual feedback when being dragged
          opacity: node.state?.isDragging ? 0.5 : 1,
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
  onFileMove,
  onFileUpload,
}) => {
  const target = useRef<HTMLDivElement>(null);
  const size = useSize(target);

  // State for drag and drop overlay
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Handle file movement within the tree
  const handleMove = useCallback(
    async ({
      dragIds,
      parentId,
      index,
    }: {
      dragIds: string[];
      parentId: string | null;
      index: number;
    }) => {
      if (onFileMove) {
        await onFileMove(dragIds, parentId, index);
      }
    },
    [onFileMove]
  );

  // External file drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if drag contains files (not internal tree nodes)
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only hide overlay when leaving the container itself
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Set the drop effect to indicate this is a valid drop target
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragOver(false);

      const { files } = e.dataTransfer;
      if (files && files.length > 0 && onFileUpload) {
        // Handle the upload without awaiting to avoid the eslint warning
        onFileUpload(files).catch((error) => {
          console.error('Error uploading files:', error);
        });
      }
    },
    [onFileUpload]
  );

  return (
    <div
      ref={target}
      style={{
        height: 'calc(100vh - 140px)',
        marginTop: '20px',
        position: 'relative',
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            border: '2px dashed var(--mantine-color-blue-6)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <IconUpload size={48} color="var(--mantine-color-blue-6)" />
          <Text size="lg" fw={500} c="blue" mt="md">
            Drop files here to upload
          </Text>
        </Box>
      )}

      {size && (
        <Tree
          data={filteredFiles}
          openByDefault={false}
          width={size.width}
          height={size.height}
          indent={24}
          rowHeight={28}
          onMove={handleMove}
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
