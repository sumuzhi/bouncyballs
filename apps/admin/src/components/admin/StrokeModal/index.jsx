import React from 'react';
import { Modal } from 'antd';
import styles from './index.module.less';

const StrokeModal = ({ visible, stroke, onCancel }) => {
  return (
    <Modal
      open={visible}
      footer={null}
      onCancel={onCancel}
      title="笔画演示"
      destroyOnClose
    >
      <div className={styles.previewWrap}>
        {stroke && <img src={stroke} alt="笔画" className={styles.previewImage} />}
      </div>
    </Modal>
  );
};

export default StrokeModal;
