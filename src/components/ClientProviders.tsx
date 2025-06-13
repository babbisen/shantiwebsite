'use client';
import { LanguageProvider } from './LanguageContext';
import LanguageToggle from './LanguageToggle';
import { Toaster } from 'sonner';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <LanguageToggle />
      {children}
      <Toaster richColors theme="dark" />
    </LanguageProvider>
  );
}
