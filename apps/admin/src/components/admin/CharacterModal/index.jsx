import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { RobotOutlined, SaveOutlined, SoundOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../../utils/api';
import useAudioPlayer from '../../../hooks/useAudioPlayer';

const CharacterModal = ({ visible, editingItem, onCancel, onSuccess, onPreviewStroke }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [currentStroke, setCurrentStroke] = useState(null);
  
  const { playingId, playAudio } = useAudioPlayer();

  // Reset form when modal opens or editing item changes
  useEffect(() => {
    if (visible) {
      if (editingItem) {
        form.setFieldsValue({
          char: editingItem.char,
          pinyin: editingItem.pinyin,
          examples: editingItem.examples.join(', '),
        });
        setCurrentAudio(editingItem.audio);
        setCurrentStroke(editingItem.stroke);
      } else {
        form.resetFields();
        setCurrentAudio(null);
        setCurrentStroke(null);
      }
    }
  }, [visible, editingItem, form]);

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
      if (editingItem) {
        // Update
        await api.put(`/characters/${editingItem._id}`, payload);
        message.success('更新成功');
      } else {
        // Create
        await api.post('/characters', payload);
        message.success(`成功添加: ${values.char}`);
      }
      onSuccess(); // Callback to refresh list
    } catch (error) {
      message.error(error.response?.data?.message || (editingItem ? '更新失败' : '添加失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editingItem ? "编辑汉字" : "添加汉字"}
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish} size="large">
        <Form.Item name="char" label="汉字" rules={[{ required: true, message: '请输入汉字' }]}>
          <Input placeholder="输入单个汉字" disabled={!!editingItem} style={{ background: editingItem ? '#EFEFEF' : '#F4F6FA', border: 'none' }} />
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
                 {editingItem ? '保存修改' : '保存汉字'}
             </Button>
         </div>
         {currentAudio && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', background: '#F0EDFF', padding: '10px', borderRadius: 12 }}>
                <SoundOutlined className={playingId === 'modal-preview' ? 'playing-icon' : ''} style={{ color: '#9D84FF', marginRight: 10, fontSize: 18 }} />
                <span style={{ marginRight: 10, color: '#4A4A68', fontSize: 14 }}>已获取发音</span>
                <Button size="small" type="primary" ghost onClick={() => playAudio(currentAudio, 'modal-preview')}>试听</Button>
            </div>
         )}
         {currentStroke && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', background: '#FFF0F5', padding: '10px', borderRadius: 12 }}>
                <EyeOutlined style={{ color: '#FF69B4', marginRight: 10, fontSize: 18 }} />
                <span style={{ marginRight: 10, color: '#4A4A68', fontSize: 14 }}>已获取笔画</span>
                <Button size="small" type="primary" ghost onClick={() => onPreviewStroke && onPreviewStroke(currentStroke)}>查看</Button>
            </div>
         )}
      </Form>
    </Modal>
  );
};

export default CharacterModal;
