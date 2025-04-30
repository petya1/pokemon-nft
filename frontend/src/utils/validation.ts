// src/utils/validation.ts
import { ethers } from 'ethers';

export function validateEthAmount(amount: string, minAmount?: string): string | null {
  if (!amount || amount.trim() === '') {
    return "Amount cannot be empty";
  }
  
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return "Amount must be a valid number";
  }
  
  if (numAmount <= 0) {
    return "Amount must be greater than 0";
  }
  
  if (minAmount && numAmount < parseFloat(minAmount)) {
    return `Amount must be at least ${minAmount} ETH`;
  }
  
  return null;
}

export function validatePokemonIndex(index: number, maxIndex: number): string | null {
  if (index < 0) {
    return "Pokémon index cannot be negative";
  }
  
  if (index > maxIndex) {
    return `Pokémon index must be between 0 and ${maxIndex}`;
  }
  
  return null;
}

export async function validateWalletBalance(
  provider: ethers.BrowserProvider,
  account: string,
  requiredAmount: string
): Promise<string | null> {
  try {
    const balance = await provider.getBalance(account);
    const requiredWei = ethers.parseEther(requiredAmount);
    
    if (balance < requiredWei) {
      return `Insufficient balance. You need at least ${requiredAmount} ETH`;
    }
    
    return null;
  } catch (error) {
    console.error("Error checking balance:", error);
    return "Could not verify wallet balance";
  }
}