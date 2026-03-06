import React from 'react';
import { List, Button, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, SoundOutlined, EyeOutlined } from '@ant-design/icons';
import styles from './ListView.module.less';

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
          className={styles.listItem}
        >
          <List.Item.Meta
            title={
              <span className={styles.titleRow}>
                {item.char}
                <span className={styles.pinyinTag}>
                  {item.pinyin}
                </span>
                {item.audio && (
                  <Button 
                      type="text" 
                      icon={<SoundOutlined className={playingId === item._id ? 'playing-icon' : ''} />} 
                      className={styles.audioBtn}
                      onClick={() => onPlayAudio(item.audio, item._id)}
                  />
                )}
                {item.stroke && (
                  <Button
                      type="text"
                      icon={<EyeOutlined />}
                      className={styles.strokeBtn}
                      onClick={() => onPreviewStroke(item.stroke)}
                  />
                )}
              </span>
            }
            description={<span className={styles.description}>{item.examples.join(', ')}</span>}
          />
        </List.Item>
      )}
    />
  );
};

export default React.memo(ListView);
