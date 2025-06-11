// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/navbar';
import { Toaster } from 'sonner'; // --- CHANGE: Import the Toaster component ---

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
        <Navbar />
        <main>{children}</main>
        {/* --- CHANGE: Add the Toaster component here --- */}
        <Toaster richColors theme="dark" />
      </body>
    </html>
  );
}