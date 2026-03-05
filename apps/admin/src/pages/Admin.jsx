import React, { useState, useEffect } from 'react';
import { Layout, Form, Input, Button, List, Typography, Pagination, message, Modal, Spin } from 'antd';
import { LogoutOutlined, DeleteOutlined, RobotOutlined, SaveOutlined, EditOutlined, SoundOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Admin = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true); // 新增：授权检查状态
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState(null); // Track editing state
 const [isModalOpen, setIsModalOpen] = useState(false); // Edit Modal visibility
  const [currentAudio, setCurrentAudio] = useState(null); // Current audio data (base64)
  const [currentStroke, setCurrentStroke] = useState(null); // Current stroke data (base64)

  useEffect(() => {
    fetchData(1);
  }, []);

  const fetchData = async (currentPage = 1) => {
    setLoading(true);
    try {
      const response = await api.get(`/characters?page=${currentPage}&limit=${pageSize}`);
      setData(response.data.data);
      setTotal(response.data.meta.total);
      setPage(response.data.meta.page);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '你确定要删除这个汉字吗？',
      onOk: async () => {
        try {
          await api.delete(`/characters/${id}`);
          message.success('删除成功');
          fetchData(page);
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const [previewStroke, setPreviewStroke] = useState(null); // Stroke preview

  const playAudio = (audioBase64) => {
    if (!audioBase64) return;
    const audio = new Audio(audioBase64);
    audio.play().catch(e => message.error('播放失败'));
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setCurrentAudio(item.audio);
    setCurrentStroke(item.stroke);
    form.setFieldsValue({
      char: item.char,
      pinyin: item.pinyin,
      examples: item.examples.join(', '),
    });
    setIsModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCurrentAudio(null);
    setCurrentStroke(null);
    form.resetFields();
    setIsModalOpen(false);
  };

  const handleAdd = () => {
    setEditingId(null);
    setCurrentAudio(null);
    setCurrentStroke(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleAiGenerate = async () => {
    const char = form.getFieldValue('char');
    if (!char) {
      message.warning('请先输入汉字');
      return;
    }
    setAiLoading(true);
    try {
      const response = await api.get(`/ai-generate?char=${encodeURIComponent(char)}`);
      form.setFieldsValue({
        pinyin: response.data.pinyin,
        examples: response.data.examples.join(', '),
      });
      
      let msg = 'AI 生成成功';
      if (response.data.audio) {
          setCurrentAudio(response.data.audio);
          msg += ' (含读音)';
      }
      if (response.data.stroke) {
          setCurrentStroke(response.data.stroke);
          msg += ' (含笔画)';
      }
      message.success(msg);
      
    } catch (error) {
      message.error(error.response?.data?.message || 'AI 生成失败');
    } finally {
      setAiLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    const payload = {
      ...values,
      examples: values.examples ? values.examples.split(/[,，]\s*/).filter(ex => ex.trim() !== '') : [],
      audio: currentAudio,
      stroke: currentStroke
    };

    try {
      if (editingId) {
        // Update
        await api.put(`/characters/${editingId}`, payload);
        message.success('更新成功');
        setIsModalOpen(false);
        setEditingId(null);
        setCurrentAudio(null);
        setCurrentStroke(null);
        form.resetFields(); // Reset form after modal close
        fetchData(page); // Refresh current page
      } else {
        // Create
        await api.post('/characters', payload);
        message.success(`成功添加: ${values.char}`);
        form.resetFields();
        setCurrentAudio(null);
        setCurrentStroke(null);
        fetchData(1); // Go to first page
      }
    } catch (error) {
      message.error(error.response?.data?.message || (editingId ? '更新失败' : '添加失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#F9FAFC' }}>
      <Header style={{ background: '#fff', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Title level={3} style={{ margin: 0, color: '#4A4A68' }}>汉字录入 ✨</Title>
        <div style={{ display: 'flex', gap: 10 }}>
            <Button 
                type="primary" 
                icon={<RobotOutlined />} 
                onClick={handleAdd}
                style={{ background: 'linear-gradient(135deg, #9D84FF 0%, #FFB6E1 100%)', border: 'none', fontWeight: 700 }}
            >
                添加汉字
            </Button>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出登录</Button>
        </div>
      </Header>
      <Content style={{ padding: '20px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2 className="list-header">已录入汉字</h2>
        
        <div className="neo-card" style={{ padding: 0, overflow: 'hidden' }}>
          <List
            loading={loading}
            itemLayout="horizontal"
            dataSource={data}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(item)}>编辑</Button>,
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item._id)}>删除</Button>
                ]}
                style={{ padding: '20px', borderBottom: '1px solid #F0F0F5' }}
              >
                <List.Item.Meta
                  title={
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#4A4A68', display: 'flex', alignItems: 'center' }}>
                      {item.char}
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#9D84FF', background: '#F0EDFF', padding: '2px 8px', borderRadius: 10, marginLeft: 10 }}>
                        {item.pinyin}
                      </span>
                      {item.audio && (
                        <Button 
                            type="text" 
                            icon={<SoundOutlined />} 
                            style={{ color: '#9D84FF', marginLeft: 5 }}
                            onClick={() => playAudio(item.audio)}
                        />
                      )}
                      {item.stroke && (
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            style={{ color: '#FFB6E1', marginLeft: 5 }}
                            onClick={() => setPreviewStroke(item.stroke)}
                        />
                      )}
                    </span>
                  }
                  description={<span style={{ color: '#9FA0C3' }}>{item.examples.join(', ')}</span>}
                />
              </List.Item>
            )}
          />
          {total > 0 && (
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
              <Pagination
                current={page}
                total={total}
                pageSize={pageSize}
                onChange={(p) => fetchData(p)}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>

        <Modal
            open={!!previewStroke}
            footer={null}
            onCancel={() => setPreviewStroke(null)}
            title="笔画演示"
            destroyOnClose
        >
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                {previewStroke && <img src={previewStroke} alt="笔画" style={{ maxWidth: '100%', maxHeight: 300 }} />}
            </div>
        </Modal>

        <Modal
            title={editingId ? "编辑汉字" : "添加汉字"}
            open={isModalOpen}
            onCancel={handleCancelEdit}
            footer={null}
            destroyOnClose
        >
            <Form form={form} layout="vertical" onFinish={onFinish} size="large">
                <Form.Item name="char" label="汉字" rules={[{ required: true, message: '请输入汉字' }]}>
                    <Input placeholder="输入单个汉字" disabled={!!editingId} style={{ background: editingId ? '#EFEFEF' : '#F4F6FA', border: 'none' }} />
                </Form.Item>
                <Form.Item name="pinyin" label="拼音">
                    <Input placeholder="可选 (AI生成)" style={{ background: '#F4F6FA', border: 'none' }} />
                </Form.Item>
                <Form.Item name="examples" label="组词">
                    <Input placeholder="可选 (AI生成)" style={{ background: '#F4F6FA', border: 'none' }} />
                </Form.Item>
                
                <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                     <Button 
                         icon={<RobotOutlined />} 
                         onClick={handleAiGenerate} 
                         loading={aiLoading}
                         style={{ flex: 1, background: '#A0EACD', color: '#366A55', border: 'none', height: 48, fontWeight: 700 }}
                     >
                         AI 自动生成
                     </Button>
                     <Button 
                         type="primary" 
                         htmlType="submit" 
                         icon={<SaveOutlined />} 
                         loading={loading}
                         style={{ flex: 1, background: 'linear-gradient(135deg, #9D84FF 0%, #FFB6E1 100%)', border: 'none', height: 48, fontWeight: 700 }}
                     >
                         {editingId ? '保存修改' : '保存汉字'}
                     </Button>
                 </div>
                 {currentAudio && (
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', background: '#F0EDFF', padding: '10px', borderRadius: 12 }}>
                        <SoundOutlined style={{ color: '#9D84FF', marginRight: 10, fontSize: 18 }} />
                        <span style={{ marginRight: 10, color: '#4A4A68', fontSize: 14 }}>已获取发音</span>
                        <Button size="small" type="primary" ghost onClick={() => playAudio(currentAudio)}>试听</Button>
                    </div>
                 )}
                 {currentStroke && (
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', background: '#FFF0F5', padding: '10px', borderRadius: 12 }}>
                        <EyeOutlined style={{ color: '#FF69B4', marginRight: 10, fontSize: 18 }} />
                        <span style={{ marginRight: 10, color: '#4A4A68', fontSize: 14 }}>已获取笔画</span>
                        <Button size="small" type="primary" ghost onClick={() => setPreviewStroke(currentStroke)}>查看</Button>
                    </div>
                 )}
             </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default Admin;
