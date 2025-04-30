'use client';

import { useWeb3 } from '@/contexts/Web3Context';
import MarketplaceBrowser from '@/components/MarketplaceBrowser';

export default function Marketplace() {
  const { account, connectWallet, isConnecting } = useWeb3();
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-center">Pokémon Marketplace</h1>
      
      {!account ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-2xl mx-auto mb-8">
          <p className="text-xl mb-4">Connect your wallet to purchase Pokémon</p>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : null}
      
      <MarketplaceBrowser />
    </div>
  );
}
