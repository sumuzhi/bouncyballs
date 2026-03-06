import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { HomeOutlined, ReloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import WujieReact from 'wujie-react';

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
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        color: 'white',
        fontSize: '24px' 
      }}>
        游戏不存在
        <Button type="primary" onClick={() => navigate('/')} style={{ marginLeft: 20 }}>返回大厅</Button>
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
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
      
      {/* Floating Navigation Island */}
      <div className="glass-panel" style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000, // Ensure it's above everything
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderRadius: '50px', // Pill shape
        background: 'rgba(255, 255, 255, 0.15)', // More transparent
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        transition: 'opacity 0.3s ease',
        opacity: 0.8
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
      onMouseLeave={(e) => e.currentTarget.style.opacity = 0.8}
      >
        <Tooltip title="返回大厅">
          <Button 
            type="text" 
            shape="circle" 
            icon={<HomeOutlined style={{ color: '#fff', fontSize: '18px' }} />} 
            onClick={() => navigate('/')} 
          />
        </Tooltip>
        
        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.3)' }} />
        
        <span style={{ color: '#fff', fontWeight: 500, fontSize: '14px', padding: '0 8px', userSelect: 'none' }}>
          {gameId === 'bouncy-balls' ? '生字跳跳乐' : gameId}
        </span>

        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.3)' }} />

        <Tooltip title="刷新游戏">
          <Button 
            type="text" 
            shape="circle" 
            icon={<ReloadOutlined style={{ color: '#fff', fontSize: '18px' }} />} 
            onClick={() => window.location.reload()} 
          />
        </Tooltip>

        <Tooltip title={isFullscreen ? "退出全屏" : "全屏模式"}>
           <Button 
            type="text" 
            shape="circle" 
            icon={isFullscreen ? <FullscreenExitOutlined style={{ color: '#fff', fontSize: '18px' }} /> : <FullscreenOutlined style={{ color: '#fff', fontSize: '18px' }} />} 
            onClick={toggleFullscreen} 
          />
        </Tooltip>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
          // Dopamine Gradient Background: Vibrant and energetic
          background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 50%, #A18CD1 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientBG 10s ease infinite',
          transition: 'all 0.5s ease',
        }}>
          {/* White Card with strong shadow and pop style */}
          <div style={{
            padding: '50px 80px',
            borderRadius: '40px',
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 12px rgba(255,255,255,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '30px',
            transform: 'translateY(0)',
            animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            
            {/* Dopamine Bouncing Balls */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="dopamine-dot" style={{ background: '#FF6B6B', animationDelay: '0s' }} />
              <div className="dopamine-dot" style={{ background: '#4ECDC4', animationDelay: '0.1s' }} />
              <div className="dopamine-dot" style={{ background: '#FFE66D', animationDelay: '0.2s' }} />
              <div className="dopamine-dot" style={{ background: '#FF9F43', animationDelay: '0.3s' }} />
            </div>

            <div style={{ 
              background: 'linear-gradient(90deg, #FF6B6B, #4ECDC4, #FF9F43)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'var(--font-family-system)',
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Loading...
            </div>
          </div>

          <style>{`
            .dopamine-dot {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              animation: dopamineBounce 0.6s infinite alternate cubic-bezier(0.5, 0.05, 1, 0.5);
            }
            @keyframes dopamineBounce {
              from { transform: translateY(0) scale(1); }
              to { transform: translateY(-30px) scale(1.1); }
            }
            @keyframes gradientBG {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes popIn {
              from { opacity: 0; transform: scale(0.8) translateY(20px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* Game Container */}
      <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
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
