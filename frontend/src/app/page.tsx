'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useWeb3 } from '@/contexts/Web3Context';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// MintPokemon Component
function MintPokemon() {
  const { nftContract, account } = useWeb3();
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<string | null>(null);
  const [pokemonIndex, setPokemonIndex] = useState<number>(0);
  const [pokemonCount, setPokemonCount] = useState<number>(0);
  
  // Get the available Pokémon count when the component loads
  useEffect(() => {
    
    const getCount = async () => {
      if (nftContract) {
        console.log('Nft contract:',nftContract)
        try {
          const count = await nftContract.getAvailablePokemonCount();
          setPokemonCount(count);
        } catch (error) {
          console.error("Error getting Pokémon count:", error);
        }
      }
    };
    
    getCount();
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
      const tx = await nftContract.mintPokemon(pokemonIndex, account);
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      // Get the event from the transaction receipt
      const event = receipt.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'PokemonMinted'
      );
      
      setMintResult(`Successfully minted Pokémon #${pokemonIndex}!`);
    } catch (error) {
      console.error("Error minting Pokémon:", error);
      setMintResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
      
      // Try with a different parameter order or without parameters
      // Some implementations might not require recipient as parameter
      try {
        // First attempt - standard implementation
        const tx = await nftContract.mintRandomPokemon(account, {
          value: ethers.parseEther("0.01")
        });
        
        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        setMintResult("Successfully minted a random Pokémon!");
        return;
      } catch (firstError) {
        console.error("First attempt failed:", firstError);
        
        // Second attempt - try without recipient
        try {
          const tx = await nftContract.mintRandomPokemon({
            value: ethers.parseEther("0.01")
          });
          
          // Wait for the transaction to be mined
          const receipt = await tx.wait();
          setMintResult("Successfully minted a random Pokémon (second attempt)!");
          return;
        } catch (secondError) {
          console.error("Second attempt failed:", secondError);
          throw secondError;
        }
      }
    } catch (error) {
      console.error("Error minting random Pokémon:", error);
      setMintResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsMinting(false);
    }
  };
  
  // Display contract addresses for debugging
  const displayContractAddress = nftContract ? nftContract.target : "Not connected";
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Mint a Pokémon Card</h2>
      
      {!account ? (
        <p className="text-red-600 mb-4">Please connect your wallet to mint Pokémon cards</p>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-2">Connected to NFT contract: {displayContractAddress}</p>
          <p className="mb-4">Available Pokémon types: {pokemonCount ? pokemonCount.toString() : '0'}</p>
          
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
                  {isMinting ? 'Minting...' : 'Mint Pokémon'}
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
                {isMinting ? 'Minting...' : 'Mint Random (0.01 ETH)'}
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

// AccountDisplay Component
function AccountDisplay() {
  const { account } = useWeb3();
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-2">Wallet Status</h2>
      {account ? (
        <div className="flex items-center">
          <div className="bg-green-500 rounded-full h-3 w-3 mr-2"></div>
          <p>Connected: {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}</p>
        </div>
      ) : (
        <div className="flex items-center">
          <div className="bg-red-500 rounded-full h-3 w-3 mr-2"></div>
          <p>No wallet connected</p>
        </div>
      )}
    </div>
  );
}

// Import AddressChecker component
import AddressChecker from '@/components/AddressChecker';

export default function Home() {
  const { account } = useWeb3();
  
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to Pokémon NFT Trading Platform</h1>
      <p className="text-xl mb-8">Collect, trade, and own your favorite Pokémon as NFTs</p>
      
      <AccountDisplay />
      <AddressChecker />
      
      <div className="flex flex-col md:flex-row justify-center gap-6 max-w-4xl mx-auto">
        <Link 
          href="/marketplace"
          className="bg-blue-600 text-white p-6 rounded-lg shadow-md hover:bg-blue-700 transition flex-1"
        >
          <h2 className="text-2xl font-bold mb-3">Browse Marketplace</h2>
          <p>Discover and purchase Pokémon cards from other trainers</p>
        </Link>
        
        <Link 
          href="/my-collection"
          className="bg-green-600 text-white p-6 rounded-lg shadow-md hover:bg-green-700 transition flex-1"
        >
          <h2 className="text-2xl font-bold mb-3">My Collection</h2>
          <p>View your Pokémon card collection and list cards for sale</p>
        </Link>
      </div>
      
      <MintPokemon />
      
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Featured Pokémon</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {/* Placeholder for featured Pokémon - would be dynamic in final version */}
          {[1, 4, 7, 25].map((id) => (
            <div key={id} className="bg-white p-4 rounded-lg shadow-md">
              <div className="bg-gray-100 h-40 w-full rounded flex items-center justify-center">
                <img 
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`}
                  alt={`Pokemon #${id}`}
                  className="h-32 w-32 object-contain"
                />
              </div>
              <p className="mt-2 font-medium">
                {id === 1 ? "Bulbasaur" : 
                 id === 4 ? "Charmander" : 
                 id === 7 ? "Squirtle" : 
                 id === 25 ? "Pikachu" : `Pokémon #${id}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}