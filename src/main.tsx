import "./db.migration.v7";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initPerformanceMonitoring } from "@/lib/performance";

// Initialize performance monitoring
initPerformanceMonitoring();

// No-flash script to prevent theme flashing
const noFlashScript = `
  (function() {
    try {
      var s = localStorage.getItem('vite-ui-theme');
      var m = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var t = s || m;
      if (t === 'dark') document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
`;

// Inject no-flash script
const script = document.createElement("script");
script.innerHTML = noFlashScript;
document.head.appendChild(script);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
