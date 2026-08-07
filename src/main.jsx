import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { UIProvider } from '@/providers/ui-provider';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <UIProvider>
          <App />
          <Toaster position="top-right" />
        </UIProvider>
      </ThemeProvider>
    </QueryProvider>
  </StrictMode>
);
