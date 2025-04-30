'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

export default function MintPokemon() {
  const { nftContract, account } = useWeb3();
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<string | null>(null);
  const [pokemonIndex, setPokemonIndex] = useState<number>(0);
  const [pokemonCount, setPokemonCount] = useState<number>(0);
  const [mintPrice, setMintPrice] = useState<string>("0.01");
  const [availablePokemon, setAvailablePokemon] = useState<any[]>([]);
  
  // Get the available Pokémon count and mint price when the component loads
  useEffect(() => {
    const getContractInfo = async () => {
      if (nftContract) {
        try {
          // Get available Pokémon count
          const count = await nftContract.getAvailablePokemonCount();
          setPokemonCount(count);
          
          // Try to get mint price if the function exists
          try {
            const price = await nftContract.mintPrice();
            setMintPrice(ethers.formatEther(price));
          } catch (error) {
            console.log("Mint price function not available, using default");
          }
          
          // Get available Pokémon data for display
          const pokemonList = [];
          for (let i = 0; i < Number(count); i++) {
            try {
              const pokemon = await nftContract.availablePokemon(i);
              pokemonList.push({
                id: pokemon.pokemonId.toString(),
                name: pokemon.name,
                type: pokemon.pokemonType,
                rarity: pokemon.rarity,
                maxSupply: pokemon.maxSupply.toString(),
                currentSupply: pokemon.currentSupply.toString()
              });
            } catch (error) {
              console.error(`Error fetching Pokémon at index ${i}:`, error);
            }
          }
          setAvailablePokemon(pokemonList);
        } catch (error) {
          console.error("Error getting contract information:", error);
        }
      }
    };
    
    getContractInfo();
  }, [nftContract]);
  
  const mintPokemon = async () => {
    if (!nftContract || !account) {
      setMintResult("Please connect your wallet first");
      return;
    }
    
    try {
      setIsMinting(true);
      setMintResult(null);
      
      console.log("Minting Pokémon #" + pokemonIndex + " for " + account);
      
      // Send ETH with the transaction (used for both owner and non-owner versions)
      const tx = await nftContract.mintPokemon(pokemonIndex, account, {
        value: ethers.parseEther(mintPrice)
      });
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      setMintResult(`Successfully minted Pokémon #${pokemonIndex}!`);
      
      // Refresh Pokémon data after minting
      if (availablePokemon[pokemonIndex]) {
        try {
          const pokemon = await nftContract.availablePokemon(pokemonIndex);
          const updatedPokemon = [...availablePokemon];
          updatedPokemon[pokemonIndex] = {
            ...updatedPokemon[pokemonIndex],
            currentSupply: pokemon.currentSupply.toString()
          };
          setAvailablePokemon(updatedPokemon);
        } catch (error) {
          console.error("Error updating Pokémon data:", error);
        }
      }
    } catch (error) {
      console.error("Error minting Pokémon:", error);
      
      // More specific error messaging
      if (error.message && error.message.includes("onlyOwner")) {
        setMintResult("Error: Only the contract owner can mint specific Pokémon");
      } else if (error.message && error.message.includes("maximum supply")) {
        setMintResult("Error: This Pokémon has reached its maximum supply");
      } else {
        setMintResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsMinting(false);
    }
  };
  
  const mintRandomPokemon = async () => {
    if (!nftContract || !account) {
      setMintResult("Please connect your wallet first");
      return;
    }
    
    try {
      setIsMinting(true);
      setMintResult(null);
      
      console.log("Minting random Pokémon for " + account);
      console.log("NFT Contract address:", nftContract.target);
      
      // Try with and without recipient parameter
      try {
        // First attempt - pass recipient explicitly
        const tx = await nftContract.mintRandomPokemon(account, {
          value: ethers.parseEther(mintPrice)
        });
        
        const receipt = await tx.wait();
        setMintResult("Successfully minted a random Pokémon!");
      } catch (firstError) {
        console.error("First attempt failed:", firstError);
        
        // Second attempt - use msg.sender (don't pass recipient)
        try {
          const tx = await nftContract.mintRandomPokemon({
            value: ethers.parseEther(mintPrice)
          });
          
          const receipt = await tx.wait();
          setMintResult("Successfully minted a random Pokémon!");
        } catch (secondError) {
          console.error("Second attempt failed:", secondError);
          
          // Final attempt - try simpleMint
          try {
            const tx = await nftContract.simpleMint({
              value: ethers.parseEther(mintPrice)
            });
            
            const receipt = await tx.wait();
            setMintResult("Successfully minted a Pokémon using simpleMint!");
          } catch (thirdError) {
            console.error("Third attempt failed:", thirdError);
            throw thirdError;
          }
        }
      }
    } catch (error) {
      console.error("Error minting random Pokémon:", error);
      setMintResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsMinting(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Mint a Pokémon Card</h2>
      
      {!account ? (
        <p className="text-red-600 mb-4">Please connect your wallet to mint Pokémon cards</p>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-2">Connected to NFT contract: {nftContract?.target || "Not connected"}</p>
          <p className="mb-4">Available Pokémon types: {pokemonCount ? pokemonCount.toString() : '0'}</p>
          <p className="mb-4">Mint price: {mintPrice} ETH</p>
          
          {availablePokemon.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Available Pokémon:</h3>
              <div className="max-h-40 overflow-y-auto p-2 border rounded">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-1">Index</th>
                      <th className="p-1">Name</th>
                      <th className="p-1">Type</th>
                      <th className="p-1">Rarity</th>
                      <th className="p-1">Supply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availablePokemon.map((pokemon, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-1">{index}</td>
                        <td className="p-1">{pokemon.name}</td>
                        <td className="p-1">{pokemon.type}</td>
                        <td className="p-1">{pokemon.rarity}</td>
                        <td className="p-1">{pokemon.currentSupply}/{pokemon.maxSupply}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Mint Specific Pokémon</h3>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  max={pokemonCount ? Number(pokemonCount) - 1 : 0}
                  value={pokemonIndex}
                  onChange={(e) => setPokemonIndex(parseInt(e.target.value))}
                  className="p-2 border rounded w-20"
                />
                <button
                  onClick={mintPokemon}
                  disabled={isMinting || !pokemonCount || pokemonCount.toString() === "0"}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMinting ? 'Minting...' : `Mint (${mintPrice} ETH)`}
                </button>
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Mint Random Pokémon</h3>
              <button
                onClick={mintRandomPokemon}
                disabled={isMinting || !pokemonCount || pokemonCount.toString() === "0"}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMinting ? 'Minting...' : `Mint Random (${mintPrice} ETH)`}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {mintResult && (
        <div className={`p-3 rounded ${mintResult.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {mintResult}
        </div>
      )}
    </div>
  );
}