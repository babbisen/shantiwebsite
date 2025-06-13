// src/app/layout.tsx

'use client';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/navbar';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/components/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Shanti Rentals',
  description: 'Inventory and Order Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <Navbar />
          <LanguageToggle />
          <main>{children}</main>
          <Toaster richColors theme="dark" />
        </LanguageProvider>
      </body>
    </html>
  );
}