// src/components/AuctionCreator.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

export default function AuctionCreator() {
  const { account, nftContract, marketplaceContract } = useWeb3();
  const [ownedPokemon, setOwnedPokemon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState('');
  const [startingPrice, setStartingPrice] = useState('0.01');
  const [duration, setDuration] = useState(24); // hours
  const [isCreatingAuction, setIsCreatingAuction] = useState(false);
  const [result, setResult] = useState(null);
  
  // Fetch owned Pokemon (similar to ListingCreator)
  useEffect(() => {
    const fetchOwnedPokemon = async () => {
      // Similar to your existing code in ListingCreator.tsx
    };
    
    fetchOwnedPokemon();
  }, [nftContract, account, marketplaceContract]);
  
  const createAuction = async () => {
    if (!nftContract || !marketplaceContract || !account || !selectedToken) {
      setResult("Please connect your wallet and select a Pokémon");
      return;
    }
    
    try {
      setIsCreatingAuction(true);
      setResult(null);
      
      // First, approve the marketplace contract to transfer this token
      console.log("Approving marketplace to transfer token...");
      const approvalTx = await nftContract.approve(
        await marketplaceContract.getAddress(),
        selectedToken
      );
      await approvalTx.wait();
      console.log("Approval confirmed");
      
      // Convert price from ETH to wei
      const priceInWei = ethers.parseEther(startingPrice);
      
      // Calculate auction end time (current time + duration in seconds)
      const endTime = Math.floor(Date.now() / 1000) + (duration * 3600);
      
      // Create the auction
      console.log("Creating auction...");
      const tx = await marketplaceContract.createAuction(
        selectedToken, 
        priceInWei,
        endTime
      );
      await tx.wait();
      
      setResult(`Successfully created auction starting at ${startingPrice} ETH!`);
      
      // Update the UI
      setOwnedPokemon(prevState => 
        prevState.map(pokemon => 
          pokemon.tokenId === selectedToken 
            ? { ...pokemon, isListed: true, isAuction: true } 
            : pokemon
        )
      );
      
      // Reset selected token
      setSelectedToken('');
    } catch (error) {
      console.error("Error creating auction:", error);
      setResult(handleContractError(error));
    } finally {
      setIsCreatingAuction(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Create Pokémon Auction</h2>
      
      {/* Similar UI to ListingCreator but with duration field and auction-specific buttons */}
      {!account ? (
        <p className="text-red-600 mb-4">Please connect your wallet to create auctions</p>
      ) : loading ? (
        <p className="text-center py-4">Loading your Pokémon collection...</p>
      ) : ownedPokemon.length === 0 ? (
        <div className="text-center py-4">
          <p className="mb-3">You don't own any Pokémon cards yet.</p>
          <a href="/" className="text-blue-600 hover:underline">Mint some Pokémon first</a>
        </div>
      ) : (
        <div>
          {/* Pokemon selection grid (similar to ListingCreator) */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Your Pokémon Collection</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* Render Pokemon cards similar to ListingCreator */}
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Create Auction</h3>
            
            {selectedToken ? (
              <div>
                <p className="mb-2">
                  Selected Pokémon: {ownedPokemon.find(p => p.tokenId === selectedToken)?.name} 
                  (Token #{selectedToken})
                </p>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Starting Price (ETH)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={startingPrice}
                      onChange={(e) => setStartingPrice(e.target.value)}
                      className="p-2 border rounded w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168" // 1 week max
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="p-2 border rounded w-full"
                    />
                  </div>
                  
                  <button
                    onClick={createAuction}
                    disabled={isCreatingAuction}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingAuction ? 'Creating Auction...' : 'Create Auction'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Select a Pokémon above to create an auction
              </p>
            )}
          </div>
          
          {result && (
            <div className={`p-3 rounded mt-4 ${
              result.includes('Error') 
                ? 'bg-red-50 text-red-800' 
                : 'bg-green-50 text-green-800'
            }`}>
              {result}
            </div>
          )}
        </div>
      )}
    </div>
  );
}