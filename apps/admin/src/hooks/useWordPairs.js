import { useState, useEffect, useCallback } from 'react';
import { message, Modal } from 'antd';
import api from '../utils/api';

const useWordPairs = (initialPage = 1, initialPageSize = 12) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });

  const fetchData = useCallback(
    async (page = pagination.current, size = pagination.pageSize, keyword = '') => {
      setLoading(true);
      try {
        const response = await api.get(
          `/word-pairs?page=${page}&limit=${size}&keyword=${encodeURIComponent(keyword)}`,
        );
        setData(response.data.data);
        setPagination((prev) => ({
          ...prev,
          current: response.data.meta.page,
          total: response.data.meta.total,
          pageSize: size,
        }));
      } catch (_error) {
        message.error('获取单词题库失败');
      } finally {
        setLoading(false);
      }
    },
    [pagination.current, pagination.pageSize],
  );

  const handleDelete = useCallback(
    (id) => {
      Modal.confirm({
        title: '确认删除该词条吗？',
        content: '删除后游戏题库将不再包含这组单词。',
        okText: '删除',
        cancelText: '取消',
        onOk: async () => {
          try {
            await api.delete(`/word-pairs/${id}`);
            message.success('词条删除成功');
            fetchData(pagination.current);
          } catch (_error) {
            message.error('删除失败');
          }
        },
      });
    },
    [fetchData, pagination.current],
  );

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    pagination,
    fetchData,
    handleDelete,
  };
};

export default useWordPairs;
