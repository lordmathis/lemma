import React, { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';

const Editor = ({ content, onChange, onSave, filePath, themeType }) => {
  const editorRef = useRef();
  const viewRef = useRef();

  useEffect(() => {
    const handleSave = (view) => {
      onSave(filePath, view.state.doc.toString());
      return true;
    };

    const theme = EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '14px',
      },
      '.cm-scroller': {
        overflow: 'auto',
      },
      '.cm-gutters': {
        backgroundColor: themeType === 'dark' ? '#1e1e1e' : '#f5f5f5',
        color: themeType === 'dark' ? '#858585' : '#999',
        border: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: themeType === 'dark' ? '#2c313a' : '#e8e8e8',
      },
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        EditorView.lineWrapping,
        keymap.of(defaultKeymap),
        keymap.of([
          {
            key: 'Ctrl-s',
            run: handleSave,
            preventDefault: true,
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        theme,
        themeType === 'dark' ? oneDark : [],
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [filePath, themeType]);

  useEffect(() => {
    if (viewRef.current && content !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: content,
        },
      });
    }
  }, [content]);

  return <div ref={editorRef} className="editor-container" />;
};

export default Editor;
