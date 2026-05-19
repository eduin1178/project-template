import { defineConfig, devices } from '@playwright/test';

/*
 * Configuración Playwright local-only.
 * Este workspace no corre en CI. No uses variables de entorno CI ni
 * configuración derivada de ellas (forbidOnly, retries agresivos, etc.).
 * Si en el futuro se decide mover a CI, será un change explícito.
 */
export default defineConfig({
  testDir: './scripts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 800 },
    locale: 'es-ES',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
