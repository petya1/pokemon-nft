// src/components/MintButton.tsx
'use client';

import { useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

export default function MintButton() {
  const { nftContract, account, resetProvider } = useWeb3();
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Super simple mint function - tries all possible mint methods
  const mintPokemon = async () => {
    if (!nftContract || !account) {
      setMintResult("Please connect your wallet first");
      return;
    }
    
    try {
      setIsMinting(true);
      setMintResult("Attempting to mint...");
      setErrorDetails(null);
      
      // Define the value to send - 0.01 ETH
      const options = {
        value: ethers.parseEther("0.01")
      };
      
      // Try all possible mint methods one by one
      let tx;
      let methodUsed = "";
      
      try {
        console.log("Trying simpleMint...");
        tx = await nftContract.simpleMint(options);
        methodUsed = "simpleMint";
      } catch (error1) {
        console.log("simpleMint failed. Error:", error1);
        setErrorDetails(prev => (prev || "") + "\nsimpleMint error: " + (error1 instanceof Error ? error1.message : String(error1)));
        
        try {
          console.log("Trying mintRandomPokemon...");
          tx = await nftContract.mintRandomPokemon(options);
          methodUsed = "mintRandomPokemon";
        } catch (error2) {
          console.log("mintRandomPokemon failed. Error:", error2);
          setErrorDetails(prev => (prev || "") + "\nmintRandomPokemon error: " + (error2 instanceof Error ? error2.message : String(error2)));
          
          try {
            console.log("Trying mintPokemon with index 0...");
            tx = await nftContract.mintPokemon(0, options);
            methodUsed = "mintPokemon(0)";
          } catch (error3) {
            console.log("mintPokemon(0) failed. Error:", error3);
            setErrorDetails(prev => (prev || "") + "\nmintPokemon error: " + (error3 instanceof Error ? error3.message : String(error3)));
            
            try {
              console.log("Trying mintPokemon with recipient...");
              tx = await nftContract.mintPokemon(0, account, options);
              methodUsed = "mintPokemon(0, account)";
            } catch (error4) {
              console.log("All mint attempts failed");
              throw new Error("All mint methods failed");
            }
          }
        }
      }
      
      // If we get here, one of the mint methods succeeded
      setMintResult(`Minting transaction sent using ${methodUsed}! Waiting for confirmation...`);
      
      // Wait for confirmation
      console.log("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      setMintResult(`Successfully minted a Pokémon! Transaction confirmed.`);
    } catch (error) {
      console.error("Mint failed:", error);
      
      // Check if it's a block number issue
      if (error.message && error.message.includes("invalid block tag")) {
        setMintResult("Network synchronization error. Resetting connection...");
        
        // Try to reset the provider
        await resetProvider();
        
        setMintResult("Connection reset. Please try minting again.");
      } else {
        setMintResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsMinting(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Mint a Pokémon</h2>
      
      <button
        onClick={mintPokemon}
        disabled={isMinting || !account}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isMinting ? 'Minting...' : 'Mint Pokémon (0.01 ETH)'}
      </button>
      
      {mintResult && (
        <div className={`p-4 mt-4 rounded-md ${
          mintResult.includes('Error') 
            ? 'bg-red-50 text-red-800' 
            : mintResult.includes('Waiting') 
              ? 'bg-yellow-50 text-yellow-800'
              : 'bg-green-50 text-green-800'
        }`}>
          <p>{mintResult}</p>
          
          {errorDetails && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium">Show error details</summary>
              <pre className="mt-2 text-xs overflow-auto p-2 bg-gray-100 rounded">
                {errorDetails}
              </pre>
            </details>
          )}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p className="mb-2">
          <strong>Note:</strong> This will attempt multiple mint methods to find one that works with your contract.
        </p>
        <p>
          After minting, check your NFT collection to view your new Pokémon.
        </p>
      </div>
    </div>
  );
}