import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import and register AG Grid Enterprise modules
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

createRoot(document.getElementById("root")!).render(<App />);
