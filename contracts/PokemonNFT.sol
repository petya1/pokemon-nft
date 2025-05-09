// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Define Counters library
library Counters {
    struct Counter {
        uint256 _value;
    }

    function current(Counter storage counter) internal view returns (uint256) {
        return counter._value;
    }

    function increment(Counter storage counter) internal {
        counter._value += 1;
    }

    function decrement(Counter storage counter) internal {
        counter._value -= 1;
    }
}

contract PokemonNFT is ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;
    
    Counters.Counter private _tokenIds;
    
    // Pokemon card data structure
    struct Pokemon {
        uint256 pokemonId;     // Pokemon ID (from PokéAPI)
        string name;           // Pokemon name
        string pokemonType;    // Pokemon type
        string rarity;         // Rarity level (Common, Uncommon, Rare, etc.)
        uint256 attack;        // Attack stat
        uint256 defense;       // Defense stat
        uint256 maxSupply;     // Maximum supply for this Pokemon
        uint256 currentSupply; // Current minted supply
    }
    
    // Mapping from token ID to Pokemon data
    mapping(uint256 => Pokemon) public pokemonData;
    
    // Mapping from Pokemon ID to its corresponding token IDs
    mapping(uint256 => uint256[]) private _pokemonToTokenIds;
    
    // Available Pokemon templates that can be minted
    Pokemon[] public availablePokemon;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Mint price for specific Pokemon (0.01 ETH)
    uint256 public mintPrice = 0.01 ether;
    
    // For commit-reveal pattern (simplified)
    mapping(bytes32 => address) public commitRequests;
    
    // Emergency stop functionality
    bool public paused = false;
    
    // Events
    event PokemonAdded(uint256 pokemonId, string name, string rarity, uint256 maxSupply);
    event PokemonMinted(uint256 tokenId, uint256 pokemonId, string name, address owner);
    event CommitSubmitted(address indexed user, bytes32 commitHash);
    
    constructor(string memory baseURI) ERC721("PokemonCards", "PKMN") Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    // Emergency pause
    function togglePause() external onlyOwner {
        paused = !paused;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // Add a new Pokemon template that can be minted (only owner)
    function addPokemon(
        uint256 pokemonId,
        string memory name,
        string memory pokemonType,
        string memory rarity,
        uint256 attack,
        uint256 defense,
        uint256 maxSupply
    ) public onlyOwner {
        Pokemon memory newPokemon = Pokemon({
            pokemonId: pokemonId,
            name: name,
            pokemonType: pokemonType,
            rarity: rarity,
            attack: attack,
            defense: defense,
            maxSupply: maxSupply,
            currentSupply: 0
        });
        
        availablePokemon.push(newPokemon);
        emit PokemonAdded(pokemonId, name, rarity, maxSupply);
    }
    
    // Mint a specific Pokemon
    function mintPokemon(uint256 pokemonIndex, address recipient) public payable whenNotPaused nonReentrant returns (uint256) {
        require(pokemonIndex < availablePokemon.length, "Pokemon does not exist");
        require(
            availablePokemon[pokemonIndex].currentSupply < availablePokemon[pokemonIndex].maxSupply,
            "Maximum supply reached for this Pokemon"
        );
        
        // For specific mints, require payment of mintPrice
        require(msg.value >= mintPrice, "Insufficient payment");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        Pokemon storage pokemon = availablePokemon[pokemonIndex];
        pokemon.currentSupply++;
        
        _mint(recipient, newTokenId);

        _setTokenURI(newTokenId, string(abi.encodePacked(
            _baseURI(),
            pokemon.pokemonId.toString(),
            ".json"
        )));
        
        // Store Pokemon data for this token
        pokemonData[newTokenId] = Pokemon({
            pokemonId: pokemon.pokemonId,
            name: pokemon.name,
            pokemonType: pokemon.pokemonType,
            rarity: pokemon.rarity,
            attack: pokemon.attack,
            defense: pokemon.defense,
            maxSupply: pokemon.maxSupply,
            currentSupply: pokemon.currentSupply
        });
        
        // Keep track of token IDs for each Pokemon
        _pokemonToTokenIds[pokemon.pokemonId].push(newTokenId);
        
        emit PokemonMinted(newTokenId, pokemon.pokemonId, pokemon.name, recipient);
        
        return newTokenId;
    }
    
    // FRONT-RUNNING PROTECTION: Step 1 - Commit a hash
    function commitToRandomMint(bytes32 commitHash) external whenNotPaused {
        require(commitHash != bytes32(0), "Invalid commit hash");
        commitRequests[commitHash] = msg.sender;
        emit CommitSubmitted(msg.sender, commitHash);
    }
    
    // FRONT-RUNNING PROTECTION: Step 2 - Reveal and mint
    function revealAndMintRandom(string memory secretPhrase) external payable whenNotPaused nonReentrant returns (uint256) {
        require(msg.value >= mintPrice, "Insufficient payment");
        require(availablePokemon.length > 0, "No Pokemon available to mint");
        
        // Hash the secret to get the commit hash
        bytes32 commitHash = keccak256(abi.encodePacked(secretPhrase, msg.sender));
        
        // Verify the commit exists and matches the user
        require(commitRequests[commitHash] == msg.sender, "No matching commit found");
        
        // Delete the commit to prevent reuse
        delete commitRequests[commitHash];
        
        // Generate randomness using the reveal
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            secretPhrase,
            blockhash(block.number - 1),
            block.timestamp,
            msg.sender
        ))) % availablePokemon.length;
        
        // Find available Pokemon
        uint256 count = 0;
        while (availablePokemon[randomIndex].currentSupply >= availablePokemon[randomIndex].maxSupply) {
            randomIndex = (randomIndex + 1) % availablePokemon.length;
            count++;
            
            if (count >= availablePokemon.length) {
                revert("All Pokemon have reached maximum supply");
            }
        }
        
        // Mint the Pokemon
        return _mintPokemonInternal(randomIndex, msg.sender);
    }
    
    // Internal function to mint without checking payment again
    function _mintPokemonInternal(uint256 pokemonIndex, address recipient) internal returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        Pokemon storage pokemon = availablePokemon[pokemonIndex];
        pokemon.currentSupply++;
        
        _mint(recipient, newTokenId);
        
        // Set token URI
        _setTokenURI(newTokenId, string(abi.encodePacked(
            _baseURI(),
            pokemon.pokemonId.toString(),
            ".json"
        )));
        
        // Store Pokemon data for this token
        pokemonData[newTokenId] = Pokemon({
            pokemonId: pokemon.pokemonId,
            name: pokemon.name,
            pokemonType: pokemon.pokemonType,
            rarity: pokemon.rarity,
            attack: pokemon.attack,
            defense: pokemon.defense,
            maxSupply: pokemon.maxSupply,
            currentSupply: pokemon.currentSupply
        });
        
        // Keep track of token IDs for each Pokemon
        _pokemonToTokenIds[pokemon.pokemonId].push(newTokenId);
        
        emit PokemonMinted(newTokenId, pokemon.pokemonId, pokemon.name, recipient);
        
        return newTokenId;
    }
    
    // Legacy random mint function - DEPRECATED but kept for compatibility
    function mintRandomPokemon(address recipient) public payable whenNotPaused nonReentrant returns (uint256) {
        require(availablePokemon.length > 0, "No Pokemon available to mint");
        require(msg.value >= mintPrice, "Insufficient payment");
        
        // Get a "random" index using block data and transaction data
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, _tokenIds.current()))) % availablePokemon.length;
        
        // Find a Pokemon that hasn't reached max supply
        uint256 count = 0;
        while (availablePokemon[randomIndex].currentSupply >= availablePokemon[randomIndex].maxSupply) {
            randomIndex = (randomIndex + 1) % availablePokemon.length;
            count++;
            
            if (count >= availablePokemon.length) {
                revert("All Pokemon have reached maximum supply");
            }
        }
        
        return _mintPokemonInternal(randomIndex, recipient);
    }
    
    // Simplified mint function for testing - always mints the first Pokemon
    function simpleMint() public payable whenNotPaused nonReentrant returns (uint256) {
        require(availablePokemon.length > 0, "No Pokemon available to mint");
        require(msg.value >= mintPrice, "Insufficient payment");
        
        return mintPokemon(0, msg.sender);
    }
    
    // Get the total number of available Pokemon templates
    function getAvailablePokemonCount() public view returns (uint256) {
        return availablePokemon.length;
    }
    
    // Get the list of token IDs for a specific Pokemon
    function getTokenIdsByPokemonId(uint256 pokemonId) external view returns (uint256[] memory) {
        return _pokemonToTokenIds[pokemonId];
    }
    
    // Set mint price (only owner)
    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        mintPrice = _mintPrice;
    }
    
    // Withdraw balance (only owner)
    function withdraw() external onlyOwner nonReentrant {
        payable(owner()).transfer(address(this).balance);
    }
    
    // The following functions are overrides required by Solidity
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}