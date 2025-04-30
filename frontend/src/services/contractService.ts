// src/services/contractService.ts
import { ethers } from 'ethers';

export async function safeExecute(
  contractMethod: () => Promise<any>,
  errorHandler: (error: any) => void,
  successHandler: (result: any) => void
) {
  try {
    const tx = await contractMethod();
    const receipt = await tx.wait();
    successHandler(receipt);
    return receipt;
  } catch (error) {
    errorHandler(error);
    throw error;
  }
}

export function handleContractError(error: any): string {
  console.error("Contract error:", error);
  
  // Specific error handling
  if (error.message) {
    if (error.message.includes("onlyOwner")) {
      return "Error: Only the contract owner can perform this action";
    }
    if (error.message.includes("insufficient funds")) {
      return "Error: You don't have enough ETH to complete this transaction";
    }
    if (error.message.includes("maximum supply")) {
      return "Error: This Pokémon has reached its maximum supply";
    }
    if (error.message.includes("Listing is not active")) {
      return "Error: This listing is no longer active";
    }
    if (error.message.includes("Marketplace not approved")) {
      return "Error: Marketplace needs approval to transfer your Pokémon";
    }
    if (error.message.includes("already listed")) {
      return "Error: This Pokémon is already listed for sale";
    }
    if (error.message.includes("paused")) {
      return "Error: The contract is currently paused";
    }
  }
  
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}