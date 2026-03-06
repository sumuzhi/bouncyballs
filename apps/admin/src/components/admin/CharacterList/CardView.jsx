import React from 'react';
import { List, Card, Button, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, SoundOutlined, EyeOutlined } from '@ant-design/icons';
import styles from './CardView.module.less';

const CardView = ({ data, loading, onEdit, onDelete, onPlayAudio, onPreviewStroke, playingId }) => {
  return (
    <List
      loading={loading}
      grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6 }}
      dataSource={data}
      renderItem={(item) => (
        <List.Item className={styles.listItem}>
          <Card
            hoverable
            actions={[
              <Tooltip title="编辑"><Button type="text" shape="circle" icon={<EditOutlined />} onClick={() => onEdit(item)} /></Tooltip>,
              <Tooltip title="删除"><Button type="text" danger shape="circle" icon={<DeleteOutlined />} onClick={() => onDelete(item._id)} /></Tooltip>
            ]}
          >
            <Card.Meta
              title={
                <div className={styles.metaTitle}>
                  <span className={styles.char}>{item.char}</span>
                  <span className={styles.pinyinTag}>
                    {item.pinyin}
                  </span>
                </div>
              }
              description={
                <div className={styles.metaDescription}>
                   <div className={styles.examples}>{item.examples.join(', ')}</div>
                   <div className={styles.actionRow}>
                      {item.audio && <Tooltip title="播放读音"><Button size="small" type="text" icon={<SoundOutlined className={playingId === item._id ? 'playing-icon' : ''} />} className={styles.audioBtn} onClick={() => onPlayAudio(item.audio, item._id)} /></Tooltip>}
                      {item.stroke && <Tooltip title="查看笔画"><Button size="small" type="text" icon={<EyeOutlined />} className={styles.strokeBtn} onClick={() => onPreviewStroke(item.stroke)} /></Tooltip>}
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
