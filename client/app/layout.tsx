import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'keen-s-a | Conscious Evolution',
  description: 'Autonomous development with conscious evolution - real-time by default',
  keywords: 'autonomous development, AI agents, real-time, cloud-native, evolution',
  authors: [{ name: 'keen-s-a' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
