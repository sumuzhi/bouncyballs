import React, { useState, useCallback } from 'react';
import { Layout, Button, Typography, Pagination, Radio } from 'antd';
import { LogoutOutlined, RobotOutlined, AppstoreOutlined, BarsOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useCharacters from '../hooks/useCharacters';
import useAudioPlayer from '../hooks/useAudioPlayer';
import CharacterList from '../components/admin/CharacterList';
import CharacterModal from '../components/admin/CharacterModal';
import StrokeModal from '../components/admin/StrokeModal';
import styles from './Admin.module.less';

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
    localStorage.removeItem('adminUser');
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
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <Title level={3} className={styles.title}>汉字录入 ✨</Title>
        <div className={styles.headerActions}>
            <Button 
                type="primary" 
                icon={<RobotOutlined />} 
                onClick={handleAdd}
                className={styles.primaryAction}
            >
                添加汉字
            </Button>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出登录</Button>
        </div>
      </Header>
      <Content className={styles.content}>
        <div className={styles.listHeaderRow}>
          <h2 className="list-header">已录入汉字</h2>
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
            <div className={styles.paginationWrap}>
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
