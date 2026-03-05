import React from 'react';
import { List, Button, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, SoundOutlined, EyeOutlined } from '@ant-design/icons';

const ListView = ({ data, loading, onEdit, onDelete, onPlayAudio, onPreviewStroke, playingId }) => {
  return (
    <List
      loading={loading}
      itemLayout="horizontal"
      dataSource={data}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Tooltip title="编辑"><Button type="text" shape="circle" icon={<EditOutlined />} onClick={() => onEdit(item)} /></Tooltip>,
            <Tooltip title="删除"><Button type="text" danger shape="circle" icon={<DeleteOutlined />} onClick={() => onDelete(item._id)} /></Tooltip>
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
                      icon={<SoundOutlined className={playingId === item._id ? 'playing-icon' : ''} />} 
                      style={{ color: '#9D84FF', marginLeft: 5 }}
                      onClick={() => onPlayAudio(item.audio, item._id)}
                  />
                )}
                {item.stroke && (
                  <Button
                      type="text"
                      icon={<EyeOutlined />}
                      style={{ color: '#FFB6E1', marginLeft: 5 }}
                      onClick={() => onPreviewStroke(item.stroke)}
                  />
                )}
              </span>
            }
            description={<span style={{ color: '#9FA0C3' }}>{item.examples.join(', ')}</span>}
          />
        </List.Item>
      )}
    />
  );
};

export default React.memo(ListView);
