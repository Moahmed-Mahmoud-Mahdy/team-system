import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../team-system-full-1.jsx'

// Polyfill for window.storage to work in standard browsers browsers using localStorage
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      const val = localStorage.getItem(key);
      // The original code expects the resolved value to have a 'value' property if it exists
      return val ? { value: val } : null;
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
