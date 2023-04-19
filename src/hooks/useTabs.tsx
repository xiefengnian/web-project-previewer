import cx from 'classnames';
import { Skeleton } from 'antd';
import { useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import styles from './useTabs.less';

type TabType = {
  filename: string;
  fileKey: string;
};

export const useTabs = (initTabs: TabType[], initActiveTab: string) => {
  const [tmpTab, setTmpTab] = useState<TabType | undefined>();

  const [activeTab, setActiveTab] = useState<string | undefined>(initActiveTab);

  const [openedTabs, setOpenedTabs] = useState<TabType[]>(initTabs);

  const [loading, setLoading] = useState(true);

  const doneLoad = () => {
    setLoading(false);
  };

  const openTab = (filename: string, fileKey: string) => {
    if (openedTabs.find((tab) => tab.fileKey === fileKey)) {
      setActiveTab(fileKey);
      return;
    }
    if (tmpTab && tmpTab.fileKey === fileKey) {
      tmpTab2OpenedTab();
      return;
    }
    setOpenedTabs([...openedTabs, { filename, fileKey }]);
    setActiveTab(fileKey);
  };

  const removeTab = (fileKey: string) => {
    if (fileKey === tmpTab?.fileKey) {
      setTmpTab(undefined);
      setActiveTab(openedTabs[0]?.fileKey);
    } else {
      const nextState = openedTabs
        .filter((tab) => tab.fileKey !== fileKey)
        .slice();
      if (nextState.length === 0 && tmpTab) {
        setActiveTab(tmpTab.fileKey);
      } else {
        setActiveTab(nextState[0]?.fileKey);
      }
      setOpenedTabs(nextState);
    }
  };

  const tmpTab2OpenedTab = () => {
    if (tmpTab) {
      const key = tmpTab.fileKey;
      setOpenedTabs([...openedTabs, tmpTab]);
      setTmpTab(undefined);
      setActiveTab(key);
    }
  };

  const openTmpTab = (filename: string, fileKey: string) => {
    if (openedTabs.find((tab) => tab.fileKey === fileKey)) {
      setActiveTab(fileKey);
      return;
    }
    setTmpTab({ filename, fileKey });
    setActiveTab(fileKey);
  };

  const tabs = (
    <div className={styles.tab_container}>
      {loading ? (
        <Skeleton></Skeleton>
      ) : (
        <>
          {openedTabs.map((tab) => (
            <div
              className={cx(styles.tab, {
                [styles.unused_tab]: tab.fileKey !== activeTab,
              })}
              key={tab.fileKey}
              onClick={() => {
                setActiveTab(tab.fileKey);
              }}
            >
              {tab.filename}
              <CloseOutlined
                className={styles.tab_close_icon}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.fileKey);
                }}
              />
            </div>
          ))}
          {tmpTab && (
            <div
              onClick={() => {
                setActiveTab(tmpTab.fileKey);
              }}
              onDoubleClick={() => {
                tmpTab2OpenedTab();
              }}
              className={cx(styles.tab, styles.tmp_tab, {
                [styles.unused_tab]: tmpTab.fileKey !== activeTab,
              })}
            >
              {tmpTab.filename}
              <CloseOutlined
                className={styles.tab_close_icon}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tmpTab.fileKey);
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  return {
    tabs,
    activeTab,
    openTab,
    openTmpTab,
    openedTabs,
    doneLoad,
  };
};
