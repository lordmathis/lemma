import React from 'react';

const FileTree = ({ files }) => {
  return (
    <div className="file-tree">
      <h3>Files</h3>
      <ul>
        {files.map((file, index) => (
          <li key={index}>{file}</li>
        ))}
      </ul>
    </div>
  );
};

export default FileTree;