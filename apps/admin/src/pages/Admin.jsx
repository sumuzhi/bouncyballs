import React, { useState, useCallback } from 'react';
import { Button, Checkbox, Input, Modal, Pagination, Radio, Space, Typography, Upload, message } from 'antd';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  RobotOutlined,
  AppstoreOutlined,
  BarsOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import api from '../utils/api';
import useCharacters from '../hooks/useCharacters';
import useAudioPlayer from '../hooks/useAudioPlayer';
import CharacterList from '../components/admin/CharacterList';
import CharacterModal from '../components/admin/CharacterModal';
import StrokeModal from '../components/admin/StrokeModal';
import styles from './Admin.module.less';

const { Title, Text } = Typography;

const Admin = () => {
  const { 
    data, 
    loading, 
    pagination, 
    fetchData, 
    handleDelete 
  } = useCharacters();
  
  const { playingId, playAudio } = useAudioPlayer();

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'card'
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewStroke, setPreviewStroke] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState('');
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewReady, setReviewReady] = useState(false);
  const [smartGenerating, setSmartGenerating] = useState(false);
  const [smartSubmitting, setSmartSubmitting] = useState(false);

  const parseCsv = (text) => {
    const lines = text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      return [];
    }
    const splitLine = (line) =>
      line
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((cell) => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    const headers = splitLine(lines[0]).map((item) => item.toLowerCase());
    const charIndex = headers.indexOf('char');
    const pinyinIndex = headers.indexOf('pinyin');
    const examplesIndex = headers.indexOf('examples');
    if (charIndex < 0) {
      throw new Error('CSV 表头必须包含 char');
    }
    return lines.slice(1).map((line) => {
      const cells = splitLine(line);
      const examplesRaw = examplesIndex >= 0 ? cells[examplesIndex] || '' : '';
      return {
        char: cells[charIndex] || '',
        pinyin: pinyinIndex >= 0 ? cells[pinyinIndex] || '' : '',
        examples: examplesRaw
          .split(/[|,，]/)
          .map((item) => item.trim())
          .filter(Boolean),
      };
    });
  };

  const importCsvFile = async (file) => {
    try {
      setImporting(true);
      const text = await file.text();
      const items = parseCsv(text);
      if (!items.length) {
        throw new Error('CSV 没有可导入数据');
      }
      const response = await api.post('/characters/batch-import', {
        items,
      });
      const result = response.data;
      message.success(
        `导入完成，新增 ${result.created} 条，跳过重复 ${result.skipped} 条，无效 ${result.invalid} 条`,
      );
      if (Array.isArray(result.duplicatedEntries) && result.duplicatedEntries.length) {
        Modal.info({
          title: '检测到重复汉字',
          content: (
            <div className={styles.duplicateList}>
              {result.duplicatedEntries.map((item) => (
                <div key={`${item.char}-${item.pinyin}`} className={styles.duplicateRow}>
                  {item.char} - {item.pinyin}
                </div>
              ))}
            </div>
          ),
        });
      }
      fetchData(1, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'CSV 导入失败');
    } finally {
      setImporting(false);
    }
    return false;
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await api.get('/characters/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `characters-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error(error.response?.data?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const openSmartModal = () => {
    setSmartOpen(true);
    setSmartPrompt('');
    setReviewItems([]);
    setReviewReady(false);
  };

  const closeSmartModal = () => {
    setSmartOpen(false);
    setSmartPrompt('');
    setReviewItems([]);
    setReviewReady(false);
  };

  const handleSmartCancel = () => {
    if (reviewReady) {
      setReviewReady(false);
      return;
    }
    closeSmartModal();
  };

  const updateReviewItem = (index, patch) => {
    setReviewItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const handleSmartGenerate = async () => {
    if (!smartPrompt.trim()) {
      message.warning('请输入AI需求，例如：生成小学三年级上的汉字');
      return;
    }
    setSmartGenerating(true);
    try {
      const response = await api.post('/ai-generate-characters', { prompt: smartPrompt.trim() });
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      if (!items.length) {
        throw new Error('AI 未返回可用汉字，请调整描述后重试');
      }
      setReviewItems(
        items.map((item) => ({
          selected: true,
          char: String(item.char || '').trim(),
          pinyin: String(item.pinyin || '').trim(),
          examplesText: Array.isArray(item.examples) ? item.examples.join('，') : '',
        })),
      );
      setReviewReady(true);
      message.success(`AI 已生成 ${items.length} 条候选汉字，请审核后提交`);
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'AI 生成失败');
    } finally {
      setSmartGenerating(false);
    }
  };

  const handleSmartSubmit = async () => {
    const selectedItems = reviewItems
      .filter((item) => item.selected)
      .map((item) => ({
        char: String(item.char || '').trim(),
        pinyin: String(item.pinyin || '').trim(),
        examples: String(item.examplesText || '')
          .split(/[|,，]/)
          .map((entry) => entry.trim())
          .filter(Boolean),
      }))
      .filter((item) => item.char && item.pinyin);
    if (!selectedItems.length) {
      message.warning('请至少选择一条有效数据');
      return;
    }
    setSmartSubmitting(true);
    try {
      const response = await api.post('/characters/batch-import', {
        items: selectedItems,
        asyncEnrichMedia: true,
      });
      const result = response.data;
      message.success(`录入完成，新增 ${result.created} 条，跳过重复 ${result.skipped} 条，无效 ${result.invalid} 条；音频与笔画将在后台补全`);
      if (Array.isArray(result.duplicatedEntries) && result.duplicatedEntries.length) {
        Modal.info({
          title: '检测到重复汉字',
          content: (
            <div className={styles.duplicateList}>
              {result.duplicatedEntries.map((item) => (
                <div key={`${item.char}-${item.pinyin}`} className={styles.duplicateRow}>
                  {item.char} - {item.pinyin}
                </div>
              ))}
            </div>
          ),
        });
      }
      fetchData(1, pagination.pageSize);
      closeSmartModal();
    } catch (error) {
      message.error(error.response?.data?.message || '批量录入失败');
    } finally {
      setSmartSubmitting(false);
    }
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
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.headerRow}>
            <div>
              <div className={styles.titleWrap}>
                <span className={styles.titleIcon}>
                  <AppstoreOutlined />
                </span>
                <Title level={3} className={styles.title}>
                  汉字管理控制台
                </Title>
              </div>
              <Text className={styles.subtitle}>
                高饱和炫彩管理台，支持快速录入与编辑
              </Text>
            </div>
            <Space wrap className={styles.headerActions}>
              <Upload
                accept=".csv,text/csv"
                maxCount={1}
                showUploadList={false}
                beforeUpload={importCsvFile}
              >
                <Button icon={<CloudUploadOutlined />} loading={importing}>
                  导入CSV
                </Button>
              </Upload>
              <Button icon={<CloudDownloadOutlined />} loading={exporting} onClick={handleExport}>
                导出CSV
              </Button>
              <Button icon={<ThunderboltOutlined />} onClick={openSmartModal}>
                智能录入
              </Button>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleAdd}
              >
                添加汉字
              </Button>
            </Space>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.listHeaderRow}>
            <h2 className="list-header">已录入汉字</h2>
            <Space>
              <span className={styles.statusPill}>
                <ThunderboltOutlined /> 智能录入
              </span>
              <span className={styles.statusPill}>
                <FileTextOutlined /> CSV表头: char,pinyin,examples
              </span>
              <Radio.Group
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="list">
                  <BarsOutlined />
                </Radio.Button>
                <Radio.Button value="card">
                  <AppstoreOutlined />
                </Radio.Button>
              </Radio.Group>
            </Space>
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
        </div>

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
        <Modal
          title="智能录入"
          open={smartOpen}
          onCancel={handleSmartCancel}
          onOk={reviewReady ? handleSmartSubmit : handleSmartGenerate}
          okButtonProps={{ loading: reviewReady ? smartSubmitting : smartGenerating }}
          confirmLoading={smartSubmitting}
          okText={reviewReady ? '确认录入' : 'AI生成'}
          cancelText={reviewReady ? '返回输入' : '取消'}
          width={760}
        >
          {!reviewReady && (
            <>
              <p className={styles.smartTip}>输入自然语言需求，AI会一次性生成候选汉字清单。</p>
              <Input.TextArea
                value={smartPrompt}
                onChange={(event) => setSmartPrompt(event.target.value)}
                rows={5}
                placeholder="例如：生成小学三年级上的汉字，优先高频字，给出拼音和组词"
              />
            </>
          )}
          {reviewReady && (
            <div className={styles.reviewWrap}>
              <p className={styles.smartTip}>请审核并编辑后提交，取消勾选可排除不需要的字符。</p>
              {reviewItems.map((item, index) => (
                <div key={`${item.char}-${index}`} className={styles.reviewRow}>
                  <Checkbox
                    checked={item.selected}
                    onChange={(event) => updateReviewItem(index, { selected: event.target.checked })}
                  />
                  <Input
                    value={item.char}
                    className={styles.reviewChar}
                    onChange={(event) => updateReviewItem(index, { char: event.target.value })}
                    placeholder="汉字"
                  />
                  <Input
                    value={item.pinyin}
                    className={styles.reviewPinyin}
                    onChange={(event) => updateReviewItem(index, { pinyin: event.target.value })}
                    placeholder="拼音"
                  />
                  <Input
                    value={item.examplesText}
                    onChange={(event) => updateReviewItem(index, { examplesText: event.target.value })}
                    placeholder="组词，使用逗号分隔"
                  />
                </div>
              ))}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default Admin;
