const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Number of Pokémon to fetch (e.g., original 151)
const POKEMON_COUNT = 15;
// Base URL for PokéAPI
const API_BASE_URL = 'https://pokeapi.co/api/v2/';

// Function to determine rarity based on base stats
function determineRarity(baseStats) {
  const totalStats = baseStats.reduce((sum, stat) => sum + stat.base_stat, 0);
  
  if (totalStats < 300) return 'Common';
  if (totalStats < 400) return 'Uncommon';
  if (totalStats < 500) return 'Rare';
  if (totalStats < 600) return 'Ultra Rare';
  return 'Legendary';
}

// Function to determine max supply based on rarity
function determineMaxSupply(rarity) {
  switch (rarity) {
    case 'Common': return 100;
    case 'Uncommon': return 50;
    case 'Rare': return 20;
    case 'Ultra Rare': return 10;
    case 'Legendary': return 3;
    default: return 100;
  }
}

async function fetchPokemonData() {
  try {
    const pokemonData = [];
    
    console.log(`Fetching data for ${POKEMON_COUNT} Pokémon...`);
    
    for (let i = 1; i <= POKEMON_COUNT; i++) {
      console.log(`Fetching Pokémon #${i}...`);
      
      // Fetch basic Pokémon data
      const response = await axios.get(`${API_BASE_URL}pokemon/${i}`);
      const pokemon = response.data;
      
      // Fetch species data for additional details
      const speciesResponse = await axios.get(pokemon.species.url);
      const species = speciesResponse.data;
      
      // Determine rarity based on base stats
      const rarity = determineRarity(pokemon.stats);
      
      // Determine max supply based on rarity
      const maxSupply = determineMaxSupply(rarity);
      
      // Extract the types
      const types = pokemon.types.map(type => type.type.name);
      
      // Get English description
      let description = '';
      for (const entry of species.flavor_text_entries) {
        if (entry.language.name === 'en') {
          description = entry.flavor_text.replace(/\n/g, ' ').replace(/\f/g, ' ');
          break;
        }
      }
      
      // Format the data
      const formattedPokemon = {
        id: pokemon.id,
        name: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
        type: types.join('/'),
        rarity,
        maxSupply,
        attack: pokemon.stats.find(stat => stat.stat.name === 'attack').base_stat,
        defense: pokemon.stats.find(stat => stat.stat.name === 'defense').base_stat,
        image_url: pokemon.sprites.other['official-artwork'].front_default,
        description
      };
      
      pokemonData.push(formattedPokemon);
    }
    
    // Write data to JSON file
    const dataPath = path.join(__dirname, '../data');
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(dataPath, 'pokemon.json'),
      JSON.stringify(pokemonData, null, 2)
    );
    
    console.log(`Successfully fetched data for ${pokemonData.length} Pokémon!`);
    console.log(`Data saved to data/pokemon.json`);
    
  } catch (error) {
    console.error('Error fetching Pokémon data:', error);
  }
}

// Run the script
fetchPokemonData();
