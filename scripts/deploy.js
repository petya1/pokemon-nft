const fs = require('fs');
const path = require('path');
const { artifacts, ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy PokemonNFT contract
  const PokemonNFT = await ethers.getContractFactory("PokemonNFT");
  const pokemonNFT = await PokemonNFT.deploy("https://pokeapi.co/api/v2/pokemon/");
  await pokemonNFT.waitForDeployment();

  const pokemonNFTAddress = await pokemonNFT.getAddress();
  console.log("PokemonNFT deployed to:", pokemonNFTAddress);

  // Deploy PokemonMarketplace contract
  const PokemonMarketplace = await ethers.getContractFactory("PokemonMarketplace");
  const pokemonMarketplace = await PokemonMarketplace.deploy(pokemonNFTAddress);
  await pokemonMarketplace.waitForDeployment();

  const pokemonMarketplaceAddress = await pokemonMarketplace.getAddress();
  console.log("PokemonMarketplace deployed to:", pokemonMarketplaceAddress);

  console.log("Initial Pokemon added in constructor");

  // Read full artifacts
  const nftArtifact = artifacts.readArtifactSync("PokemonNFT");
  const marketplaceArtifact = artifacts.readArtifactSync("PokemonMarketplace");
  console.log("Artifacts read successfully", nftArtifact, marketplaceArtifact);
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
