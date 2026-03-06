import React from 'react';
import { Typography, Avatar, Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './GameHall.module.less';

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
      coverClassName: styles.bouncyBallsCover,
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
    <div className={styles.page}>
      <div className={`glass-panel ${styles.topBar}`}>
        <div className={styles.brand}>
          <AppstoreOutlined className={styles.brandIcon} />
          <Title level={4} className={styles.brandTitle}>Game Center</Title>
        </div>
        
        <Dropdown menu={userMenu} placement="bottomRight">
          <div className={styles.userArea}>
            <Text strong className={styles.userName}>{user.username}</Text>
            <Avatar className={styles.userAvatar} icon={<UserOutlined />} />
          </div>
        </Dropdown>
      </div>

      <div className={styles.main}>
        <div className={styles.gameGrid}>
          {games.map(game => (
            <div 
              key={game.id}
              className={`glass-panel ${styles.gameCard}`}
              onClick={() => navigate(game.path)}
            >
              <div className={`${styles.gameCover} ${game.coverClassName}`}>
                <div className={styles.gameIcon}>{game.icon}</div>
                <div className={styles.coverShine} />
              </div>

              <div className={styles.gameInfo}>
                <Title level={4} className={styles.gameTitle}>{game.title}</Title>
                <Text type="secondary" className={styles.gameDescription}>
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
