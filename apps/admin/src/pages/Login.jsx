import React, { useState, useEffect } from 'react';
import { Form, Input, Card, message, Spin, Button } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
          await api.get('/verify');
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

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const hashedPassword = SHA256(values.password).toString();
      const response = await axios.post('/api/login', {
        ...values,
        password: hashedPassword
      });
      const { accessToken } = response.data;
      localStorage.setItem('adminToken', accessToken);
      message.success('登录成功');
      
      // 登录成功后跳转到首页
      navigate('/', { replace: true });
    } catch (error) {
      message.error(error.response?.data?.message || '登录失败，请检查用户名或密码');
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
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
        >
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
      </Card>
    </div>
  );
};

export default Login;
