

window.onerror = function (message, source, lineno, colno, error) {
  // IGNORE ResizeObserver noise - it's a browser warning, not a fatal crash
  if (typeof message === 'string' && (message.includes('ResizeObserver loop completed') || message.includes('ResizeObserver loop limit exceeded'))) {
    console.debug("NEURAL WARNING (SUPPRESSED):", message);
    return true; // Prevents the error from floating up
  }

  console.error("NEURAL FATAL ERROR:", message, "at", source, ":", lineno, ":", colno, error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace; background: #000; height: 100vh;">
      <h1 style="color: #ff4444;">NEURAL CRASH DETECTED</h1>
      <p style="color: #fff;">${message}</p>
      <pre style="color: #666; font-size: 10px; overflow: auto;">${error?.stack || ''}</pre>
      <button onclick="window.location.reload()" style="background: #333; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px;">REBOOT SYSTEM</button>
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
