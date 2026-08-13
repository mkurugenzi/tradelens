import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TradeLens — Understand Every Trade',
  description:
    'Turn your MT4 and MT5 trading history into clear performance insights. Import, analyze, and visualize your trading performance with TradeLens.',
  openGraph: {
    title: 'TradeLens — Understand Every Trade',
    description:
      'Turn your MT4 and MT5 trading history into clear performance insights.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
