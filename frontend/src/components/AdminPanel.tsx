// src/components/AdminPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';

export default function AdminPanel() {
  const { account, marketplaceContract } = useWeb3();
  const [isOwner, setIsOwner] = useState(false);
  const [isEmergencyStop, setIsEmergencyStop] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  
  useEffect(() => {
    const checkOwner = async () => {
      if (!marketplaceContract || !account) return;
      
      try {
        setIsLoading(true);
        
        // Check if current account is the owner
        const owner = await marketplaceContract.owner();
        setIsOwner(owner.toLowerCase() === account.toLowerCase());
        
        // Check current emergency stop status
        const emergencyStop = await marketplaceContract.emergencyStop();
        setIsEmergencyStop(emergencyStop);
      } catch (error) {
        console.error("Error checking admin status:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkOwner();
  }, [marketplaceContract, account]);
  
  const toggleEmergencyStop = async () => {
    if (!marketplaceContract) return;
    
    try {
      setActionInProgress(true);
      setActionResult(null);
      
      console.log("Toggling emergency stop...");
      const tx = await marketplaceContract.toggleEmergencyStop();
      await tx.wait();
      
      // Update the state
      const newStatus = await marketplaceContract.emergencyStop();
      setIsEmergencyStop(newStatus);
      
      setActionResult(`Successfully ${newStatus ? "paused" : "resumed"} the contract!`);
    } catch (error) {
      console.error("Error toggling emergency stop:", error);
      setActionResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setActionInProgress(false);
    }
  };
  
  const withdrawFees = async () => {
    if (!marketplaceContract) return;
    
    try {
      setActionInProgress(true);
      setActionResult(null);
      
      console.log("Withdrawing fees...");
      const tx = await marketplaceContract.withdrawFees();
      await tx.wait();
      
      setActionResult("Successfully withdrew fees!");
    } catch (error) {
      console.error("Error withdrawing fees:", error);
      setActionResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setActionInProgress(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-6 max-w-4xl mx-auto text-center">
        <p>Loading admin panel...</p>
      </div>
    );
  }
  
  if (!isOwner) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-6 max-w-4xl mx-auto text-center">
        <p className="text-red-600">Only the contract owner can access the admin panel.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-3">Emergency Controls</h3>
          <div className={`p-3 rounded mb-4 ${isEmergencyStop ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            <p className="font-medium">
              Contract Status: {isEmergencyStop ? "PAUSED" : "ACTIVE"}
            </p>
          </div>
          
          <button
            onClick={toggleEmergencyStop}
            disabled={actionInProgress}
            className={`w-full py-2 px-4 rounded font-medium ${
              isEmergencyStop 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50`}
          >
            {actionInProgress 
              ? 'Processing...' 
              : isEmergencyStop 
                ? 'Resume Contract' 
                : 'Pause Contract'
            }
          </button>
        </div>
        
        <div className="border rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-3">Financial Controls</h3>
          <button
            onClick={withdrawFees}
            disabled={actionInProgress}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {actionInProgress ? 'Processing...' : 'Withdraw Collected Fees'}
          </button>
        </div>
      </div>
      
      {actionResult && (
        <div className={`p-3 rounded mt-6 ${
          actionResult.includes('Error') 
            ? 'bg-red-50 text-red-800' 
            : 'bg-green-50 text-green-800'
        }`}>
          {actionResult}
        </div>
      )}
    </div>
  );
}