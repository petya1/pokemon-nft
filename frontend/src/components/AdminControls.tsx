// src/components/AdminControls.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';

export default function AdminControls() {
  const { account, nftContract, isPaused, isOwner } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const togglePause = async () => {
    if (!nftContract || !isOwner) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      // Check which function the contract has (pause or unpause)
      let tx;
      
      if (isPaused) {
        try {
          tx = await nftContract.unpause();
        } catch (error) {
          console.error("Error unpausing:", error);
          tx = await nftContract.setActive(true);
        }
      } else {
        try {
          tx = await nftContract.pause();
        } catch (error) {
          console.error("Error pausing:", error);
          tx = await nftContract.setActive(false);
        }
      }
      
      await tx.wait();
      setResult(`Contract successfully ${isPaused ? 'unpaused' : 'paused'}`);
    } catch (error) {
      console.error("Error toggling pause:", error);
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to withdraw contract funds (if available)
  const withdrawFunds = async () => {
    if (!nftContract || !isOwner) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      // Try multiple withdraw function names that might exist
      let tx;
      
      try {
        tx = await nftContract.withdraw();
      } catch (error) {
        console.log("withdraw() not available, trying withdrawFunds()");
        try {
          tx = await nftContract.withdrawFunds();
        } catch (error) {
          console.log("withdrawFunds() not available, trying withdrawAll()");
          tx = await nftContract.withdrawAll();
        }
      }
      
      await tx.wait();
      setResult("Funds successfully withdrawn to owner");
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOwner) return null;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-2">Admin Controls</h2>
      <p className="text-sm text-gray-500 mb-4">
        These controls are only available to the contract owner.
      </p>
      
      <div className="flex items-center mb-4">
        <div className={`h-3 w-3 rounded-full mr-2 ${isPaused ? 'bg-red-500' : 'bg-green-500'}`}></div>
        <p>Contract Status: {isPaused ? 'Paused' : 'Active'}</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={togglePause}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-white flex-1 ${
            isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
          } disabled:opacity-50`}
        >
          {loading ? 'Processing...' : isPaused ? 'Unpause Contract' : 'Pause Contract'}
        </button>
        
        <button
          onClick={withdrawFunds}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex-1"
        >
          {loading ? 'Processing...' : 'Withdraw Funds'}
        </button>
      </div>
      
      {result && (
        <div className={`mt-4 p-3 rounded ${result.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {result}
        </div>
      )}
    </div>
  );
}