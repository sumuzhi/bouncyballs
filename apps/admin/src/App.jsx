import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Admin from './pages/Admin';
import WordsAdmin from './pages/WordsAdmin';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/characters" replace />} />
          <Route path="/characters" element={<Admin />} />
          <Route path="/words" element={<WordsAdmin />} />
        </Route>
      </Route>
      {/* 这里的 path="*" 是为了匹配所有未定义的路由并重定向 */}
      <Route path="*" element={<Navigate to="/characters" replace />} />
    </Routes>
  );
}

export default App;
