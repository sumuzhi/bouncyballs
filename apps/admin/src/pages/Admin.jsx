import React, { useState, useCallback } from 'react';
import { Layout, Button, Typography, Pagination, Radio } from 'antd';
import { LogoutOutlined, RobotOutlined, AppstoreOutlined, BarsOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useCharacters from '../hooks/useCharacters';
import useAudioPlayer from '../hooks/useAudioPlayer';
import CharacterList from '../components/admin/CharacterList';
import CharacterModal from '../components/admin/CharacterModal';
import StrokeModal from '../components/admin/StrokeModal';

const { Header, Content } = Layout;
const { Title } = Typography;

const Admin = () => {
  const { 
    data, 
    loading, 
    pagination, 
    fetchData, 
    handleDelete 
  } = useCharacters();
  
  const { playingId, playAudio } = useAudioPlayer();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'card'
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewStroke, setPreviewStroke] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  const handleEdit = useCallback((item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingItem(null);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
  }, []);

  const handleModalSuccess = useCallback(() => {
    handleModalClose();
    // If adding new, go to first page; if editing, refresh current
    if (editingItem) {
        fetchData(pagination.current);
    } else {
        fetchData(1);
    }
  }, [editingItem, fetchData, pagination.current, handleModalClose]);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="list-header" style={{ margin: 0 }}>已录入汉字</h2>
          <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)} buttonStyle="solid">
            <Radio.Button value="list"><BarsOutlined /></Radio.Button>
            <Radio.Button value="card"><AppstoreOutlined /></Radio.Button>
          </Radio.Group>
        </div>
        
        <CharacterList 
            viewMode={viewMode}
            data={data}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPlayAudio={playAudio}
            onPreviewStroke={setPreviewStroke}
            playingId={playingId}
        />

        {pagination.total > 0 && (
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                <Pagination
                current={pagination.current}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onChange={(p) => fetchData(p)}
                showSizeChanger={false}
                />
            </div>
        )}

        <StrokeModal 
            visible={!!previewStroke}
            stroke={previewStroke}
            onCancel={() => setPreviewStroke(null)}
        />

        <CharacterModal 
            visible={isModalOpen}
            editingItem={editingItem}
            onCancel={handleModalClose}
            onSuccess={handleModalSuccess}
            onPreviewStroke={setPreviewStroke}
        />
      </Content>
    </Layout>
  );
};

export default Admin;
