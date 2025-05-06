// app/metadata/[tokenId]/route.ts
import { ethers } from 'ethers';
import { NextResponse } from 'next/server';
import { AbiCoder } from 'ethers';

// Your contract address after deployment
const NFT_CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3"; 
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545"; 

// Import your contract ABI
// Make sure this path is correct based on your project structure
// import contractAbi from '../../../artifacts/contracts/PokemonNFT.sol/PokemonNFT.json';
import contractAbi from '@/lib/contracts/PokemonNFT.json'; 

export async function GET(
  request: Request,
  { params }: { params: { tokenId: string } }
) {
  // Get tokenId from params
  const { tokenId } = params;
  
  try {
    // Connect to the blockchain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const nftContract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS, 
      contractAbi.abi, 
      provider
    );
    
    // Fetch this token's data from the contract
    const pokemon = await nftContract.pokemonData(tokenId);
    
    // Create metadata in the ERC-721 standard format
    const metadata = {
      name: `${pokemon.name} #${tokenId}`,
      description: `A ${pokemon.pokemonType} Pokémon with ${pokemon.rarity} rarity.`,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokemonId}.png`,
      attributes: [
        {
          trait_type: "Pokemon ID",
          value: pokemon.pokemonId.toString()
        },
        {
          trait_type: "Type",
          value: pokemon.pokemonType
        },
        {
          trait_type: "Rarity",
          value: pokemon.rarity
        },
        {
          trait_type: "Attack",
          value: pokemon.attack.toString()
        },
        {
          trait_type: "Defense",
          value: pokemon.defense.toString()
        }
      ]
    };
    
    // Return the metadata as JSON with CORS headers
    return new NextResponse(JSON.stringify(metadata), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    
    // Provide more detailed error information
    let errorMessage = "Failed to generate metadata";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}