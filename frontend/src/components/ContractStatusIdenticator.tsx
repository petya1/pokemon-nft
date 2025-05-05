// src/components/ContractStatusIndicator.tsx
'use client';

import { useEffect, useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';

export default function ContractStatusIndicator() {
  const { marketplaceContract } = useWeb3();
  const [isEmergencyStop, setIsEmergencyStop] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkStatus = async () => {
      if (!marketplaceContract) return;
      
      try {
        setIsLoading(true);
        const emergencyStop = await marketplaceContract.emergencyStop();
        setIsEmergencyStop(emergencyStop);
      } catch (error) {
        console.error("Error checking contract status:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkStatus();
    
    // Set up an interval to check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [marketplaceContract]);
  
  if (isLoading || !isEmergencyStop) return null;
  
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 max-w-4xl mx-auto">
      <div className="flex items-center">
        <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
        </svg>
        <p className="font-bold">Contract Paused</p>
      </div>
      <p className="text-sm mt-1">Trading functionality has been temporarily paused by the admin. Please check back later.</p>
    </div>
  );
}