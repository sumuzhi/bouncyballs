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
          content: (
            <div className="max-h-52 overflow-auto">
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
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    form.setFieldsValue({
      en: item.en,
      zh: item.zh,
      difficulty: item.difficulty || 'easy',
      category: item.category || 'general',
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingItem(null);
  };

  const submitForm = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingItem?._id) {
        await api.put(`/word-pairs/${editingItem._id}`, values);
        message.success('词条更新成功');
      } else {
        await api.post('/word-pairs', values);
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
          <Form.Item name="en" label="English" rules={[{ required: true, message: '请输入英文' }]}>
            <Input placeholder="例如: apple" />
          </Form.Item>
          <Form.Item name="zh" label="中文" rules={[{ required: true, message: '请输入中文' }]}>
            <Input placeholder="例如: 苹果" />
          </Form.Item>
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
        </Form>
      </Modal>
    </div>
  );
}
