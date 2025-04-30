import Link from 'next/link';
import WalletConnect from './WalletConnect';

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-xl font-bold">Pokémon NFT</Link>
          <div className="hidden md:flex space-x-6">
            <Link href="/" className="hover:text-blue-200 transition">Home</Link>
            <Link href="/marketplace" className="hover:text-blue-200 transition">Marketplace</Link>
            <Link href="/my-collection" className="hover:text-blue-200 transition">My Collection</Link>
          </div>
        </div>
        <WalletConnect />
      </div>
    </nav>
  );
}
