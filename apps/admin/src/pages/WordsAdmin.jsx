import { useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
  Checkbox,
  Image,
} from 'antd';
import {
  BookOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  RocketOutlined,
  SearchOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import api from '../utils/api';
import useWordPairs from '../hooks/useWordPairs';
import styles from './WordsAdmin.module.less';

const { Title, Text } = Typography;

const difficultyTagMap = {
  easy: 'green',
  medium: 'blue',
  hard: 'red',
};

export default function WordsAdmin() {
  const { data, loading, pagination, fetchData, handleDelete } = useWordPairs();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState('');
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewReady, setReviewReady] = useState(false);
  const [smartGenerating, setSmartGenerating] = useState(false);
  const [smartSubmitting, setSmartSubmitting] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);

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
    const enIndex = headers.indexOf('en');
    const zhIndex = headers.indexOf('zh');
    const categoryIndex = headers.indexOf('category');
    const difficultyIndex = headers.indexOf('difficulty');
    if (enIndex < 0 || zhIndex < 0) {
      throw new Error('CSV 表头必须包含 en, zh');
    }
    return lines.slice(1).map((line) => {
      const cells = splitLine(line);
      return {
        en: cells[enIndex] || '',
        zh: cells[zhIndex] || '',
        category: categoryIndex >= 0 ? cells[categoryIndex] || 'general' : 'general',
        difficulty: difficultyIndex >= 0 ? cells[difficultyIndex] || 'easy' : 'easy',
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
      const response = await api.post('/word-pairs/batch-import', { items });
      const result = response.data;
      message.success(
        `导入完成，新增 ${result.created} 条，跳过库内重复 ${result.skipped} 条，文件内重复 ${result.duplicatesInFile} 条，无效 ${result.invalid} 条`,
      );
      if (Array.isArray(result.duplicatedEntries) && result.duplicatedEntries.length) {
        Modal.info({
          title: '检测到重复词条',
          icon: <ThunderboltOutlined style={{ color: '#faad14' }} />,
          okType: 'default',
          content: (
            <div className={styles.duplicateList}>
              {result.duplicatedEntries.map((item) => (
                <div key={`${item.en}-${item.zh}`} className={styles.duplicateRow}>
                  {item.en} - {item.zh}
                </div>
              ))}
            </div>
          ),
        });
      }
      fetchData(1, pagination.pageSize, keyword);
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
      const response = await api.get(
        `/word-pairs/export?keyword=${encodeURIComponent(keyword)}`,
        { responseType: 'blob' },
      );
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `word-pairs-${Date.now()}.csv`;
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

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ difficulty: 'easy', category: 'general' });
    setGeneratedImage(null);
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    form.setFieldsValue({
      en: item.en,
      zh: item.zh,
      difficulty: item.difficulty || 'easy',
      category: item.category || 'general',
      image: item.image,
    });
    setGeneratedImage(item.image);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingItem(null);
    setGeneratedImage(null);
  };

  const submitForm = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, image: generatedImage };
      setSubmitting(true);
      if (editingItem?._id) {
        await api.put(`/word-pairs/${editingItem._id}`, payload);
        message.success('词条更新成功');
      } else {
        await api.post('/word-pairs', payload);
        message.success('词条创建成功');
      }
      closeModal();
      fetchData(1, pagination.pageSize, keyword);
    } catch (error) {
      if (error?.response) {
        message.error(error.response?.data?.message || '提交失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiGenerate = async () => {
    const en = form.getFieldValue('en');
    const zh = form.getFieldValue('zh');
    
    // 如果都为空，提示输入
    if (!en && !zh) {
        message.warning('请先输入中文或英文');
        return;
    }

    // 优先使用中文生成英文，如果中文为空则使用英文生成中文
    const word = zh || en;
    setAiLoading(true);
    try {
        const response = await api.get(`/ai-generate-word?word=${encodeURIComponent(word)}`);
        form.setFieldsValue({
            en: response.data.en,
            zh: response.data.zh
        });
        if (response.data.image) {
            setGeneratedImage(response.data.image);
        }
        message.success('AI 生成成功');
    } catch (error) {
        message.error(error.response?.data?.message || 'AI 生成失败');
    } finally {
        setAiLoading(false);
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
      message.warning('请输入AI需求，例如：生成动物相关的单词');
      return;
    }
    setSmartGenerating(true);
    try {
      const response = await api.post('/ai-generate-word-pairs', { prompt: smartPrompt.trim() });
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      if (!items.length) {
        throw new Error('AI 未返回可用单词，请调整描述后重试');
      }
      setReviewItems(
        items.map((item) => ({
          selected: true,
          en: String(item.en || '').trim(),
          zh: String(item.zh || '').trim(),
          category: String(item.category || 'general').trim(),
          difficulty: String(item.difficulty || 'easy').trim(),
        })),
      );
      setReviewReady(true);
      message.success(`AI 已生成 ${items.length} 条候选单词，请审核后提交`);
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
        en: String(item.en || '').trim(),
        zh: String(item.zh || '').trim(),
        category: item.category,
        difficulty: item.difficulty,
      }))
      .filter((item) => item.en && item.zh);
      
    if (!selectedItems.length) {
      message.warning('请至少选择一条有效数据');
      return;
    }
    setSmartSubmitting(true);
    try {
      const response = await api.post('/word-pairs/batch-import', {
        items: selectedItems,
      });
      const result = response.data;
      message.success(`录入完成，新增 ${result.created} 条，跳过重复 ${result.skipped} 条，无效 ${result.invalid} 条`);
      
      if (Array.isArray(result.duplicatedEntries) && result.duplicatedEntries.length) {
        Modal.info({
          title: '检测到重复单词',
          icon: <ThunderboltOutlined style={{ color: '#faad14' }} />,
          okType: 'default',
          content: (
            <div className={styles.duplicateList}>
              {result.duplicatedEntries.map((item) => (
                <div key={`${item.en}-${item.zh}`} className={styles.duplicateRow}>
                  {item.en} - {item.zh}
                </div>
              ))}
            </div>
          ),
        });
      }
      fetchData(1, pagination.pageSize, keyword);
      closeSmartModal();
    } catch (error) {
      message.error(error.response?.data?.message || '批量录入失败');
    } finally {
      setSmartSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: 'English',
        dataIndex: 'en',
        key: 'en',
        render: (text) => <span className="font-semibold text-cyber-text">{text}</span>,
      },
      {
        title: '中文',
        dataIndex: 'zh',
        key: 'zh',
        render: (text) => <span className="font-medium text-cyber-text">{text}</span>,
      },
      {
        title: '难度',
        dataIndex: 'difficulty',
        key: 'difficulty',
        width: 130,
        render: (value) => (
          <Tag color={difficultyTagMap[value] || 'default'}>{(value || 'easy').toUpperCase()}</Tag>
        ),
      },
      {
        title: '分类',
        dataIndex: 'category',
        key: 'category',
        width: 140,
        render: (value) => <Tag>{value || 'general'}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 170,
        render: (_, item) => (
          <Space>
            <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(item)}>
              编辑
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDelete(item._id)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [handleDelete],
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.headerRow}>
            <div>
              <div className={styles.titleWrap}>
                <span className={styles.titleIcon}>
                  <DatabaseOutlined />
                </span>
                <Title level={3} className={styles.title}>
                  手势单词题库
                </Title>
              </div>
              <Text className={styles.subtitle}>
                录入后的词条会实时成为手势单词配对的游戏数据源
              </Text>
            </div>
            <Space wrap className={styles.actions}>
              <Upload
                accept=".csv,text/csv"
                maxCount={1}
                showUploadList={false}
                beforeUpload={importCsvFile}
              >
                <Button icon={<CloudUploadOutlined />} loading={importing}>
                  批量导入CSV
                </Button>
              </Upload>
              <Button icon={<CloudDownloadOutlined />} loading={exporting} onClick={handleExport}>
                导出CSV
              </Button>
              <Button icon={<ThunderboltOutlined />} onClick={openSmartModal}>
                智能录入
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新增词条
              </Button>
            </Space>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.toolbar}>
            <Input
              allowClear
              placeholder="搜索英文或中文"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={() => fetchData(1, pagination.pageSize, keyword)}
              prefix={<SearchOutlined />}
              className={styles.toolbarInput}
            />
            <Button
              icon={<RocketOutlined />}
              type="default"
              onClick={() => fetchData(1, pagination.pageSize, keyword)}
            >
              查询
            </Button>
            <span className={styles.hint}>
              <FileTextOutlined /> CSV表头: en,zh,category,difficulty
            </span>
            <span className={styles.hint}>
              <BookOutlined /> 推荐先导出模板再回填
            </span>
            <span className={styles.hint}>
              <DownloadOutlined /> 自动跳过重复词条
            </span>
          </div>

          <Table
            rowKey="_id"
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={false}
          />

          {pagination.total > 0 && (
            <div className={styles.pagination}>
              <Pagination
                current={pagination.current}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onChange={(page) => fetchData(page, pagination.pageSize, keyword)}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        title={editingItem ? '编辑词条' : '新增词条'}
        open={open}
        onCancel={closeModal}
        onOk={submitForm}
        confirmLoading={submitting}
        okText={editingItem ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="zh" label="中文" rules={[{ required: true, message: '请输入中文' }]}>
            <Input placeholder="例如: 苹果" />
          </Form.Item>
          <Form.Item name="en" label="English" rules={[{ required: true, message: '请输入英文' }]}>
            <Input placeholder="例如: apple" />
          </Form.Item>
          <Button 
            icon={<RobotOutlined />} 
            onClick={handleAiGenerate} 
            loading={aiLoading}
            block
            style={{ marginBottom: 24 }}
          >
            AI 自动翻译/补全
          </Button>
          <Form.Item name="difficulty" label="难度">
            <Select
              options={[
                { value: 'easy', label: 'easy' },
                { value: 'medium', label: 'medium' },
                { value: 'hard', label: 'hard' },
              ]}
            />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="例如: food / animal / transport" />
          </Form.Item>
          {generatedImage && (
            <div style={{ marginTop: 16, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ marginBottom: 8, color: 'var(--subtitle-color)', fontSize: 13 }}>
                <PictureOutlined style={{ marginRight: 6 }} /> AI 生成配图
              </div>
              <Image
                src={generatedImage}
                width={200}
                style={{ borderRadius: 8, border: '1px solid var(--card-border)' }}
              />
            </div>
          )}
        </Form>
      </Modal>

      <Modal
          title="智能录入单词"
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
              <p className={styles.smartTip}>输入自然语言需求，AI会一次性生成候选单词清单。</p>
              <Input.TextArea
                value={smartPrompt}
                onChange={(event) => setSmartPrompt(event.target.value)}
                rows={5}
                placeholder="例如：生成10个水果相关的单词，难度为easy"
              />
            </>
          )}
          {reviewReady && (
            <div className={styles.reviewWrap}>
              <p className={styles.smartTip}>请审核并编辑后提交，取消勾选可排除不需要的单词。</p>
              {reviewItems.map((item, index) => (
                <div key={`${item.en}-${index}`} className={styles.reviewRow}>
                  <Checkbox
                    checked={item.selected}
                    onChange={(event) => updateReviewItem(index, { selected: event.target.checked })}
                  />
                  <Input
                    value={item.en}
                    onChange={(event) => updateReviewItem(index, { en: event.target.value })}
                    placeholder="English"
                    style={{ flex: 1.5, fontWeight: 600 }}
                  />
                  <Input
                    value={item.zh}
                    onChange={(event) => updateReviewItem(index, { zh: event.target.value })}
                    placeholder="中文"
                    style={{ flex: 1 }}
                  />
                  <Input
                    value={item.category}
                    onChange={(event) => updateReviewItem(index, { category: event.target.value })}
                    placeholder="分类"
                    style={{ width: 120 }}
                  />
                  <Select
                    value={item.difficulty}
                    onChange={(value) => updateReviewItem(index, { difficulty: value })}
                    options={[
                        { value: 'easy', label: 'easy' },
                        { value: 'medium', label: 'medium' },
                        { value: 'hard', label: 'hard' },
                    ]}
                    style={{ width: 100 }}
                  />
                </div>
              ))}
            </div>
          )}
        </Modal>
    </div>
  );
}
