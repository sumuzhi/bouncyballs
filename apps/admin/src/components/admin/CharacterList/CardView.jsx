import React from 'react';
import { List, Card, Button, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, SoundOutlined, EyeOutlined } from '@ant-design/icons';

const CardView = ({ data, loading, onEdit, onDelete, onPlayAudio, onPreviewStroke, playingId }) => {
  return (
    <List
      loading={loading}
      grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6 }}
      dataSource={data}
      renderItem={(item) => (
        <List.Item style={{ marginBottom: 16 }}>
          <Card
            hoverable
            actions={[
              <Tooltip title="编辑"><Button type="text" shape="circle" icon={<EditOutlined />} onClick={() => onEdit(item)} /></Tooltip>,
              <Tooltip title="删除"><Button type="text" danger shape="circle" icon={<DeleteOutlined />} onClick={() => onDelete(item._id)} /></Tooltip>
            ]}
          >
            <Card.Meta
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: '#4A4A68' }}>{item.char}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#9D84FF', background: '#F0EDFF', padding: '2px 8px', borderRadius: 10 }}>
                    {item.pinyin}
                  </span>
                </div>
              }
              description={
                <div style={{ marginTop: 10 }}>
                   <div style={{ color: '#9FA0C3', marginBottom: 8, height: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.examples.join(', ')}</div>
                   <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      {item.audio && <Tooltip title="播放读音"><Button size="small" type="text" icon={<SoundOutlined className={playingId === item._id ? 'playing-icon' : ''} />} style={{ color: '#9D84FF' }} onClick={() => onPlayAudio(item.audio, item._id)} /></Tooltip>}
                      {item.stroke && <Tooltip title="查看笔画"><Button size="small" type="text" icon={<EyeOutlined />} style={{ color: '#FFB6E1' }} onClick={() => onPreviewStroke(item.stroke)} /></Tooltip>}
                   </div>
                </div>
              }
            />
          </Card>
        </List.Item>
      )}
    />
  );
};

export default React.memo(CardView);
