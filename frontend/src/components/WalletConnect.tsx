'use client';
import { useWeb3 } from '@/contexts/Web3Context';

export default function WalletConnect() {
  const { account, connectWallet, isConnecting, error } = useWeb3();
  
  return (
    <div>
      {account ? (
        <div className="px-4 py-2 bg-blue-700 rounded-md font-medium">
          {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-md font-medium transition disabled:opacity-70"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
