import { useState, useEffect, useCallback } from 'react';
import { message, Modal } from 'antd';
import api from '../utils/api';

const useCharacters = (initialPage = 1, initialPageSize = 10) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });

  const fetchData = useCallback(async (page = pagination.current, size = pagination.pageSize) => {
    setLoading(true);
    try {
      const response = await api.get(`/characters?page=${page}&limit=${size}`);
      setData(response.data.data);
      setPagination(prev => ({
        ...prev,
        current: response.data.meta.page,
        total: response.data.meta.total,
        pageSize: size
      }));
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  const handleDelete = useCallback((id) => {
    Modal.confirm({
      title: '确认删除',
      content: '你确定要删除这个汉字吗？',
      onOk: async () => {
        try {
          await api.delete(`/characters/${id}`);
          message.success('删除成功');
          fetchData(pagination.current);
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  }, [pagination.current, fetchData]);

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    pagination,
    fetchData,
    handleDelete
  };
};

export default useCharacters;
