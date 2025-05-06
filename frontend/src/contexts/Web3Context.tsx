'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import nftAbi from '@/lib/contracts/PokemonNFT.json';
import marketplaceAbi from '@/lib/contracts/PokemonMarketplace.json';
import contractAddresses from '@/lib/contracts/addresses.json';
// import nftAbi from '../../../artifacts/contracts/PokemonNFT.sol/PokemonNFT.json';
// import marketplaceAbi from '../../../artifacts/contracts/PokemonMarketplace.sol/PokemonMarketplace.json'
// import contractAddresses from '../../../contract-addresses/addresses.json';


type Web3ContextType = {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  account: string | null;
  nftContract: ethers.Contract | null;
  marketplaceContract: ethers.Contract | null;
  connectWallet: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
};

type Web3ProviderProps = {
  children: React.ReactNode;
};

const Web3Context = createContext<Web3ContextType | null>(null);

export function Web3Provider({ children }: Web3ProviderProps) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [nftContract, setNftContract] = useState<ethers.Contract | null>(null);
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeWeb3 = async () => {
    try {
      // Check if MetaMask is installed
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);

        // Check if already connected
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          setSigner(signer);
          setAccount(accounts[0].address);

          // Initialize contracts
          const nftContract = new ethers.Contract(
            contractAddresses.nft,
            nftAbi.abi,
            signer
          );
          const marketplaceContract = new ethers.Contract(
            contractAddresses.marketplace,
            marketplaceAbi.abi,
            signer
          );

          setNftContract(nftContract);
          setMarketplaceContract(marketplaceContract);
        }
      } else {
        setError('MetaMask is not installed. Please install MetaMask to use this app.');
      }
    } catch (err) {
      console.error('Failed to initialize Web3', err);
      setError('Failed to initialize Web3. Please refresh the page and try again.');
    }
  };

  const commitToRandomMint = async (secretPhrase) => {
    if (!nftContract) return;
    
    try {
      // Hash the secret phrase with the user's address to create the commit
      const commitHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['string', 'address'],
          [secretPhrase, account]
        )
      );
      
      // Submit the commit transaction
      const tx = await nftContract.commitToRandomMint(commitHash);
      await tx.wait();
      
      // Store the secret phrase locally (in a secure way in production)
      localStorage.setItem(`commit-${account}`, secretPhrase);
      
      return commitHash;
    } catch (error) {
      console.error('Error committing to random mint:', error);
      throw error;
    }
  };
  
  // For revealing and completing the random mint
  const revealAndMintRandom = async () => {
    if (!nftContract) return;
    
    try {
      // Get the stored secret phrase
      const secretPhrase = localStorage.getItem(`commit-${account}`);
      if (!secretPhrase) {
        throw new Error('No secret phrase found. You need to commit first.');
      }
      
      // Execute the reveal and mint transaction
      const tx = await nftContract.revealAndMintRandom(
        secretPhrase, 
        account,
        { value: ethers.utils.parseEther('0.01') }
      );
      const receipt = await tx.wait();
      
      // Clear the stored secret phrase
      localStorage.removeItem(`commit-${account}`);
      
      // Find the token ID from the event logs
      const mintEvent = receipt.events.find(e => e.event === 'PokemonMinted');
      const tokenId = mintEvent.args.tokenId.toNumber();
      
      return tokenId;
    } catch (error) {
      console.error('Error revealing and minting random Pokemon:', error);
      throw error;
    }
  };
  
  // For sealed bid auctions
  const submitSealedBid = async (listingId, bidAmount, secret) => {
    if (!marketplaceContract) return;
    
    try {
      // Hash the bid with a secret and the user's address
      const bidHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'string', 'address'],
          [bidAmount, secret, account]
        )
      );
      
      // Determine deposit amount (usually 20-50% of actual bid)
      const depositAmount = bidAmount.div(5); // 20% deposit
      
      // Submit the sealed bid
      const tx = await marketplaceContract.submitSealedBid(
        listingId,
        bidHash,
        { value: depositAmount }
      );
      await tx.wait();
      
      // Store the bid details locally (in a secure way in production)
      localStorage.setItem(`bid-${listingId}-${account}`, 
        JSON.stringify({ amount: bidAmount.toString(), secret })
      );
      
      return bidHash;
    } catch (error) {
      console.error('Error submitting sealed bid:', error);
      throw error;
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      if (provider) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setSigner(signer);
        setAccount(address);
        
        // Initialize contracts with signer
        const nftContract = new ethers.Contract(
          contractAddresses.nft,
          nftAbi.abi,
          signer
        );
        const marketplaceContract = new ethers.Contract(
          contractAddresses.marketplace,
          marketplaceAbi.abi,
          signer
        );

        setNftContract(nftContract);
        setMarketplaceContract(marketplaceContract);
      } else {
        setError('Provider not initialized. Please refresh the page.');
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    initializeWeb3();
    
    // Setup event listeners for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          setSigner(null);
          setAccount(null);
          setNftContract(null);
          setMarketplaceContract(null);
        } else {
          // Account changed, reload the page for simplicity
          window.location.reload();
        }
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    
    return () => {
      // Cleanup event listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);

  const value = {
    provider,
    signer,
    account,
    nftContract,
    marketplaceContract,
    connectWallet,
    isConnecting,
    commitToRandomMint,
    revealAndMintRandom,
    submitSealedBid,
    error
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
