import type { Metadata } from 'next';

import { AppShell } from '@/components/shell/app-shell';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'آنبورد هارنس',
  description: 'ایجنت شخصی روی سیستم خودتان، با مدل و کلید خودتان',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
