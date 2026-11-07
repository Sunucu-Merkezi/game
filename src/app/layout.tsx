import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sunucu Merkezi — Veri Merkezi Yönetim Simülasyonu',
  description: 'Sıfırdan veri merkezi imparatorluğu kur. Sunucu Merkezi, tarayıcı tabanlı tycoon simülasyonu.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
