import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                'need-worker': resolve(__dirname, 'pages/need-worker.html'),
                'need-work': resolve(__dirname, 'pages/need-work.html'),
                'hire-monthly': resolve(__dirname, 'pages/hire-monthly.html'),
                'find-job': resolve(__dirname, 'pages/find-job.html'),
                'profile': resolve(__dirname, 'pages/profile.html'),
            },
        },
    },
});
