import React, { useState, useEffect } from 'react';
import { Form, Input, Card, message, Spin, Button, Tabs } from 'antd';
import {
  BulbOutlined,
  LockOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import SHA256 from 'crypto-js/sha256';
import api from '../utils/api';
import { THEME_LIGHT } from '../utils/theme';
import { useTheme } from '../components/ThemeProvider';
import styles from './Login.module.less';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true); // 新增：授权检查状态
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          await api.get('/admin/auth/verify');
          navigate('/characters', { replace: true });
          return;
        } catch (error) {
          localStorage.removeItem('adminToken');
        }
      }
      setIsAuthChecking(false);
    };
    
    checkToken();
  }, [navigate]);

  if (isAuthChecking) {
    return (
      <div className={styles.pageCenter}>
        <Spin size="large" />
      </div>
    );
  }



  const onLogin = async (values) => {
    setLoading(true);
    try {
      const hashedPassword = SHA256(values.password).toString();
      const response = await api.post('/admin/auth/login', {
        ...values,
        password: hashedPassword,
      });
      const { token, user } = response.data;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      message.success('登录成功');
      navigate('/characters', { replace: true });
    } catch (error) {
      message.error(error.response?.data?.message || '登录失败，请检查用户名或密码');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values) => {
    setLoading(true);
    try {
      const hashedPassword = SHA256(values.password).toString();
      const response = await api.post('/admin/auth/register', {
        ...values,
        password: hashedPassword,
      });
      const { token, user } = response.data;
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      message.success('注册成功');
      navigate('/characters', { replace: true });
    } catch (error) {
      message.error(error.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageCenter}>
      <Card
        className={`${styles.authCard} neo-card`}
        bordered={false}
      >
        <div className={styles.tools}>
          <Button
            size="small"
            className={styles.themeSwitch}
            icon={theme === THEME_LIGHT ? <MoonOutlined /> : <BulbOutlined />}
            onClick={toggleTheme}
          >
            {theme === THEME_LIGHT ? '暗色' : '亮色'}
          </Button>
        </div>
        <div className={styles.head}>
          <span className={styles.headIcon}>
            <SafetyCertificateOutlined />
          </span>
          <h1 className={styles.title}>Admin 中控台</h1>
        </div>
        <p className={styles.subtitle}>专业化权限入口，支持汉字与单词双题库管理</p>
        <Tabs
          centered
          defaultActiveKey="login"
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form name="login" onFinish={onLogin} size="large">
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: '请输入用户名!' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: '请输入密码!' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block className={styles.primaryBtn}>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form name="register" onFinish={onRegister} size="large">
                  <Form.Item
                    name="username"
                    rules={[
                      { required: true, message: '请输入用户名!' },
                      { min: 3, message: '用户名至少3个字符' },
                    ]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: '请输入密码!' },
                      { min: 6, message: '密码至少6个字符' },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block className={styles.primaryBtn}>
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Login;
