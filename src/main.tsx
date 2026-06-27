import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// GitHub Pages SPA fallback: restore URL from sessionStorage
(function() {
  const redirect = sessionStorage.redirect;
  if (redirect && redirect !== location.href) {
    delete sessionStorage.redirect;
    history.replaceState(null, '', redirect);
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
