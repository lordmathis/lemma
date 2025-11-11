import React from 'react';
import { Text, Center } from '@mantine/core';
import Editor from './Editor';
import MarkdownPreview from './MarkdownPreview';
import { getFileUrl, isImageFile } from '../../utils/fileHelpers';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { FileNode } from '../../types/models';

type ViewTab = 'source' | 'preview';

interface ContentViewProps {
  activeTab: ViewTab;
  selectedFile: string | null;
  content: string;
  handleContentChange: (content: string) => void;
  handleSave: (filePath: string, content: string) => Promise<boolean>;
  handleFileSelect: (filePath: string | null) => Promise<void>;
  files: FileNode[];
}

const ContentView: React.FC<ContentViewProps> = ({
  activeTab,
  selectedFile,
  content,
  handleContentChange,
  handleSave,
  handleFileSelect,
  files,
}) => {
  const { currentWorkspace } = useWorkspace();
  if (!currentWorkspace) {
    return (
      <Center style={{ height: '100%' }}>
        <Text size="xl" fw={500}>
          No workspace selected.
        </Text>
      </Center>
    );
  }

  if (!selectedFile) {
    return (
      <Center style={{ height: '100%' }}>
        <Text size="xl" fw={500}>
          No file selected.
        </Text>
      </Center>
    );
  }

  if (isImageFile(selectedFile)) {
    return (
      <Center className="image-preview">
        <img
          src={getFileUrl(currentWorkspace.name, selectedFile)}
          alt={selectedFile}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      </Center>
    );
  }

  return activeTab === 'source' ? (
    <Editor
      content={content}
      handleContentChange={handleContentChange}
      handleSave={handleSave}
      selectedFile={selectedFile}
      files={files}
    />
  ) : (
    <MarkdownPreview content={content} handleFileSelect={handleFileSelect} />
  );
};

export default ContentView;
