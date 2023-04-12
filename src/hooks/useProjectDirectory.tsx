import { useRef, useState, useEffect } from 'react';
import { DirectoryNode, FileNode, FileSystemTree } from '@webcontainer/api';
import type { DataNode } from 'antd/es/tree';
import { Tree, Skeleton } from 'antd';
import { useUpdate } from './useUpdate';
import * as _ from 'lodash';

const Loading = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Skeleton active style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export const useProjectDirectory = () => {
  const [files, setFiles] = useState<FileSystemTree | undefined>();
  const [treeData, setTreeData] = useState<DataNode[]>([]);

  const fileContent = useRef<string>('');
  const filePath = useRef<string[]>([]);

  const update = useUpdate();

  const transformData = (projectFiles: FileSystemTree): DataNode[] => {
    const isDir = (item: DirectoryNode | FileNode) => {
      return Object.hasOwn(item, 'directory');
    };

    const result: DataNode[] = [];

    const traverse = (
      dir: DirectoryNode,
      res: DataNode[],
      prevPath: string
    ) => {
      Object.keys(dir).forEach((path) => {
        const key = `${prevPath}/${path}`;

        if (
          isDir(
            // @ts-ignore
            dir[path]
          )
        ) {
          const node: DataNode = {
            title: path,
            key,
            children: [],
          };
          res.push(node);
          traverse(
            // @ts-ignore
            dir[path]['directory'] as unknown as DirectoryNode,
            node.children as DataNode[],
            prevPath + '/' + path
          );
        } else {
          const node: DataNode = {
            title: path,
            key,
            isLeaf: true,
            // @ts-ignore
            filePath: key.split('/').slice(1).join('/directory/').split('/'), // 主要是方便 lodash.get 获取
          };
          res.push(node);
        }
      });
    };

    traverse(projectFiles as unknown as DirectoryNode, result, '');

    return result;
  };

  useEffect(() => {
    if (files) {
      setTreeData(transformData(files));
    }
  }, [files]);

  const load = (files: FileSystemTree) => {
    setFiles(files);
  };

  console.log(treeData);

  const directory = files ? (
    <Tree.DirectoryTree
      defaultExpandedKeys={['/app']}
      treeData={treeData}
      multiple={false}
      onSelect={(e, info) => {
        if (!info.node.isLeaf) return;
        fileContent.current = _.get(
          files,
          // @ts-ignore
          info.node.filePath.concat(['file', 'contents'])
        ) as unknown as string;
        // @ts-ignore
        filePath.current = info.node.filePath;
        update();
      }}
    />
  ) : (
    <Loading />
  );

  return {
    directory,
    load,
    fileContent,
    filePath,
  };
};
