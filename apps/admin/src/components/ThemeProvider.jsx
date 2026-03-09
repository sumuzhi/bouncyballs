import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme as antTheme } from 'antd';
import { applyTheme, getStoredTheme, THEME_DARK, THEME_LIGHT } from '../utils/theme';

const ThemeContext = createContext({
  theme: THEME_LIGHT,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === THEME_LIGHT ? THEME_DARK : THEME_LIGHT));
  };

  const isDark = theme === THEME_DARK;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#7c3aed',
            colorInfo: '#7c3aed',
            colorSuccess: '#06b6d4',
            borderRadius: 10,
            fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
            colorBgContainer: isDark ? '#21113f' : '#ffffff',
            colorBgElevated: isDark ? '#21113f' : '#ffffff',
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};
