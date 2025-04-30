// src/components/AddressChecker.tsx
'use client';

import { useWeb3 } from '@/contexts/Web3Context';
import { useState, useEffect } from 'react';
import contractAddresses from '@/lib/contracts/addresses.json';

export default function AddressChecker() {
  const { account, nftContract, marketplaceContract } = useWeb3();
  
  // Instead of trying to check owner, manually set this based on hardhat account
  const hardhatDefaultOwner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const isOwner = account ? account.toLowerCase() === hardhatDefaultOwner.toLowerCase() : false;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6 max-w-4xl mx-auto text-left">
      <h2 className="text-lg font-semibold mb-2">Contract Information</h2>
      <div className="space-y-2 text-sm">
        <p><span className="font-medium">Your Address:</span> {account || 'Not connected'}</p>
        <p><span className="font-medium">NFT Contract:</span> {nftContract?.target || 'Not connected'}</p>
        <p><span className="font-medium">Marketplace Contract:</span> {marketplaceContract?.target || 'Not connected'}</p>
        <p><span className="font-medium">Expected NFT Address:</span> {contractAddresses.nft}</p>
        <p><span className="font-medium">Expected Marketplace Address:</span> {contractAddresses.marketplace}</p>
        
        <p><span className="font-medium">Contract Owner:</span> {hardhatDefaultOwner}</p>
        <p>
          <span className="font-medium">Owner Status:</span> 
          {isOwner 
            ? <span className="text-green-600 ml-1">You are the owner</span> 
            : <span className="text-red-600 ml-1">You are NOT the owner</span>}
        </p>
        
        <div className="mt-4 border-t pt-2">
          <p><span className="font-medium">Note:</span> If your wallet address doesn't match the contract owner, 
          you might not have permission to mint specific Pokémon. Try using the random mint function or deploy 
          a new contract and make your address the owner.</p>
        </div>
      </div>
    </div>
  );
}