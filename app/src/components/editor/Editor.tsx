import React, { useEffect, useRef, useMemo } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion } from '@codemirror/autocomplete';
import { useWorkspace } from '../../hooks/useWorkspace';
import { createWikiLinkCompletions } from '../../utils/wikiLinkCompletion';
import { flattenFileTree } from '../../utils/fileHelpers';
import type { FileNode } from '../../types/models';

interface EditorProps {
  content: string;
  handleContentChange: (content: string) => void;
  handleSave: (filePath: string, content: string) => Promise<boolean>;
  selectedFile: string;
  files: FileNode[];
}

const Editor: React.FC<EditorProps> = ({
  content,
  handleContentChange,
  handleSave,
  selectedFile,
  files,
}) => {
  const { colorScheme, currentWorkspace } = useWorkspace();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Flatten file tree for autocompletion, respecting showHiddenFiles setting
  const showHiddenFiles = currentWorkspace?.showHiddenFiles || false;
  const flatFiles = useMemo(
    () => flattenFileTree(files, showHiddenFiles),
    [files, showHiddenFiles]
  );

  useEffect(() => {
    const handleEditorSave = (view: EditorView): boolean => {
      void handleSave(selectedFile, view.state.doc.toString());
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
        backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5',
        color: colorScheme === 'dark' ? '#858585' : '#999',
        border: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: colorScheme === 'dark' ? '#2c313a' : '#e8e8e8',
      },
    });

    if (!editorRef.current) return;

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
            run: handleEditorSave,
            preventDefault: true,
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleContentChange(update.state.doc.toString());
          }
        }),
        theme,
        colorScheme === 'dark' ? oneDark : [],
        autocompletion({
          override: [createWikiLinkCompletions(flatFiles)],
          activateOnTyping: true,
          maxRenderedOptions: 10,
          closeOnBlur: true,
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // TODO: Refactor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorScheme, handleContentChange, handleSave, selectedFile, flatFiles]);

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
