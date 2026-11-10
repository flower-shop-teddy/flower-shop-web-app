import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AppProviders, createQueryClient } from './app/providers';
import { router } from './app/router';

const client = createQueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders client={client}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
