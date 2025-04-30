// src/components/AuctionBrowser.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

export default function AuctionBrowser() {
  const { account, nftContract, marketplaceContract } = useWeb3();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState({});
  const [bidding, setBidding] = useState(null);
  const [bidResult, setBidResult] = useState(null);
  
  // Format time remaining
  const formatTimeRemaining = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = endTime - now;
    
    if (secondsRemaining <= 0) return "Auction ended";
    
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    
    return `${hours}h ${minutes}m remaining`;
  };
  
  // Fetch active auctions
  useEffect(() => {
    const fetchAuctions = async () => {
      if (!nftContract || !marketplaceContract) return;
      
      try {
        setLoading(true);
        
        // Get count of active auctions from contract
        const auctionCount = await marketplaceContract.getActiveAuctionCount();
        
        // Array to store auction data
        const auctionsArray = [];
        
        for (let i = 1; i <= auctionCount; i++) {
          try {
            const auction = await marketplaceContract.auctions(i);
            
            // Check if auction is active
            if (auction && auction.active) {
              // Get the Pokemon data for this token
              const pokemon = await nftContract.pokemonData(auction.tokenId);
              
              // Get current highest bid and bidder
              const highestBid = auction.highestBid;
              const highestBidder = auction.highestBidder;
              
              auctionsArray.push({
                auctionId: i.toString(),
                tokenId: auction.tokenId.toString(),
                pokemonId: pokemon.pokemonId.toString(),
                name: pokemon.name,
                type: pokemon.pokemonType,
                rarity: pokemon.rarity,
                imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokemonId}.png`,
                startingPrice: ethers.formatEther(auction.startingPrice),
                currentBid: ethers.formatEther(highestBid),
                highestBidder: highestBidder,
                endTime: Number(auction.endTime),
                seller: auction.seller
              });
              
              // Initialize bid amount to slightly higher than current bid
              setBidAmount(prev => ({
                ...prev,
                [i.toString()]: (parseFloat(ethers.formatEther(highestBid)) * 1.1).toFixed(2)
              }));
            }
          } catch (error) {
            console.error(`Error fetching auction #${i}:`, error);
          }
        }
        
        setAuctions(auctionsArray);
      } catch (error) {
        console.error("Error fetching auctions:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAuctions();
    // Refresh auctions every 30 seconds
    const interval = setInterval(fetchAuctions, 30000);
    return () => clearInterval(interval);
  }, [nftContract, marketplaceContract, bidding]);
  
  const placeBid = async (auctionId, currentBid) => {
    if (!marketplaceContract || !account) {
      setBidResult("Please connect your wallet");
      return;
    }
    
    try {
      setBidding(auctionId);
      setBidResult(null);
      
      // Validate bid amount
      const bidValue = bidAmount[auctionId];
      if (!bidValue || parseFloat(bidValue) <= parseFloat(currentBid)) {
        setBidResult("Error: Bid must be higher than current highest bid");
        return;
      }
      
      // Convert bid amount to wei
      const bidInWei = ethers.parseEther(bidValue);
      
      // Place bid
      console.log(`Placing bid of ${bidValue} ETH on auction #${auctionId}...`);
      const tx = await marketplaceContract.placeBid(auctionId, {
        value: bidInWei
      });
      await tx.wait();
      
      setBidResult(`Successfully placed bid of ${bidValue} ETH!`);
      
      // Update auctions to reflect new bid
      setAuctions(prevAuctions => 
        prevAuctions.map(auction => 
          auction.auctionId === auctionId 
            ? { 
                ...auction, 
                currentBid: bidValue,
                highestBidder: account 
              } 
            : auction
        )
      );
    } catch (error) {
      console.error("Error placing bid:", error);
      setBidResult(handleContractError(error));
    } finally {
      setBidding(null);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Pokémon Auctions</h2>
      
      {loading ? (
        <p className="text-center py-4">Loading auctions...</p>
      ) : auctions.length === 0 ? (
        <div className="text-center py-4 border rounded-lg bg-gray-50">
          <p className="mb-3">No active auctions at the moment.</p>
          <a href="/my-collection" className="text-blue-600 hover:underline">
            Create an auction
          </a>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {auctions.map((auction) => (
              <div 
                key={auction.auctionId}
                className="border rounded-lg p-4 flex flex-col"
              >
                <div className="bg-gray-50 rounded-lg p-3 mb-3 flex-grow">
                  <img 
                    src={auction.imageUrl} 
                    alt={auction.name} 
                    className="h-32 w-32 object-contain mx-auto"
                  />
                </div>
                
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{auction.name}</h3>
                  <p className="text-sm text-gray-600">{auction.type} • {auction.rarity}</p>
                  <p className="text-sm mb-2">Token #{auction.tokenId}</p>
                  
                  <div className="bg-purple-50 rounded-lg py-2 px-3 mb-3">
                    <p className="font-medium text-purple-800">Current bid: {auction.currentBid} ETH</p>
                    <p className="text-sm text-purple-600">
                      {formatTimeRemaining(auction.endTime)}
                    </p>
                  </div>
                  
                  {account && auction.seller.toLowerCase() === account.toLowerCase() ? (
                    <p className="text-sm text-gray-500 italic">You own this auction</p>
                  ) : account && auction.highestBidder.toLowerCase() === account.toLowerCase() ? (
                    <p className="text-sm text-green-600 font-medium">You are the highest bidder!</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex">
                        <input
                          type="number"
                          step="0.01"
                          min={parseFloat(auction.currentBid) + 0.01}
                          value={bidAmount[auction.auctionId] || ''}
                          onChange={(e) => setBidAmount(prev => ({
                            ...prev,
                            [auction.auctionId]: e.target.value
                          }))}
                          className="p-2 border rounded-l flex-1"
                          placeholder="ETH amount"
                        />
                        <button
                          onClick={() => placeBid(auction.auctionId, auction.currentBid)}
                          disabled={bidding !== null}
                          className="py-2 px-4 bg-purple-600 text-white rounded-r hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {bidding === auction.auctionId ? 'Bidding...' : 'Place Bid'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Minimum bid: {(parseFloat(auction.currentBid) + 0.01).toFixed(2)} ETH
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {bidResult && (
            <div className={`p-3 rounded mt-6 ${
              bidResult.includes('Error') 
                ? 'bg-red-50 text-red-800' 
                : 'bg-green-50 text-green-800'
            }`}>
              {bidResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}