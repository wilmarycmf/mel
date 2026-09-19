import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/layout.css';
import { WorldStoreProvider } from './state/WorldStore';
import './styles/world.css';

const root = document.getElementById('root');
if (!root) throw new Error('GlobalPulse: #root not found in index.html');

createRoot(root).render(
  <WorldStoreProvider>
    <App />
  </WorldStoreProvider>,
);