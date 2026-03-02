// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://blog.neocode24.com',
  vite: {
    plugins: [tailwindcss()],
  },
});
