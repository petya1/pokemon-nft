// src/components/SecureListingCreator.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { ethers } from 'ethers';

export default function SecureListingCreator() {
  const { account, nftContract, marketplaceContract } = useWeb3();
  const [ownedPokemon, setOwnedPokemon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState('');
  const [price, setPrice] = useState('0.1');
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [listingResult, setListingResult] = useState(null);
  const [commitmentPhase, setCommitmentPhase] = useState(false);
  const [commitmentHash, setCommitmentHash] = useState('');
  const [waitingPeriod, setWaitingPeriod] = useState(false);
  const [timer, setTimer] = useState(0);
  
  // Fetch owned Pokémon (similar to your existing code)
  useEffect(() => {
    // ... (keep your existing code)
  }, [nftContract, account, marketplaceContract]);
  
  // Timer countdown effect
  useEffect(() => {
    let interval;
    if (waitingPeriod && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
    } else if (waitingPeriod && timer === 0) {
      setWaitingPeriod(false);
      setCommitmentPhase(false);
    }
    
    return () => clearInterval(interval);
  }, [waitingPeriod, timer]);
  
  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Step 1: Create commitment hash
  const createCommitment = async () => {
    if (!marketplaceContract || !account || !selectedToken) {
      setListingResult("Please connect your wallet and select a Pokémon");
      return;
    }
    
    try {
      setIsCreatingListing(true);
      setListingResult(null);
      
      // Generate a random salt
      const salt = ethers.hexlify(ethers.randomBytes(32));
      
      // Create hash of token ID, price, and salt
      const priceInWei = ethers.parseEther(price);
      const abiCoder = new ethers.AbiCoder();
      const commitmentData = abiCoder.encode(
        ['uint256', 'uint256', 'bytes32'],
        [selectedToken, priceInWei, salt]
      );
      
      const hash = ethers.keccak256(commitmentData);
      
      // Store the hash and salt for later reveal
      localStorage.setItem(`listing-salt-${selectedToken}`, salt);
      localStorage.setItem(`listing-price-${selectedToken}`, price);
      
      // Submit the commitment to the blockchain
      const tx = await marketplaceContract.commitToListing(hash);
      await tx.wait();
      
      setCommitmentHash(hash);
      setCommitmentPhase(true);
      setWaitingPeriod(true);
      setTimer(300); // 5 minutes waiting period
      setListingResult("Commitment submitted! Please wait for the reveal phase.");
    } catch (error) {
      console.error("Error creating commitment:", error);
      setListingResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCreatingListing(false);
    }
  };
  
  // Step 2: Reveal commitment and create listing
  const revealAndCreateListing = async () => {
    if (!marketplaceContract || !account || !selectedToken || !commitmentHash) {
      setListingResult("Invalid state for reveal. Please try again from the beginning.");
      return;
    }
    
    try {
      setIsCreatingListing(true);
      setListingResult(null);
      
      // Retrieve salt and confirm price
      const salt = localStorage.getItem(`listing-salt-${selectedToken}`);
      const storedPrice = localStorage.getItem(`listing-price-${selectedToken}`);
      
      if (!salt || storedPrice !== price) {
        setListingResult("Error: Commitment data is missing or corrupted. Please start over.");
        return;
      }
      
      // First, approve the marketplace contract to transfer this token
      const approvalTx = await nftContract.approve(
        await marketplaceContract.getAddress(),
        selectedToken
      );
      await approvalTx.wait();
      
      // Convert price from ETH to wei
      const priceInWei = ethers.parseEther(price);
      
      // Reveal commitment and create listing
      const tx = await marketplaceContract.revealAndCreateListing(
        selectedToken,
        priceInWei,
        salt
      );
      await tx.wait();
      
      setListingResult(`Successfully listed Pokémon for ${price} ETH!`);
      
      // Update the UI
      setOwnedPokemon(prevState => 
        prevState.map(pokemon => 
          pokemon.tokenId === selectedToken 
            ? { ...pokemon, isListed: true } 
            : pokemon
        )
      );
      
      // Reset state
      setSelectedToken('');
      setCommitmentPhase(false);
      setWaitingPeriod(false);
      setCommitmentHash('');
      
      // Clean up localStorage
      localStorage.removeItem(`listing-salt-${selectedToken}`);
      localStorage.removeItem(`listing-price-${selectedToken}`);
    } catch (error) {
      console.error("Error revealing commitment:", error);
      setListingResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCreatingListing(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Secure Listing Creation (Front-running Protected)</h2>
      
      {/* Similar UI to your ListingCreator but with commitment/reveal flow */}
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
          {/* Pokemon selection UI (similar to your existing code) */}
          
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Create Secure Listing</h3>
            
            {commitmentPhase ? (
              <div>
                <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Waiting Period</h4>
                  <p className="text-yellow-700 mb-2">
                    To protect against front-running, there is a waiting period before you can 
                    complete your listing.
                  </p>
                  {waitingPeriod ? (
                    <p className="text-lg font-bold text-yellow-800">
                      Time remaining: {formatTime(timer)}
                    </p>
                  ) : (
                    <p className="text-green-700 font-medium">
                      Waiting period complete! You can now reveal your listing.
                    </p>
                  )}
                </div>
                
                <button
                  onClick={revealAndCreateListing}
                  disabled={isCreatingListing || waitingPeriod}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingListing ? 'Creating Listing...' : 'Reveal and Create Listing'}
                </button>
              </div>
            ) : selectedToken ? (
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
                    onClick={createCommitment}
                    disabled={isCreatingListing}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingListing ? 'Creating Commitment...' : 'Create Secure Listing'}
                  </button>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Front-Running Protection:</strong> This secure listing method uses a 
                    commit-reveal scheme to protect against front-running attacks. First, you'll commit 
                    to your listing details without revealing the price. After a waiting period, 
                    you'll confirm the listing.
                  </p>
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