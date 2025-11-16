import { themeExtend } from '../design-system/tailwind.extend';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: themeExtend,
  plugins: [],
};