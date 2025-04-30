'use client';

import { Web3Provider } from '@/contexts/Web3Context';
import Navbar from './Navbar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="container mx-auto py-8 px-4">
          {children}
        </main>
      </div>
    </Web3Provider>
  );
}