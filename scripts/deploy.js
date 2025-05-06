const fs = require('fs');
const path = require('path');
const { artifacts, ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Load Pokemon data from the JSON file (assuming it already exists)
  let pokemonData;
  try {
    const dataPath = path.join(__dirname, '../data/pokemon.json');
    const jsonData = fs.readFileSync(dataPath, 'utf8');
    pokemonData = JSON.parse(jsonData);
    console.log(`Loaded data for ${pokemonData.length} Pokémon from pokemon.json`);
  } catch (error) {
    console.error("Error loading Pokemon data:", error);
    console.error("Make sure you've run fetchPokemonData.js first!");
    process.exit(1);
  }

  // Deploy PokemonNFT contract
  const PokemonNFT = await ethers.getContractFactory("PokemonNFT");
  const pokemonNFT = await PokemonNFT.deploy("http://localhost:3000/metadata/");
  await pokemonNFT.waitForDeployment();
  // This could be in a setup script or a frontend interaction
  await pokemonNFT.setBaseURI("http://localhost:3000/metadata/");

  const pokemonNFTAddress = await pokemonNFT.getAddress();
  console.log("PokemonNFT deployed to:", pokemonNFTAddress);

  // Add the loaded Pokemon to the contract
  console.log("Adding Pokemon to the contract...");
  
  // We'll add Pokemon in batches to avoid gas limits
  const BATCH_SIZE = 5; // Adjust based on gas limits/network
  
  for (let i = 0; i < pokemonData.length; i += BATCH_SIZE) {
    const batch = pokemonData.slice(i, i + BATCH_SIZE);
    console.log(`Adding batch ${i/BATCH_SIZE + 1} (${batch.length} Pokemon)...`);
    
    for (const pokemon of batch) {
      console.log(`Adding ${pokemon.name}...`);
      await pokemonNFT.addPokemon(
        pokemon.id,
        pokemon.name,
        pokemon.type,
        pokemon.rarity,
        pokemon.attack,
        pokemon.defense,
        pokemon.maxSupply
      );
    }
    console.log(`Batch ${i/BATCH_SIZE + 1} complete!`);
  }
  
  console.log("All Pokemon have been added to the contract");

  // Deploy PokemonMarketplace contract
  const PokemonMarketplace = await ethers.getContractFactory("PokemonMarketplace");
  const pokemonMarketplace = await PokemonMarketplace.deploy(pokemonNFTAddress);
  await pokemonMarketplace.waitForDeployment();

  const pokemonMarketplaceAddress = await pokemonMarketplace.getAddress();
  console.log("PokemonMarketplace deployed to:", pokemonMarketplaceAddress);

  // Read full artifacts
  const nftArtifact = artifacts.readArtifactSync("PokemonNFT");
  const marketplaceArtifact = artifacts.readArtifactSync("PokemonMarketplace");
  
  // Frontend output directory
  const frontendDir = path.join(__dirname, "..", "frontend", "src", "lib", "contracts");

  try {
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }

    // Write addresses
    fs.writeFileSync(
      path.join(frontendDir, "addresses.json"),
      JSON.stringify({
        nft: pokemonNFTAddress,
        marketplace: pokemonMarketplaceAddress
      }, null, 2)
    );

    // Write full artifacts (includes abi, bytecode, etc.)
    fs.writeFileSync(
      path.join(frontendDir, "PokemonNFT.json"),
      JSON.stringify(nftArtifact, null, 2)
    );

    fs.writeFileSync(
      path.join(frontendDir, "PokemonMarketplace.json"),
      JSON.stringify(marketplaceArtifact, null, 2)
    );
    
    // Also copy the Pokemon data to the frontend for reference
    fs.copyFileSync(
      path.join(__dirname, '../data/pokemon.json'),
      path.join(frontendDir, "pokemonData.json")
    );

    console.log(`✅ Contract data written to: ${frontendDir}`);
  } catch (error) {
    console.error("❌ Failed to write contract data to frontend:", error.message);
  }

  // Fallback log
  console.log("\n📦 Contract Addresses:");
  console.log(JSON.stringify({
    nft: pokemonNFTAddress,
    marketplace: pokemonMarketplaceAddress
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });