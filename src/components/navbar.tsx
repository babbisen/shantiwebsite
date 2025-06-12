// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/', label: 'Inventory' },
    { href: '/current-orders', label: 'Current Orders' },
    { href: '/packages', label: 'Packages' },
    { href: '/orders', label: 'Order Details' },
    { href: '/completed-orders', label: 'Completed Orders' },
    { href: '/statistics', label: 'Statistics' },
  ];

  return (
    <nav className="bg-slate-800/90 backdrop-blur-md shadow-md sticky top-0 z-40 border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            className="md:hidden p-2 text-slate-300 hover:text-white"
            aria-label="Toggle navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors duration-200 ${
                  pathname === item.href
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        {open && (
          <div className="flex flex-col space-y-1 pb-4 md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors duration-200 ${
                  pathname === item.href
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}