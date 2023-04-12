import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';

const getLanguage = (ext: string) => {
  console.log({ ext });
  switch (ext) {
    case 'js':
      return 'javascript';
    case 'json':
      return 'json';
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
    }));
    instance.onDidChangeModelContent((e) => {
      console.log(e);
    });
  };

  return {
    setModel,
    init,
  };
};
