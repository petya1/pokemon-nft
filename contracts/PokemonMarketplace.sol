// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// import "@openzeppelin/contracts/utils/Counters.sol";
// import "@openzeppelin/contracts/utils/structs/Counters.sol";
import "./PokemonNFT.sol";

// If you need Counters in this contract too, define it here
// library Counters {
//     struct Counter {
//         uint256 _value;
//     }

//     function current(Counter storage counter) internal view returns (uint256) {
//         return counter._value;
//     }

//     function increment(Counter storage counter) internal {
//         counter._value += 1;
//     }

//     function decrement(Counter storage counter) internal {
//         counter._value -= 1;
//     }
// }

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
    
    // Events
    event ListingCreated(uint256 listingId, address seller, uint256 tokenId, uint256 price, ListingType listingType, uint256 auctionEndTime);
    event ListingSuccessful(uint256 listingId, address buyer, uint256 price);
    event ListingCancelled(uint256 listingId);
    event BidPlaced(uint256 listingId, address bidder, uint256 bid);
    event AuctionFinalized(uint256 listingId, address winner, uint256 price);
    
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
    function createAuction(uint256 tokenId, uint256 startingPrice, uint256 duration) external whenNotStopped{
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
    
    // Place a bid on an auction
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
    
    // Finalize an auction after it has ended
    function finalizeAuction(uint256 listingId) external nonReentrant whenNotStopped {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.Active, "Listing is not active");
        require(listing.listingType == ListingType.Auction, "This is not an auction");
        require(block.timestamp >= listing.auctionEndTime, "Auction has not ended yet");
        
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
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance - getTotalPendingWithdrawals());
    }
    
    // Get total pending withdrawals
    function getTotalPendingWithdrawals() public view returns (uint256) {
        uint256 total = 0;
        // This is a simplified version since we can't iterate over mappings
        // In a real implementation, you'd need to track users with pending withdrawals
        return total;
    }
    
    // Emergency stop function
    bool public emergencyStop = false;
    
    function toggleEmergencyStop() external onlyOwner {
        emergencyStop = !emergencyStop;
    }
    
    // Check if a token is listed
    function isTokenListed(uint256 tokenId) external view returns (bool) {
        return tokenIdToListingId[tokenId] != 0 && 
               listings[tokenIdToListingId[tokenId]].status == ListingStatus.Active;
    }
    
    // Get active listings (simplified - in a real implementation, you'd page through results)
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