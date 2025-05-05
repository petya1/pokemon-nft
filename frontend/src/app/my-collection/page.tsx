'use client';

import { useWeb3 } from '@/contexts/Web3Context';
import ListingCreator from '@/components/ListingCreator';
import ContractStatusIndicator from '@/components/ContractStatusIdenticator';

export default function MyCollection() {
  const { account } = useWeb3();
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-center">My Pokémon Collection</h1>
      <ContractStatusIndicator />
      {!account ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-2xl mx-auto">
          <p className="text-xl mb-4">Please connect your wallet to view your collection</p>
          <p className="text-gray-600">
            Connect your wallet to view your Pokémon and list them for sale on the marketplace
          </p>
        </div>
      ) : (
        <ListingCreator />
      )}
    </div>
  );
}
