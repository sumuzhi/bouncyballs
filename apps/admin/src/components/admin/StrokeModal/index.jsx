import React from 'react';
import { Modal } from 'antd';

const StrokeModal = ({ visible, stroke, onCancel }) => {
  return (
    <Modal
      open={visible}
      footer={null}
      onCancel={onCancel}
      title="笔画演示"
      destroyOnClose
    >
      <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
        {stroke && <img src={stroke} alt="笔画" style={{ maxWidth: '100%', maxHeight: 300 }} />}
      </div>
    </Modal>
  );
};

export default StrokeModal;
