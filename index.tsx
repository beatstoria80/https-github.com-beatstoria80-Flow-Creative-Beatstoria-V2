

window.onerror = function (message, source, lineno, colno, error) {
  console.error("NEURAL FATAL ERROR:", message, "at", source, ":", lineno, ":", colno, error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;">
      <h1>NEURAL CRASH DETECTED</h1>
      <p>${message}</p>
      <pre>${error?.stack || ''}</pre>
    </div>`;
  }
  return false;
};

window.onunhandledrejection = function (event) {
  console.error("NEURAL UNHANDLED REJECTION:", event.reason);
};

import React from 'react';

import ReactDOM from 'react-dom/client';
import { App } from './components/App';

console.log("NEURAL BOOT: index.tsx loaded");
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("NEURAL ERROR: Root element not found!");
  throw new Error("Could not find root element to mount to");
}

console.log("NEURAL BOOT: Mounting React application...");
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log("NEURAL BOOT: Render call completed.");
