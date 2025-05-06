# Quick Start Guide: Pokémon NFT Platform

This document provides step-by-step instructions for setting up and running the Pokémon NFT Trading Platform from scratch. Follow these instructions in order.

## Setup Process

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/petya1/pokemon-nft.git
cd pokemon-nft

# Install dependencies
npm install
```

### Step 2: Start Local Blockchain (Terminal 1)

```bash
# Open a terminal window and keep it running
npx hardhat node
```

You'll see a list of accounts with private keys. **Keep this terminal open.**

### Step 3: Deploy Contracts (Terminal 2)

```bash
# Open a new terminal window
npx hardhat run scripts/deploy.js --network localhost
```

You should see output like:
```
Deploying contracts with the account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
PokemonNFT deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
PokemonMarketplace deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Initial Pokemon added in constructor
Contract ABIs and addresses written to: src/lib/contracts
```

**Important:** Make note of these contract addresses. If they don't match what's in your `src/lib/contracts/addresses.json` file, update the file manually.

### Step 4: Start the Frontend (Terminal 3)

```bash
# Open a third terminal window
cd frontend
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Step 5: Set Up MetaMask

1. Install the [MetaMask extension](https://metamask.io/download.html) if you don't have it already

2. Add Hardhat Network to MetaMask:
   - Click on the network dropdown (usually says "Ethereum Mainnet")
   - Select "Add Network"
   - Fill in these details:
     - Network Name: `Hardhat`
     - RPC URL: `http://127.0.0.1:8545`
     - Chain ID: `1337`
     - Currency Symbol: `ETH`

3. Import a test account:
   - In the Hardhat terminal (Terminal 1), copy one of the private keys
   - In MetaMask, click your account icon → Import Account
   - Paste the private key and click "Import"
   - You should now have 10,000 test ETH

### Step 6: Use the Application

1. On the homepage, click "Connect Wallet"
2. You should now be able to:
   - Mint Pokémon NFTs (costs 0.01 ETH)
   - View your collection under "My Collection"
   - List Pokémon for sale at a price you set
   - Browse and purchase others' Pokémon in the "Marketplace"
   - List Pokémon for auction
   - To place a bid in the auction
   - Pause contract and withdraw collected fees as an admin

## Troubleshooting

### If the minting doesn't work:

1. Check the console for error messages
2. Make sure your MetaMask is connected to the Hardhat network
3. Verify contract addresses match between deployment and frontend

### If you see ABI mismatch errors:

Replace the ABI files in `src/lib/contracts/` with the simplified versions from the repo.

### If contract deployment fails:

1. Make sure the Hardhat node is running
2. Check that you don't have conflicting contract deployments
3. Try running `npx hardhat clean` and deploying again

### If MetaMask won't connect:

1. Make sure you're on the Hardhat network
2. Try resetting your account (Settings → Advanced → Reset Account)
3. Refresh the page and try connecting again

## Common Commands Reference

```bash
# Start local blockchain
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Start frontend
npm run dev

# Run tests
npx hardhat test

# Clean Hardhat artifacts
npx hardhat clean
```

## Next Steps

Once you have the platform running, try these activities:

1. Mint several different Pokémon
2. List one of your Pokémon for sale
3. Connect with another account and purchase a Pokémon
4. Examine the transaction history in MetaMask

Enjoy trading Pokémon NFTs!
