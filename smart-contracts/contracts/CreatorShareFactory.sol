// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreatorShare.sol";

/**
 * @title CreatorShareFactory
 * @author Guessly
 * @notice Factory contract to deploy and manage creator share contracts
 * @dev Enforces volume threshold and one share per creator
 */
contract CreatorShareFactory is Ownable {
    /// @notice USDC token address on Base
    address public immutable usdc;

    /// @notice Volume threshold required to unlock share creation (30,000 USDC)
    uint256 public constant VOLUME_THRESHOLD = 30000e6; // 30K USDC with 6 decimals

    /// @notice Mapping of creator address to their total trading volume
    mapping(address => uint256) public creatorTotalVolume;

    /// @notice Mapping of creator address to whether their shares are unlocked
    mapping(address => bool) public sharesUnlocked;

    /// @notice Mapping of creator address to their share contract address
    mapping(address => address) public creatorShareContract;

    /// @notice Mapping of whitelisted OpinionMarket contracts
    mapping(address => bool) public whitelistedMarkets;

    /// @notice Array of all deployed creator share contracts
    address[] public allCreatorShares;

    /// @notice Emitted when creator shares are created
    event SharesCreated(
        address indexed creator,
        address indexed shareContract,
        string name,
        string symbol,
        uint256 timestamp
    );

    /// @notice Emitted when creator volume is updated
    event VolumeUpdated(
        address indexed creator,
        uint256 additionalVolume,
        uint256 newTotalVolume,
        uint256 timestamp
    );

    /// @notice Emitted when creator unlocks shares
    event SharesUnlocked(
        address indexed creator,
        uint256 finalVolume,
        uint256 timestamp
    );

    /// @notice Emitted when a market contract is added to whitelist
    event MarketContractAdded(address indexed marketContract, uint256 timestamp);

    /// @notice Emitted when a market contract is removed from whitelist
    event MarketContractRemoved(address indexed marketContract, uint256 timestamp);

    /// @dev Error thrown when caller is not a whitelisted market
    error NotWhitelistedMarket();

    /// @dev Error thrown when shares are not yet unlocked for creator
    error SharesNotUnlocked();

    /// @dev Error thrown when creator already has a share contract
    error ShareContractAlreadyExists();

    /// @dev Error thrown when market contract is invalid
    error InvalidMarketContract();

    /// @dev Error thrown when creator address is invalid
    error InvalidCreatorAddress();

    /// @dev Error thrown when token name or symbol is empty
    error InvalidTokenParams();

    /**
     * @notice Constructor
     * @param _usdc USDC token address on Base
     * @param _owner Initial owner address
     */
    constructor(address _usdc, address _owner) Ownable(_owner) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = _usdc;
    }

    /**
     * @notice Create a creator share contract
     * @param creator Address of the creator
     * @param name Token name
     * @param symbol Token symbol
     * @return shareContract Address of deployed share contract
     */
    function createCreatorShares(
        address creator,
        string memory name,
        string memory symbol
    ) external returns (address shareContract) {
        // Validate inputs
        if (creator == address(0)) revert InvalidCreatorAddress();
        if (bytes(name).length == 0 || bytes(symbol).length == 0) {
            revert InvalidTokenParams();
        }

        // Check if shares are unlocked
        if (!sharesUnlocked[creator]) revert SharesNotUnlocked();

        // Check if creator already has a share contract
        if (creatorShareContract[creator] != address(0)) {
            revert ShareContractAlreadyExists();
        }

        // Deploy new CreatorShare contract
        CreatorShare newShare = new CreatorShare(
            name,
            symbol,
            usdc,
            creator // Creator becomes the owner
        );

        shareContract = address(newShare);

        // Record the contract
        creatorShareContract[creator] = shareContract;
        allCreatorShares.push(shareContract);

        emit SharesCreated(creator, shareContract, name, symbol, block.timestamp);
    }

    /**
     * @notice Update creator trading volume (only callable by whitelisted markets)
     * @param creator Address of the creator
     * @param additionalVolume Additional volume to add
     */
    function updateCreatorVolume(
        address creator,
        uint256 additionalVolume
    ) external {
        // Only whitelisted market contracts can update volume
        if (!whitelistedMarkets[msg.sender]) revert NotWhitelistedMarket();

        if (creator == address(0)) revert InvalidCreatorAddress();

        // Update total volume
        uint256 oldVolume = creatorTotalVolume[creator];
        uint256 newVolume = oldVolume + additionalVolume;
        creatorTotalVolume[creator] = newVolume;

        emit VolumeUpdated(creator, additionalVolume, newVolume, block.timestamp);

        // Check if threshold reached and shares not yet unlocked
        if (!sharesUnlocked[creator] && newVolume >= VOLUME_THRESHOLD) {
            sharesUnlocked[creator] = true;
            emit SharesUnlocked(creator, newVolume, block.timestamp);
        }
    }

    /**
     * @notice Add a market contract to whitelist
     * @param market Address of the OpinionMarket contract
     */
    function addMarketContract(address market) external onlyOwner {
        if (market == address(0)) revert InvalidMarketContract();

        whitelistedMarkets[market] = true;
        emit MarketContractAdded(market, block.timestamp);
    }

    /**
     * @notice Remove a market contract from whitelist
     * @param market Address of the OpinionMarket contract
     */
    function removeMarketContract(address market) external onlyOwner {
        if (market == address(0)) revert InvalidMarketContract();

        whitelistedMarkets[market] = false;
        emit MarketContractRemoved(market, block.timestamp);
    }

    /**
     * @notice Get creator's total trading volume
     * @param creator Address of the creator
     * @return volume Total trading volume in USDC
     */
    function getCreatorVolume(address creator) external view returns (uint256 volume) {
        return creatorTotalVolume[creator];
    }

    /**
     * @notice Check if shares are unlocked for a creator
     * @param creator Address of the creator
     * @return unlocked Whether shares are unlocked
     */
    function isSharesUnlocked(address creator) external view returns (bool unlocked) {
        return sharesUnlocked[creator];
    }

    /**
     * @notice Get the share contract address for a creator
     * @param creator Address of the creator
     * @return shareContract Address of creator's share contract (or zero address if none)
     */
    function getCreatorShareContract(
        address creator
    ) external view returns (address shareContract) {
        return creatorShareContract[creator];
    }

    /**
     * @notice Check if a market contract is whitelisted
     * @param market Address to check
     * @return isWhitelisted Whether the market is whitelisted
     */
    function isMarketWhitelisted(address market) external view returns (bool isWhitelisted) {
        return whitelistedMarkets[market];
    }

    /**
     * @notice Get total number of deployed creator shares
     * @return count Number of share contracts
     */
    function getTotalCreatorShares() external view returns (uint256 count) {
        return allCreatorShares.length;
    }

    /**
     * @notice Get all deployed creator share contracts
     * @return shares Array of share contract addresses
     */
    function getAllCreatorShares() external view returns (address[] memory shares) {
        return allCreatorShares;
    }

    /**
     * @notice Get creator share contract at index
     * @param index Index in the allCreatorShares array
     * @return shareContract Address of share contract
     */
    function getCreatorShareAtIndex(uint256 index) external view returns (address shareContract) {
        require(index < allCreatorShares.length, "Index out of bounds");
        return allCreatorShares[index];
    }

    /**
     * @notice Calculate remaining volume needed to unlock shares
     * @param creator Address of the creator
     * @return remaining Remaining volume needed (0 if already unlocked)
     */
    function getRemainingVolumeToUnlock(
        address creator
    ) external view returns (uint256 remaining) {
        if (sharesUnlocked[creator]) {
            return 0;
        }

        uint256 currentVolume = creatorTotalVolume[creator];
        if (currentVolume >= VOLUME_THRESHOLD) {
            return 0;
        }

        return VOLUME_THRESHOLD - currentVolume;
    }

    /**
     * @notice Check if creator can create shares
     * @param creator Address of the creator
     * @return canCreate Whether creator can create shares
     * @return reason Reason if they cannot (empty if they can)
     */
    function canCreateShares(
        address creator
    ) external view returns (bool canCreate, string memory reason) {
        if (creator == address(0)) {
            return (false, "Invalid creator address");
        }

        if (!sharesUnlocked[creator]) {
            return (false, "Shares not unlocked - volume threshold not met");
        }

        if (creatorShareContract[creator] != address(0)) {
            return (false, "Creator already has a share contract");
        }

        return (true, "");
    }
}
