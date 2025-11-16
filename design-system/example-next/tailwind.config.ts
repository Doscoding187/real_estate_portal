import type { Config } from 'tailwindcss';
import { themeExtend } from '../tailwind.extend';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: themeExtend as any,
  plugins: [],
};

export default config;
