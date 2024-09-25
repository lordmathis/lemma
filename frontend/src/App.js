import React, { useState } from 'react';
import Editor from './components/Editor';
import FileTree from './components/FileTree';
import './App.scss';

function App() {
  const [content, setContent] = useState('# Welcome to NovaMD\n\nStart editing here!');
  const [files, setFiles] = useState(['README.md', 'chapter1.md', 'chapter2.md']);

  return (
    <div className="App">
      <div className="sidebar">
        <FileTree files={files} />
      </div>
      <div className="main-content">
        <h1>NovaMD</h1>
        <Editor content={content} onChange={setContent} />
      </div>
    </div>
  );
}

export default App;
