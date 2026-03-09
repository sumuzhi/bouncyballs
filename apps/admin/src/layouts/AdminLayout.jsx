import {
  AppstoreOutlined,
  BookOutlined,
  BulbOutlined,
  LogoutOutlined,
  MoonOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import { Button, Menu } from 'antd';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { applyTheme, getStoredTheme, THEME_DARK, THEME_LIGHT } from '../utils/theme';
import styles from './AdminLayout.module.less';

const menuItems = [
  {
    key: '/characters',
    icon: <AppstoreOutlined />,
    label: '汉字管理',
  },
  {
    key: '/words',
    icon: <BookOutlined />,
    label: '单词题库',
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => getStoredTheme());
  const selectedKey = location.pathname.startsWith('/words') ? '/words' : '/characters';

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === THEME_LIGHT ? THEME_DARK : THEME_LIGHT));
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <RadarChartOutlined />
          </span>
          <span className={styles.brandText}>Neon Admin</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className={styles.menu}
        />
      </aside>
      <main className={styles.main}>
        <div className={styles.topbar}>
          <span className={styles.title}>内容管理</span>
          <div className={styles.actions}>
            <Button
              icon={theme === THEME_LIGHT ? <MoonOutlined /> : <BulbOutlined />}
              className={styles.themeSwitch}
              onClick={toggleTheme}
            >
              {theme === THEME_LIGHT ? '暗色' : '亮色'}
            </Button>
            <Button
              icon={<LogoutOutlined />}
              className={styles.logout}
              onClick={handleLogout}
            >
              退出登录
            </Button>
          </div>
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
