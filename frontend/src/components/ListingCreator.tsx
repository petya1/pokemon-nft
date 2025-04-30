'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

type OwnedPokemon = {
  tokenId: string;
  pokemonId: string;
  name: string;
  type: string;
  rarity: string;
  imageUrl: string;
  isListed: boolean;
};

export default function ListingCreator() {
  const { account, nftContract, marketplaceContract } = useWeb3();
  const [ownedPokemon, setOwnedPokemon] = useState<OwnedPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [price, setPrice] = useState<string>('0.1');
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [listingResult, setListingResult] = useState<string | null>(null);
  
  // Fetch user's owned Pokémon
  useEffect(() => {
    const fetchOwnedPokemon = async () => {
      if (!nftContract || !account || !marketplaceContract) return;
      
      try {
        setLoading(true);
        
        // Get the balance of the user (how many tokens they own)
        const balance = await nftContract.balanceOf(account);
        
        // Array to store owned Pokémon
        const ownedPokemonArray: OwnedPokemon[] = [];
        
        // Loop through each token owned by the user
        for (let i = 0; i < Number(balance); i++) {
          try {
            // Get the token ID at index i in the user's collection
            const tokenId = await nftContract.tokenOfOwnerByIndex(account, i);
            
            // Get the Pokémon data for this token
            const pokemon = await nftContract.pokemonData(tokenId);
            
            // Check if this token is already listed
            let isListed = false;
            try {
              isListed = await marketplaceContract.isTokenListed(tokenId);
            } catch (error) {
              console.log("Error checking if token is listed:", error);
              // Alternative approach if isTokenListed doesn't exist
              try {
                // Try to get the listing ID from tokenId mapping
                const listingId = await marketplaceContract.tokenIdToListingId(tokenId);
                if (Number(listingId) > 0) {
                  const listing = await marketplaceContract.listings(listingId);
                  // Check if listing is active (status = 0)
                  isListed = listing && listing.status === 0;
                }
              } catch (mapError) {
                console.log("Error checking mapping:", mapError);
              }
            }
            
            // Add the Pokémon to the owned array if it's not listed
            ownedPokemonArray.push({
              tokenId: tokenId.toString(),
              pokemonId: pokemon.pokemonId.toString(),
              name: pokemon.name,
              type: pokemon.pokemonType,
              rarity: pokemon.rarity,
              imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokemonId}.png`,
              isListed: isListed
            });
          } catch (error) {
            console.error(`Error fetching token #${i}:`, error);
          }
        }
        
        setOwnedPokemon(ownedPokemonArray);
      } catch (error) {
        console.error("Error fetching owned Pokémon:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOwnedPokemon();
  }, [nftContract, account, marketplaceContract]);
  
  const createListing = async () => {
    if (!nftContract || !marketplaceContract || !account || !selectedToken) {
      setListingResult("Please connect your wallet and select a Pokémon");
      return;
    }
    
    try {
      setIsCreatingListing(true);
      setListingResult(null);
      
      // First, approve the marketplace contract to transfer this token
      console.log("Approving marketplace to transfer token...");
      const approvalTx = await nftContract.approve(
        await marketplaceContract.getAddress(),
        selectedToken
      );
      await approvalTx.wait();
      console.log("Approval confirmed");
      
      // Convert price from ETH to wei
      const priceInWei = ethers.parseEther(price);
      
      // Create the listing
      console.log("Creating listing...");
      const tx = await marketplaceContract.createListing(selectedToken, priceInWei);
      await tx.wait();
      
      setListingResult(`Successfully listed Pokémon for ${price} ETH!`);
      
      // Update the UI to show this token is now listed
      setOwnedPokemon(prevState => 
        prevState.map(pokemon => 
          pokemon.tokenId === selectedToken 
            ? { ...pokemon, isListed: true } 
            : pokemon
        )
      );
      
      // Reset selected token
      setSelectedToken('');
    } catch (error) {
      console.error("Error creating listing:", error);
      
      // Check for specific errors
      if (error.message && error.message.includes("Marketplace not approved")) {
        setListingResult("Error: Marketplace needs approval to transfer your Pokémon");
      } else if (error.message && error.message.includes("already listed")) {
        setListingResult("Error: This Pokémon is already listed for sale");
      } else {
        setListingResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsCreatingListing(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">List a Pokémon for Sale</h2>
      
      {!account ? (
        <p className="text-red-600 mb-4">Please connect your wallet to list Pokémon</p>
      ) : loading ? (
        <p className="text-center py-4">Loading your Pokémon collection...</p>
      ) : ownedPokemon.length === 0 ? (
        <div className="text-center py-4">
          <p className="mb-3">You don't own any Pokémon cards yet.</p>
          <a href="/" className="text-blue-600 hover:underline">Mint some Pokémon first</a>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Your Pokémon Collection</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ownedPokemon.map((pokemon) => (
                <div 
                  key={pokemon.tokenId}
                  onClick={() => !pokemon.isListed && setSelectedToken(pokemon.tokenId)}
                  className={`border rounded-lg p-2 text-center cursor-pointer transition ${
                    pokemon.isListed 
                      ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                      : selectedToken === pokemon.tokenId 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-gray-400'
                  }`}
                >
                  <div className="bg-gray-50 rounded-lg p-2 mb-2">
                    <img 
                      src={pokemon.imageUrl} 
                      alt={pokemon.name} 
                      className="h-20 w-20 object-contain mx-auto"
                    />
                  </div>
                  <p className="font-medium">{pokemon.name}</p>
                  <p className="text-xs text-gray-500">Token #{pokemon.tokenId}</p>
                  {pokemon.isListed && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full mt-1 inline-block">
                      Listed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Create Listing</h3>
            
            {selectedToken ? (
              <div>
                <p className="mb-2">
                  Selected Pokémon: {ownedPokemon.find(p => p.tokenId === selectedToken)?.name} 
                  (Token #{selectedToken})
                </p>
                
                <div className="flex items-end gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (ETH)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="p-2 border rounded w-full"
                    />
                  </div>
                  
                  <button
                    onClick={createListing}
                    disabled={isCreatingListing}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingListing ? 'Creating Listing...' : 'List for Sale'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Select a Pokémon above to list it for sale
              </p>
            )}
          </div>
          
          {listingResult && (
            <div className={`p-3 rounded mt-4 ${
              listingResult.includes('Error') 
                ? 'bg-red-50 text-red-800' 
                : 'bg-green-50 text-green-800'
            }`}>
              {listingResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}