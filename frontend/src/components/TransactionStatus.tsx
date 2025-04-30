// src/components/TransactionStatus.tsx
'use client';

import { useState, useEffect } from 'react';

type TransactionStatusProps = {
  tx: any; // ethers transaction
  onConfirm: (receipt: any) => void;
  title?: string;
};

export default function TransactionStatus({ tx, onConfirm, title = "Transaction" }: TransactionStatusProps) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [receipt, setReceipt] = useState<any>(null);
  const [confirmations, setConfirmations] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const trackTransaction = async () => {
      try {
        // Wait for transaction to be mined
        const receipt = await tx.wait(1); // Wait for 1 confirmation
        setReceipt(receipt);
        setStatus('confirmed');
        setConfirmations(1);
        onConfirm(receipt);
        
        // Continue tracking confirmations
        tx.wait(3).then(() => {
          setConfirmations(3);
        }).catch(error => {
          console.log("Error waiting for more confirmations:", error);
        });
      } catch (error) {
        console.error("Transaction failed:", error);
        setStatus('failed');
        setError(error instanceof Error ? error.message : String(error));
      }
    };
    
    trackTransaction();
  }, [tx, onConfirm]);
  
  return (
    <div className="border rounded-lg p-4 mt-4">
      <h3 className="font-medium text-lg mb-2">{title} Status</h3>
      
      <div className="space-y-2">
        <div className="flex items-center">
          <div className={`h-3 w-3 rounded-full mr-2 ${
            status === 'pending' ? 'bg-yellow-500' : 
            status === 'confirmed' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <p>
            {status === 'pending' ? 'Transaction pending...' : 
             status === 'confirmed' ? `Transaction confirmed (${confirmations}/3 confirmations)` : 
             'Transaction failed'}
          </p>
        </div>
        
        {receipt && (
          <div className="text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Transaction hash:</span>{' '}
              <a 
                href={`https://etherscan.io/tx/${receipt.hash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {receipt.hash}
              </a>
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Gas used:</span> {receipt.gasUsed.toString()}
            </p>
            {receipt.events && receipt.events.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Events:</p>
                <ul className="list-disc list-inside">
                  {receipt.events.map((event: any, index: number) => (
                    <li key={index} className="ml-2">
                      {event.fragment?.name || "Unknown Event"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 text-red-800 p-3 rounded text-sm mt-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}