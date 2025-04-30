'use client';

import { useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';

export default function SimpleMinter() {
  const { nftContract, account } = useWeb3();
  const [isMinting, setIsMinting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [pokemonIndex, setPokemonIndex] = useState<number>(0);
  
  const mintPokemon = async () => {
    if (!nftContract || !account) {
      setResult("Please connect your wallet first");
      return;
    }
    
    try {
      setIsMinting(true);
      setResult(null);
      
      console.log("Minting with account:", account);
      console.log("Contract target:", nftContract.target);

      // Try the mintPokemon function first
      const tx = await nftContract.mintPokemon(pokemonIndex, account);
      await tx.wait();
      
      setResult(`Successfully minted Pokémon #${pokemonIndex}!`);
    } catch (mintError) {
      console.error("Error with mintPokemon:", mintError);
      
      try {
        // If that fails, try the simpleMint function
        console.log("Trying simpleMint instead...");
        const tx = await nftContract.simpleMint(account);
        await tx.wait();
        
        setResult("Successfully minted a Pokémon using simpleMint!");
      } catch (error) {
        console.error("Error with simpleMint:", error);
        setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsMinting(false);
    }
  };
  
  const checkPokemonCount = async () => {
    if (!nftContract) {
      setResult("Please connect your wallet first");
      return;
    }
    
    try {
      const count = await nftContract.getAvailablePokemonCount();
      setResult(`There are ${count.toString()} available Pokémon types`);
    } catch (error) {
      console.error("Error checking Pokémon count:", error);
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Mint a Pokémon</h2>
      
      <div className="mb-6">
        <div className="flex items-end space-x-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pokémon Index
            </label>
            <input 
              type="number" 
              min="0"
              value={pokemonIndex}
              onChange={(e) => setPokemonIndex(parseInt(e.target.value))}
              className="p-2 border rounded w-20"
            />
          </div>
          
          <button
            onClick={mintPokemon}
            disabled={isMinting || !account}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
          >
            {isMinting ? 'Minting...' : 'Mint Pokémon'}
          </button>
          
          <button
            onClick={checkPokemonCount}
            disabled={!account}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            Check Pokémon Count
          </button>
        </div>
      </div>
      
      {result && (
        <div className={`p-3 rounded ${result.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
          {result}
        </div>
      )}
      
      {!account && (
        <p className="mt-4 text-red-600">
          Please connect your wallet to mint Pokémon.
        </p>
      )}
    </div>
  );
}
