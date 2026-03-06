import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { HomeOutlined, ReloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import WujieReact from 'wujie-react';
import styles from './GameViewer.module.less';

const GameViewer = () => {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const bouncyBallsUrl =
    import.meta.env.VITE_BOUNCY_BALLS_URL ||
    (import.meta.env.DEV ? 'http://localhost:3001/' : '/bouncy-balls/');

  // Map gameId to url
  const gameMap = {
    'bouncy-balls': bouncyBallsUrl
  };

  const gameUrl = gameMap[gameId];

  if (!gameUrl) {
    return (
      <div className={styles.notFound}>
        游戏不存在
        <Button type="primary" onClick={() => navigate('/')} className={styles.backButton}>返回大厅</Button>
      </div>
    );
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={`glass-panel ${styles.floatNav}`}>
        <Tooltip title="返回大厅">
          <Button 
            type="text" 
            shape="circle" 
            icon={<HomeOutlined className={styles.navIcon} />} 
            onClick={() => navigate('/')} 
          />
        </Tooltip>
        
        <div className={styles.divider} />
        
        <span className={styles.gameName}>
          {gameId === 'bouncy-balls' ? '生字跳跳乐' : gameId}
        </span>

        <div className={styles.divider} />

        <Tooltip title="刷新游戏">
          <Button 
            type="text" 
            shape="circle" 
            icon={<ReloadOutlined className={styles.navIcon} />} 
            onClick={() => window.location.reload()} 
          />
        </Tooltip>

        <Tooltip title={isFullscreen ? "退出全屏" : "全屏模式"}>
           <Button 
            type="text" 
            shape="circle" 
            icon={isFullscreen ? <FullscreenExitOutlined className={styles.navIcon} /> : <FullscreenOutlined className={styles.navIcon} />} 
            onClick={toggleFullscreen} 
          />
        </Tooltip>
      </div>

      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingCard}>
            <div className={styles.dotRow}>
              <div className={`${styles.dot} ${styles.dotRed}`} />
              <div className={`${styles.dot} ${styles.dotTeal}`} />
              <div className={`${styles.dot} ${styles.dotYellow}`} />
              <div className={`${styles.dot} ${styles.dotOrange}`} />
            </div>

            <div className={styles.loadingText}>
              Loading...
            </div>
          </div>
        </div>
      )}

      <div className={styles.gameContainer}>
        <WujieReact
          width="100%"
          height="100%"
          name={gameId}
          url={gameUrl}
          sync={true}
          alive={false}
          fetch={window.fetch}
          props={{
            token: localStorage.getItem('playerToken'),
            user: JSON.parse(localStorage.getItem('playerUser') || '{}'),
            closeLoading: () => setLoading(false),
          }}
 
        />
      </div>
    </div>
  );
};

export default GameViewer;
