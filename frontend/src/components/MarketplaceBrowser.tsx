'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

type ListedPokemon = {
  listingId: string;
  tokenId: string;
  pokemonId: string;
  name: string;
  type: string;
  rarity: string;
  imageUrl: string;
  price: string;
  seller: string;
};

export default function MarketplaceBrowser() {
  const { account, nftContract, marketplaceContract } = useWeb3();
  const [listedPokemon, setListedPokemon] = useState<ListedPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<string | null>(null);
  
  // Fetch active listings
  useEffect(() => {
    const fetchListings = async () => {
      if (!nftContract || !marketplaceContract) return;
      
      try {
        setLoading(true);
        
        // Get count of active listings
        let listingCount;
        try {
          listingCount = await marketplaceContract.getActiveListingCount();
        } catch (error) {
          console.error("Error getting active listing count:", error);
          
          // Fallback: try iterating through listings until we find none
          listingCount = 100; // Try a reasonable maximum
        }
        
        // Array to store listed Pokémon
        const listedPokemonArray: ListedPokemon[] = [];
        
        // Approach 1: Use the count and go through each listing
        for (let i = 1; i <= listingCount; i++) {
          try {
            const listing = await marketplaceContract.listings(i);
            
            // Check if listing is active (status = 0 typically means active)
            if (listing && Number(listing.status) === 0 && Number(listing.listingType) === 0) {
              // Only include fixed-price listings (type 0)
              // Get the Pokemon data for this token
              const pokemon = await nftContract.pokemonData(listing.tokenId);
              
              listedPokemonArray.push({
                listingId: i.toString(),
                tokenId: listing.tokenId.toString(),
                pokemonId: pokemon.pokemonId.toString(),
                name: pokemon.name,
                type: pokemon.pokemonType,
                rarity: pokemon.rarity,
                imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokemonId}.png`,
                price: ethers.formatEther(listing.price),
                seller: listing.seller
              });
            }
          } catch (error) {
            console.error(`Error fetching listing #${i}:`, error);
            
            // If we've gone past the actual number of listings, break out of the loop
            if (error.message && (
              error.message.includes("invalid array length") || 
              error.message.includes("invalid storage location")
            )) {
              break;
            }
          }
        }
        
        setListedPokemon(listedPokemonArray);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchListings();
  }, [nftContract, marketplaceContract, purchasing]);
  
  const purchasePokemon = async (listingId: string, price: string) => {
    if (!marketplaceContract || !account) {
      setPurchaseResult("Please connect your wallet");
      return;
    }
    
    try {
      setPurchasing(listingId);
      setPurchaseResult(null);
      
      // Convert price from ETH to wei
      const priceInWei = ethers.parseEther(price);
      
      // Purchase the listing
      console.log(`Purchasing listing #${listingId} for ${price} ETH...`);
      const tx = await marketplaceContract.buyListing(listingId, {
        value: priceInWei
      });
      await tx.wait();
      
      setPurchaseResult(`Successfully purchased Pokémon for ${price} ETH!`);
      
      // Remove this listing from the UI
      setListedPokemon(prevListings => 
        prevListings.filter(listing => listing.listingId !== listingId)
      );
    } catch (error) {
      console.error("Error purchasing Pokémon:", error);
      
      // Check for specific errors
      if (error.message && error.message.includes("insufficient funds")) {
        setPurchaseResult("Error: You don't have enough ETH to purchase this Pokémon");
      } else if (error.message && error.message.includes("Listing is not active")) {
        setPurchaseResult("Error: This listing is no longer active");
      } else {
        setPurchaseResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setPurchasing(null);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Pokémon Marketplace</h2>
      
      {loading ? (
        <p className="text-center py-4">Loading marketplace listings...</p>
      ) : listedPokemon.length === 0 ? (
        <div className="text-center py-4 border rounded-lg bg-gray-50">
          <p className="mb-3">No Pokémon are currently listed for sale.</p>
          <a href="/my-collection" className="text-blue-600 hover:underline">
            List your Pokémon for sale
          </a>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {listedPokemon.map((pokemon) => (
              <div 
                key={pokemon.listingId}
                className="border rounded-lg p-4 flex flex-col"
              >
                <div className="bg-gray-50 rounded-lg p-3 mb-3 flex-grow">
                  <img 
                    src={pokemon.imageUrl} 
                    alt={pokemon.name} 
                    className="h-32 w-32 object-contain mx-auto"
                  />
                </div>
                
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{pokemon.name}</h3>
                  <p className="text-sm text-gray-600">{pokemon.type} • {pokemon.rarity}</p>
                  <p className="text-sm mb-2">Token #{pokemon.tokenId}</p>
                  
                  <div className="bg-blue-50 rounded-lg py-2 px-3 mb-3">
                    <p className="font-medium text-blue-800">{pokemon.price} ETH</p>
                  </div>
                  
                  {account && pokemon.seller.toLowerCase() === account.toLowerCase() ? (
                    <p className="text-sm text-gray-500 italic">You own this listing</p>
                  ) : (
                    <button
                      onClick={() => purchasePokemon(pokemon.listingId, pokemon.price)}
                      disabled={purchasing !== null}
                      className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {purchasing === pokemon.listingId ? 'Purchasing...' : 'Buy Now'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {purchaseResult && (
            <div className={`p-3 rounded mt-6 ${
              purchaseResult.includes('Error') 
                ? 'bg-red-50 text-red-800' 
                : 'bg-green-50 text-green-800'
            }`}>
              {purchaseResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}