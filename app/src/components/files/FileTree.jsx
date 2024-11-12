import React, { useRef, useState, useLayoutEffect } from 'react';
import { Tree } from 'react-arborist';
import { IconFile, IconFolder, IconFolderOpen } from '@tabler/icons-react';
import { Tooltip } from '@mantine/core';
import useResizeObserver from '@react-hook/resize-observer';

const useSize = (target) => {
  const [size, setSize] = useState();

  useLayoutEffect(() => {
    setSize(target.current.getBoundingClientRect());
  }, [target]);

  useResizeObserver(target, (entry) => setSize(entry.contentRect));
  return size;
};

const FileIcon = ({ node }) => {
  if (node.isLeaf) {
    return <IconFile size={16} />;
  }
  return node.isOpen ? (
    <IconFolderOpen size={16} color="var(--mantine-color-yellow-filled)" />
  ) : (
    <IconFolder size={16} color="var(--mantine-color-yellow-filled)" />
  );
};

const Node = ({ node, style, dragHandle }) => {
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
        onClick={() => {
          if (node.isInternal) {
            node.toggle();
          } else {
            node.tree.props.onNodeClick(node);
          }
        }}
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
};

const FileTree = ({ files, handleFileSelect, showHiddenFiles }) => {
  const target = useRef(null);
  const size = useSize(target);

  files = files.filter((file) => {
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
          data={files}
          openByDefault={false}
          width={size.width}
          height={size.height}
          indent={24}
          rowHeight={28}
          onActivate={(node) => {
            if (!node.isInternal) {
              handleFileSelect(node.data.path);
            }
          }}
          onNodeClick={(node) => {
            if (!node.isInternal) {
              handleFileSelect(node.data.path);
            }
          }}
        >
          {Node}
        </Tree>
      )}
    </div>
  );
};

export default FileTree;
