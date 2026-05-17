import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '共享記帳本',
    short_name: '共享記帳',
    description: '輕鬆與伴侶、室友、家人一起管理每一筆支出',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#0a0a0f',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '192x192',
        type: 'image/x-icon',
      },
      {
        src: '/favicon.ico',
        sizes: '512x512',
        type: 'image/x-icon',
      },
    ],
  };
}
