import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';

const getLanguage = (ext: string) => {
  switch (ext) {
    case 'js':
      return 'javascript';
    case 'json':
      return 'json';
    case 'less':
      return 'less';
    case 'ts':
    case 'tsx':
      return 'typescript';
    default:
      return 'plaintext';
  }
};

export const useMonacoEditor = () => {
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor>();

  useEffect(() => {
    return () => {
      editorInstance.current?.dispose();
    };
  }, []);

  const setModel = (fileContent: string, filename: string) => {
    editorInstance.current?.setModel(
      monaco.editor.createModel(
        fileContent,
        getLanguage(filename.split('.').pop() || 'txt')
      )
    );
  };

  const init = (dom: HTMLElement) => {
    const instance = (editorInstance.current = monaco.editor.create(dom, {
      model: null,
      theme: 'vs-dark',
    }));
    instance.onDidChangeModelContent((e) => {
      console.log(e);
    });
    instance.onDidFocusEditorText((e) => {
      console.log('focus', e);
    });
  };

  return {
    setModel,
    init,
  };
};
