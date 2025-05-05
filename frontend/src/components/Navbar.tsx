// src/components/Navbar.tsx
import Link from 'next/link';
import WalletConnect from './WalletConnect';
import { useWeb3 } from '@/contexts/Web3Context';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const { account, marketplaceContract } = useWeb3();
  const [isOwner, setIsOwner] = useState(false);
  
  useEffect(() => {
    const checkOwner = async () => {
      if (!marketplaceContract || !account) return;
      
      try {
        const owner = await marketplaceContract.owner();
        setIsOwner(owner.toLowerCase() === account.toLowerCase());
      } catch (error) {
        console.error("Error checking owner status:", error);
      }
    };
    
    checkOwner();
  }, [marketplaceContract, account]);
  
  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-xl font-bold">Pokémon NFT</Link>
          <div className="hidden md:flex space-x-6">
            <Link href="/" className="hover:text-blue-200 transition">Home</Link>
            <Link href="/marketplace" className="hover:text-blue-200 transition">Marketplace</Link>
            <Link href="/my-collection" className="hover:text-blue-200 transition">My Collection</Link>
            {isOwner && (
              <Link href="/admin" className="text-yellow-300 hover:text-yellow-100 transition font-medium">
                Admin
              </Link>
            )}
          </div>
        </div>
        <WalletConnect />
      </div>
    </nav>
  );
}