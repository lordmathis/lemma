import React from 'react';
import { Text, Center } from '@mantine/core';
import Editor from './Editor';
import MarkdownPreview from './MarkdownPreview';
import { getFileUrl } from '../../services/api';
import { isImageFile } from '../../utils/fileHelpers';

const ContentView = ({
  activeTab,
  selectedFile,
  content,
  handleContentChange,
  handleSave,
  handleFileSelect,
}) => {
  if (!selectedFile) {
    return (
      <Center style={{ height: '100%' }}>
        <Text size="xl" weight={500}>
          No file selected.
        </Text>
      </Center>
    );
  }

  if (isImageFile(selectedFile)) {
    return (
      <Center className="image-preview">
        <img
          src={getFileUrl(selectedFile)}
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
    />
  ) : (
    <MarkdownPreview content={content} handleFileSelect={handleFileSelect} />
  );
};

export default ContentView;
