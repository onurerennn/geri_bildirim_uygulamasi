import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// More aggressive approach to suppress ResizeObserver errors
// 1. Override console.error
const originalConsoleError = console.error;
console.error = function (...args) {
  // Check if this is a ResizeObserver error
  if (args[0] && typeof args[0] === 'string' &&
    (args[0].includes('ResizeObserver loop') ||
      args[0].includes('ResizeObserver loop completed with undelivered notifications'))) {
    // Suppress only ResizeObserver errors
    return;
  }
  // Pass through all other errors
  return originalConsoleError.apply(console, args);
};

// 2. Add a global error event listener
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message &&
      (event.message.includes('ResizeObserver loop') ||
        event.message.includes('ResizeObserver loop completed with undelivered notifications'))) {
      // Prevent the error from showing up in the console
      event.stopImmediatePropagation();
      event.preventDefault();
      return true; // Returning true prevents the default browser error handling
    }
    return false;
  }, true);

  // 3. Patch ResizeObserver to prevent excess notifications
  const originalResizeObserver = window.ResizeObserver;
  if (originalResizeObserver) {
    window.ResizeObserver = class PatchedResizeObserver extends originalResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => {
          // Wrap callback in a try-catch to prevent entire observer from breaking
          try {
            callback(entries, observer);
          } catch (e: unknown) {
            if (e instanceof Error && !e.message.includes('ResizeObserver loop')) {
              console.error(e);
            }
          }
        });
      }
    };
  }
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
