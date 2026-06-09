import React from 'react';
import ReactDOM from 'react-dom';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/lib/locale/ru_RU';
import 'antd/dist/antd.css';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <ConfigProvider locale={ruRU}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
