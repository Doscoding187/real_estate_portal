import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const chromeProjects = (base.projects ?? []).map((project) =>
  project.name === 'Desktop Chrome'
    ? { ...project, use: { ...project.use, channel: 'chrome' as const } }
    : project,
);

export default defineConfig({
  ...base,
  timeout: 45 * 1000,
  webServer: undefined,
  use: {
    ...base.use,
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3009',
    video: 'off',
    trace: 'off',
  },
  projects: chromeProjects,
});
