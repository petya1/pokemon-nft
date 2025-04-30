'use client';

import { useWeb3 } from '@/contexts/Web3Context';
import { useEffect, useState } from 'react';

export default function AccountDisplay() {
  const { account } = useWeb3();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Force re-render every few seconds to ensure we have the latest account
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 3000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-2">Current Account</h2>
      {account ? (
        <div>
          <p className="text-gray-700 break-all">{account}</p>
          <p className="text-sm text-gray-500 mt-1">
            Last checked: {currentTime.toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <p className="text-red-500">No account connected</p>
      )}
    </div>
  );
}