import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './state/AppContext';
import { App } from './App';
import { createCloudStore } from './storage/cloudStore';
import { registerServiceWorker } from './pwa';
import './styles.css';

// Nếu chạy trong Artifact có tài khoản: đồng bộ tiến độ qua tài khoản để mở được trên mọi thiết bị.
const store = createCloudStore();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider store={store}>
      <App />
    </AppProvider>
  </StrictMode>,
);
