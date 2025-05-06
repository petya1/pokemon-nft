// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./PokemonNFT.sol";



contract PokemonMarketplace is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    // Track listing IDs
    Counters.Counter private _listingIds;
    
    // Link to the NFT contract
    PokemonNFT public pokemonNFT;
    
    // Fee percentage (out of 1000, so 25 = 2.5%)
    uint256 public feePercentage = 25;
    
    // Listing status enum
    enum ListingStatus { Active, Sold, Cancelled }
    
    // Listing types
    enum ListingType { FixedPrice, Auction }
    
    // Listing data structure
    struct Listing {
        uint256 listingId;
        address seller;
        uint256 tokenId;
        uint256 price;
        ListingStatus status;
        ListingType listingType;
        uint256 auctionEndTime;
        address highestBidder;
        uint256 highestBid;
    }
    
    // Mapping from listing ID to Listing
    mapping(uint256 => Listing) public listings;
    
    // Mapping from token ID to listing ID
    mapping(uint256 => uint256) public tokenIdToListingId;
    
    // Mapping for user funds that can be withdrawn
    mapping(address => uint256) public pendingWithdrawals;
    
    // For sealed bid auctions
    mapping(uint256 => mapping(address => bytes32)) public sealedBids;
    mapping(bytes32 => bool) public usedBidHashes;
    
    // Events
    event ListingCreated(uint256 listingId, address seller, uint256 tokenId, uint256 price, ListingType listingType, uint256 auctionEndTime);
    event ListingSuccessful(uint256 listingId, address buyer, uint256 price);
    event ListingCancelled(uint256 listingId);
    event BidPlaced(uint256 listingId, address bidder, uint256 bid);
    event AuctionFinalized(uint256 listingId, address winner, uint256 price);
    event SealedBidSubmitted(uint256 listingId, address bidder, bytes32 bidHash);
    event SealedBidRevealed(uint256 listingId, address bidder, uint256 bid);
    
    // Emergency stop
    bool public emergencyStop = false;
    
    constructor(address _nftContract) Ownable(msg.sender) {
        pokemonNFT = PokemonNFT(_nftContract);
    }
    
    // Create a fixed price listing
    function createListing(uint256 tokenId, uint256 price) external whenNotStopped {
        require(pokemonNFT.ownerOf(tokenId) == msg.sender, "You don't own this token");
        require(price > 0, "Price must be greater than zero");
        require(tokenIdToListingId[tokenId] == 0, "Token already listed");
        
        // Ensure the contract has approval to transfer the NFT
        require(
            pokemonNFT.getApproved(tokenId) == address(this) || 
            pokemonNFT.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved to transfer this token"
        );
        
        _listingIds.increment();
        uint256 listingId = _listingIds.current();
        
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            status: ListingStatus.Active,
            listingType: ListingType.FixedPrice,
            auctionEndTime: 0,
            highestBidder: address(0),
            highestBid: 0
        });
        
        tokenIdToListingId[tokenId] = listingId;
        
        emit ListingCreated(listingId, msg.sender, tokenId, price, ListingType.FixedPrice, 0);
    }
    
    // Create an auction listing
    function createAuction(uint256 tokenId, uint256 startingPrice, uint256 duration) external whenNotStopped {
        require(pokemonNFT.ownerOf(tokenId) == msg.sender, "You don't own this token");
        require(startingPrice > 0, "Starting price must be greater than zero");
        require(duration > 0, "Duration must be greater than zero");
        require(tokenIdToListingId[tokenId] == 0, "Token already listed");
        
        // Ensure the contract has approval to transfer the NFT
        require(
            pokemonNFT.getApproved(tokenId) == address(this) || 
            pokemonNFT.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved to transfer this token"
        );
        
        _listingIds.increment();
        uint256 listingId = _listingIds.current();
        
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            tokenId: tokenId,
            price: startingPrice,
            status: ListingStatus.Active,
            listingType: ListingType.Auction,
            auctionEndTime: block.timestamp + duration,
            highestBidder: address(0),
            highestBid: 0
        });
        
        tokenIdToListingId[tokenId] = listingId;
        
        emit ListingCreated(listingId, msg.sender, tokenId, startingPrice, ListingType.Auction, block.timestamp + duration);
    }
    
    // Buy a fixed price listing
    function buyListing(uint256 listingId) external payable nonReentrant whenNotStopped {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.Active, "Listing is not active");
        require(listing.listingType == ListingType.FixedPrice, "This is not a fixed price listing");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Seller cannot buy their own listing");
        
        // Mark as sold
        listing.status = ListingStatus.Sold;
        
        // Calculate fee
        uint256 fee = (listing.price * feePercentage) / 1000;
        uint256 sellerProceeds = listing.price - fee;
        
        // Add seller proceeds to their pending withdrawals
        pendingWithdrawals[listing.seller] += sellerProceeds;
        
        // Transfer NFT to buyer
        pokemonNFT.transferFrom(listing.seller, msg.sender, listing.tokenId);
        
        // Remove token from active listings
        delete tokenIdToListingId[listing.tokenId];
        
        // Refund excess payment
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
        
        emit ListingSuccessful(listingId, msg.sender, listing.price);
    }
    
    // FRONT-RUNNING PROTECTION: Submit a sealed bid (commit)
    function submitSealedBid(uint256 listingId, bytes32 bidHash) external payable nonReentrant whenNotStopped {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.Active, "Listing is not active");
        require(listing.listingType == ListingType.Auction, "This is not an auction");
        require(block.timestamp < listing.auctionEndTime, "Auction has ended");
        require(msg.sender != listing.seller, "Seller cannot bid on their own auction");
        require(!usedBidHashes[bidHash], "Bid hash already used");
        
        // Store bid hash
        sealedBids[listingId][msg.sender] = bidHash;
        usedBidHashes[bidHash] = true;
        
        // Store deposit
        pendingWithdrawals[msg.sender] += msg.value;
        
        emit SealedBidSubmitted(listingId, msg.sender, bidHash);
    }
    
    // FRONT-RUNNING PROTECTION: Reveal a sealed bid
    function revealBid(uint256 listingId, uint256 bidAmount, string memory secret) external nonReentrant whenNotStopped {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.Active, "Listing is not active");
        require(block.timestamp >= listing.auctionEndTime, "Auction has not ended yet");
        require(block.timestamp <= listing.auctionEndTime + 1 hours, "Reveal period has ended");
        
        // Calculate and verify bid hash
        bytes32 bidHash = keccak256(abi.encodePacked(bidAmount, secret, msg.sender));
        require(sealedBids[listingId][msg.sender] == bidHash, "Revealed bid does not match commitment");
        
        // Clear the sealed bid
        sealedBids[listingId][msg.sender] = bytes32(0);
        
        // Ensure bidder has enough in pendingWithdrawals
        require(pendingWithdrawals[msg.sender] >= bidAmount, "Insufficient funds for bid");
        
        // If this is the highest bid, record it
        if (bidAmount > listing.highestBid) {
            // Return funds to previous highest bidder
            if (listing.highestBidder != address(0)) {
                // The previous highest bid is still in their pendingWithdrawals
            }
            
            // Update highest bid info
            listing.highestBidder = msg.sender;
            listing.highestBid = bidAmount;
            
            // Reduce pendingWithdrawals by bid amount
            pendingWithdrawals[msg.sender] -= bidAmount;
        }
        
        emit SealedBidRevealed(listingId, msg.sender, bidAmount);
    }
    
    // Finalize an auction after all bids are revealed
    function finalizeAuction(uint256 listingId) external nonReentrant whenNotStopped {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.Active, "Listing is not active");
        require(listing.listingType == ListingType.Auction, "This is not an auction");
        require(block.timestamp > listing.auctionEndTime + 1 hours, "Reveal period has not ended");
        
        // Mark as sold
        listing.status = ListingStatus.Sold;
        
        // If there were no bids, return the NFT to the seller
        if (listing.highestBidder == address(0)) {
            delete tokenIdToListingId[listing.tokenId];
            emit ListingCancelled(listingId);
            return;
        }
        
        // Calculate fee
        uint256 fee = (listing.highestBid * feePercentage) / 1000;
        uint256 sellerProceeds = listing.highestBid - fee;
        
        // Add seller proceeds to their pending withdrawals
        pendingWithdrawals[listing.seller] += sellerProceeds;
        
        // Transfer NFT to highest bidder
        pokemonNFT.transferFrom(listing.seller, listing.highestBidder, listing.tokenId);
        
        // Remove token from active listings
        delete tokenIdToListingId[listing.tokenId];
        
        emit AuctionFinalized(listingId, listing.highestBidder, listing.highestBid);
    }
    
    // Regular bid function for normal auctions (still supported)
    function placeBid(uint256 listingId) external payable nonReentrant whenNotStopped {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.Active, "Listing is not active");
        require(listing.listingType == ListingType.Auction, "This is not an auction");
        require(block.timestamp < listing.auctionEndTime, "Auction has ended");
        require(msg.sender != listing.seller, "Seller cannot bid on their own auction");
        
        // If there's no bid yet, must be at least the starting price
        if (listing.highestBidder == address(0)) {
            require(msg.value >= listing.price, "Bid must be at least the starting price");
        } else {
            // Otherwise, must be higher than current highest bid
            require(msg.value > listing.highestBid, "Bid must be higher than current highest bid");
            
            // Refund the previous highest bidder
            pendingWithdrawals[listing.highestBidder] += listing.highestBid;
        }
        
        // Update highest bid info
        listing.highestBidder = msg.sender;
        listing.highestBid = msg.value;
        
        emit BidPlaced(listingId, msg.sender, msg.value);
    }
    
    // Cancel a listing (only if there are no bids for auctions)
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        
        require(listing.seller == msg.sender || owner() == msg.sender, "Only seller or owner can cancel");
        require(listing.status == ListingStatus.Active, "Listing is not active");
        
        // For auctions, ensure there are no bids
        if (listing.listingType == ListingType.Auction) {
            require(listing.highestBidder == address(0), "Cannot cancel auction with bids");
        }
        
        listing.status = ListingStatus.Cancelled;
        delete tokenIdToListingId[listing.tokenId];
        
        emit ListingCancelled(listingId);
    }
    
    // Withdraw accumulated balance
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        // Zero out pending withdrawals before transfer to prevent reentrancy
        pendingWithdrawals[msg.sender] = 0;
        
        // Transfer funds
        payable(msg.sender).transfer(amount);
    }
    
    // Update fee percentage (owner only)
    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 100, "Fee percentage cannot exceed 10%");
        feePercentage = _feePercentage;
    }
    
    // Withdraw accumulated fees (owner only)
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
    
    // Emergency stop function
    function toggleEmergencyStop() external onlyOwner {
        emergencyStop = !emergencyStop;
    }
    
    // Check if a token is listed
    function isTokenListed(uint256 tokenId) external view returns (bool) {
        return tokenIdToListingId[tokenId] != 0 && 
               listings[tokenIdToListingId[tokenId]].status == ListingStatus.Active;
    }
    
    // Get active listings count
    function getActiveListingCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= _listingIds.current(); i++) {
            if (listings[i].status == ListingStatus.Active) {
                count++;
            }
        }
        return count;
    }
    
    // Modifier to check for emergency stop
    modifier whenNotStopped() {
        require(!emergencyStop, "Contract is in emergency stop mode");
        _;
    }
}