'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';
import Link from 'next/link';

export default function AuctionsPage() {
  const { account, nftContract, marketplaceContract, connectWallet, isConnecting } = useWeb3();
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
    
    const days = Math.floor(secondsRemaining / 86400);
    const hours = Math.floor((secondsRemaining % 86400) / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else {
      return `${hours}h ${minutes}m remaining`;
    }
  };
  
  // Fetch active auctions
  useEffect(() => {
    const fetchAuctions = async () => {
      if (!nftContract || !marketplaceContract) return;
      
      try {
        setLoading(true);
        
        // Get count of active listings
        let listingCount;
        try {
          listingCount = await marketplaceContract.getActiveListingCount();
          console.log("Active listing count:", listingCount.toString());
        } catch (error) {
          console.error("Error getting active listing count:", error);
          // Fallback: try iterating through a reasonable number of listing IDs
          listingCount = 100; // Reasonable maximum to check
        }
        
        // Array to store auction data
        const auctionsArray = [];
        
        // Loop through all listings
        for (let i = 1; i <= listingCount; i++) {
          try {
            const listing = await marketplaceContract.listings(i);
            
            // Debug log
            console.log(`Listing #${i}:`, {
              status: Number(listing.status),
              type: Number(listing.listingType),
              endTime: Number(listing.auctionEndTime),
              highestBid: listing.highestBid ? listing.highestBid.toString() : '0',
              tokenId: listing.tokenId.toString()
            });
            
            // Check if listing is active (status = 0) and is an auction (listingType = 1)
            if (listing && Number(listing.status) === 0 && Number(listing.listingType) === 1) {
              console.log(`Found auction #${i} for token ${listing.tokenId}`);
              
              // Get the Pokemon data for this token
              const pokemon = await nftContract.pokemonData(listing.tokenId);
              
              // Check if highestBid exists and is not zero
              // Using comparison instead of isZero() method
              const hasHighestBid = listing.highestBid && 
                  (typeof listing.highestBid === 'bigint' ? 
                    listing.highestBid !== 0n : 
                    listing.highestBid.toString() !== '0');
              
              // Calculate current highest bid - either the highest bid or starting price
              const currentBidValue = hasHighestBid ? listing.highestBid : listing.price;
              
              auctionsArray.push({
                auctionId: i.toString(),
                tokenId: listing.tokenId.toString(),
                pokemonId: pokemon.pokemonId.toString(),
                name: pokemon.name,
                type: pokemon.pokemonType,
                rarity: pokemon.rarity,
                imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokemonId}.png`,
                startingPrice: ethers.formatEther(listing.price),
                currentBid: ethers.formatEther(currentBidValue),
                highestBidder: listing.highestBidder,
                endTime: Number(listing.auctionEndTime),
                seller: listing.seller
              });
              
              // Initialize bid amount to slightly higher than current bid
              setBidAmount(prev => ({
                ...prev,
                [i.toString()]: (parseFloat(ethers.formatEther(currentBidValue)) * 1.1).toFixed(2)
              }));
            }
          } catch (error) {
            console.error(`Error fetching listing #${i}:`, error);
            // If we've gone past the last listing, break
            if (error.message && (
              error.message.includes("invalid array length") || 
              error.message.includes("out of bounds") ||
              error.message.includes("invalid storage location")
            )) {
              break;
            }
          }
        }
        
        console.log("Auctions found:", auctionsArray.length);
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
      setBidResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBidding(null);
    }
  };
  
  const finalizeAuction = async (auctionId) => {
    if (!marketplaceContract || !account) {
      setBidResult("Please connect your wallet");
      return;
    }
    
    try {
      setBidding(auctionId);
      setBidResult(null);
      
      console.log(`Finalizing auction #${auctionId}...`);
      const tx = await marketplaceContract.finalizeAuction(auctionId);
      await tx.wait();
      
      setBidResult(`Successfully finalized auction!`);
      
      // Remove this auction from the UI
      setAuctions(prevAuctions => 
        prevAuctions.filter(auction => auction.auctionId !== auctionId)
      );
    } catch (error) {
      console.error("Error finalizing auction:", error);
      setBidResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBidding(null);
    }
  };
  
  return (
    <div>
      {/* <h1 className="text-3xl font-bold mb-6 text-center">Pokémon Auctions</h1> */}
{/*       
      {!account ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-2xl mx-auto mb-8">
          <p className="text-xl mb-4">Connect your wallet to bid on Pokémon</p>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : null} */}
      
      <div className="bg-white p-6 rounded-lg shadow-md mt-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Active Auctions</h2>
          <Link 
            href="/marketplace" 
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            View Fixed-Price Listings →
          </Link>
        </div>
        
        {loading ? (
          <p className="text-center py-4">Loading auctions...</p>
        ) : auctions.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-gray-50">
            <p className="mb-3 text-lg">No active auctions at the moment.</p>
            <Link href="/my-collection" className="text-purple-600 hover:underline font-medium">
              Create an auction →
            </Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {auctions.map((auction) => {
                const now = Math.floor(Date.now() / 1000);
                const isEnded = now >= auction.endTime;
                
                return (
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
                      
                      <div className={`rounded-lg py-2 px-3 mb-3 ${
                        isEnded ? 'bg-gray-100' : 'bg-purple-50'
                      }`}>
                        <p className={`font-medium ${
                          isEnded ? 'text-gray-800' : 'text-purple-800'
                        }`}>
                          {/* {isEnded ? "Final bid:" : "Current bid:"} {auction.currentBid} ETH */}
                        </p>
                        <p className={`text-sm ${
                          isEnded ? 'text-gray-600' : 'text-purple-600'
                        }`}>
                          {formatTimeRemaining(auction.endTime)}
                        </p>
                      </div>
                      
                      {account && auction.seller.toLowerCase() === account.toLowerCase() ? (
                        <div>
                          <p className="text-sm text-gray-500 italic mb-2">You created this auction</p>
                          {isEnded && (
                            <button
                              onClick={() => finalizeAuction(auction.auctionId)}
                              disabled={bidding !== null}
                              className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {bidding === auction.auctionId ? 'Processing...' : 'Finalize Auction'}
                            </button>
                          )}
                        </div>
                      ) : account && auction.highestBidder && auction.highestBidder.toLowerCase() === account.toLowerCase() ? (
                        <div>
                          <p className="text-sm text-green-600 font-medium mb-2">You are the highest bidder!</p>
                          {isEnded && (
                            <button
                              onClick={() => finalizeAuction(auction.auctionId)}
                              disabled={bidding !== null}
                              className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {bidding === auction.auctionId ? 'Processing...' : 'Claim Your Pokémon'}
                            </button>
                          )}
                        </div>
                      ) : isEnded ? (
                        <button
                          onClick={() => finalizeAuction(auction.auctionId)}
                          disabled={bidding !== null}
                          className="w-full py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {bidding === auction.auctionId ? 'Processing...' : 'Finalize Auction'}
                        </button>
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
                );
              })}
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
    </div>
  );
}