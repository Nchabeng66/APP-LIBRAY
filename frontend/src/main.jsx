import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { LibraryProvider } from './context/LibraryContext.jsx';
import './styles/style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LibraryProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LibraryProvider>
  </React.StrictMode>,
);