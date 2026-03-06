import React, { useState, useEffect } from 'react';
import { Form, Input, Card, message, Spin, Button, Tabs } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import SHA256 from 'crypto-js/sha256';
import api from '../utils/api';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true); // 新增：授权检查状态
  const navigate = useNavigate();

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          await api.get('/admin/auth/verify');
          navigate('/', { replace: true });
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F9FAFC' }}>
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
      navigate('/', { replace: true });
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
      navigate('/', { replace: true });
    } catch (error) {
      message.error(error.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#F9FAFC'
    }}>
      <Card
        className="neo-card"
        style={{ width: 400, textAlign: 'center' }}
        bordered={false}
      >
        <h1 style={{ marginBottom: 30, color: '#4A4A68' }}>管理员登录</h1>
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
                    <Button type="primary" htmlType="submit" loading={loading} block style={{
                        background: 'linear-gradient(135deg, #9D84FF 0%, #FFB6E1 100%)',
                        border: 'none',
                        height: 48,
                        borderRadius: 18,
                        fontSize: 16,
                        fontWeight: 700
                    }}>
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
                    <Button type="primary" htmlType="submit" loading={loading} block style={{
                        background: 'linear-gradient(135deg, #9D84FF 0%, #FFB6E1 100%)',
                        border: 'none',
                        height: 48,
                        borderRadius: 18,
                        fontSize: 16,
                        fontWeight: 700
                    }}>
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
