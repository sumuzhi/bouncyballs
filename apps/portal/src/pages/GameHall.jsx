import React from 'react';
import { Typography, Avatar, Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const GameHall = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('playerUser') || '{}');

  const handleLogout = async () => {
    await fetch('/api/portal/auth/logout', { method: 'POST' }).catch(() => null);
    localStorage.removeItem('playerToken');
    localStorage.removeItem('playerUser');
    navigate('/login');
  };

  const games = [
    {
      id: 'bouncy-balls',
      title: '生字跳跳乐',
      description: '大声朗读，让汉字跳起来！',
      color: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)',
      icon: '🏀',
      path: '/game/bouncy-balls'
    },
    // Future games can be added here
  ];

  const userMenu = {
    items: [
      {
        key: 'logout',
        label: '退出登录',
        icon: <LogoutOutlined />,
        onClick: handleLogout,
        danger: true
      }
    ]
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '40px', 
      display: 'flex', 
      flexDirection: 'column',
      boxSizing: 'border-box'
    }}>
      {/* Top Bar */}
      <div className="glass-panel" style={{ 
        padding: '12px 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '60px',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AppstoreOutlined style={{ fontSize: '24px', color: '#333' }} />
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#333' }}>Game Center</Title>
        </div>
        
        <Dropdown menu={userMenu} placement="bottomRight">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <Text strong style={{ color: '#333' }}>{user.username}</Text>
            <Avatar style={{ backgroundColor: '#007AFF' }} icon={<UserOutlined />} />
          </div>
        </Dropdown>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start',
        paddingTop: '40px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '40px',
          width: '100%',
          maxWidth: '1200px'
        }}>
          {games.map(game => (
            <div 
              key={game.id}
              className="glass-panel"
              style={{ 
                height: '320px',
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                overflow: 'hidden',
                border: 'none', // Override glass-panel border for cleaner look
                background: 'rgba(255, 255, 255, 0.4)'
              }}
              onClick={() => navigate(game.path)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.15)';
              }}
            >
              {/* App Icon / Cover */}
              <div style={{ 
                flex: 2, 
                background: game.color,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '80px',
                position: 'relative'
              }}>
                <div style={{ zIndex: 1 }}>{game.icon}</div>
                {/* Shine effect */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '40%',
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)'
                }} />
              </div>

              {/* Info */}
              <div style={{ 
                flex: 1, 
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(20px)'
              }}>
                <Title level={4} style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{game.title}</Title>
                <Text type="secondary" style={{ fontSize: '14px', lineHeight: '1.4', display: 'block' }}>
                  {game.description}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameHall;
