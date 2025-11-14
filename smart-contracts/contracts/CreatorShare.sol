// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./BondingCurve.sol";

/**
 * @title CreatorShare
 * @author Guessly
 * @notice ERC20 token with bonding curve pricing and dividend distribution
 * @dev Implements a quadratic bonding curve for share pricing with USDC as payment token
 */
contract CreatorShare is ERC20, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using BondingCurve for *;

    /// @notice USDC token contract on Base
    IERC20 public immutable usdc;

    /// @notice Maximum supply of shares (1000)
    uint256 public constant MAX_SUPPLY = 1000;

    /// @notice Sell fee percentage (5%)
    uint256 public constant SELL_FEE_PERCENT = 5;

    /// @notice Fee denominator for percentage calculations
    uint256 public constant FEE_DENOMINATOR = 100;

    /// @notice Accumulated rewards for shareholders
    uint256 public rewardPool;

    /// @notice Accumulated fees for platform
    uint256 public platformFees;

    /// @notice Current dividend epoch number
    uint256 public epochNumber;

    /// @notice Total shares in circulation at current supply
    uint256 public currentSupply;

    /// @dev Mapping of epoch => total shares at epoch finalization
    mapping(uint256 => uint256) private epochTotalShares;

    /// @dev Mapping of epoch => reward pool amount at epoch finalization
    mapping(uint256 => uint256) private epochRewardPool;

    /// @dev Mapping of user => epoch => shares held at epoch start
    mapping(address => mapping(uint256 => uint256)) private userEpochShares;

    /// @dev Mapping of user => last epoch where dividends were claimed
    mapping(address => uint256) private lastClaimedEpoch;

    /// @dev Mapping of user => whether they've been recorded in current epoch
    mapping(address => bool) private recordedInEpoch;

    /// @notice Emitted when shares are purchased
    event SharesPurchased(
        address indexed buyer,
        uint256 amount,
        uint256 cost,
        uint256 timestamp
    );

    /// @notice Emitted when shares are sold
    event SharesSold(
        address indexed seller,
        uint256 amount,
        uint256 proceeds,
        uint256 fee,
        uint256 timestamp
    );

    /// @notice Emitted when an epoch is finalized
    event EpochFinalized(
        uint256 indexed epochNumber,
        uint256 rewardPool,
        uint256 totalShares,
        uint256 timestamp
    );

    /// @notice Emitted when dividends are claimed
    event DividendsClaimed(
        address indexed user,
        uint256 amount,
        uint256 fromEpoch,
        uint256 toEpoch,
        uint256 timestamp
    );

    /// @notice Emitted when platform fees are withdrawn
    event PlatformFeesWithdrawn(address indexed recipient, uint256 amount);

    /// @dev Error thrown when amount is zero
    error AmountCannotBeZero();

    /// @dev Error thrown when max supply would be exceeded
    error MaxSupplyExceeded();

    /// @dev Error thrown when user has insufficient shares
    error InsufficientShares();

    /// @dev Error thrown when payment is insufficient
    error InsufficientPayment();

    /// @dev Error thrown when no dividends are available
    error NoDividendsAvailable();

    /**
     * @notice Constructor
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _usdc USDC token address on Base
     * @param _owner Initial owner address
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _usdc,
        address _owner
    ) ERC20(_name, _symbol) Ownable(_owner) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
        epochNumber = 1;
    }

    /**
     * @notice Buy shares with USDC using bonding curve pricing
     * @param amount Number of shares to purchase
     */
    function buyShares(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert AmountCannotBeZero();
        if (currentSupply + amount > MAX_SUPPLY) revert MaxSupplyExceeded();

        // Calculate cost using bonding curve
        uint256 cost = BondingCurve.calculateBuyPrice(currentSupply, amount);

        // Convert from 18 decimals (ETH) to 6 decimals (USDC)
        uint256 costInUsdc = cost / 1e12;

        // Transfer USDC from buyer
        usdc.safeTransferFrom(msg.sender, address(this), costInUsdc);

        // Record user's shares for current epoch
        _recordUserShares(msg.sender);

        // Mint shares to buyer
        _mint(msg.sender, amount);
        currentSupply += amount;

        emit SharesPurchased(msg.sender, amount, costInUsdc, block.timestamp);
    }

    /**
     * @notice Sell shares for USDC with 5% fee
     * @param amount Number of shares to sell
     */
    function sellShares(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert AmountCannotBeZero();
        if (balanceOf(msg.sender) < amount) revert InsufficientShares();

        // Calculate proceeds using bonding curve
        uint256 proceeds = BondingCurve.calculateSellPrice(currentSupply, amount);

        // Convert from 18 decimals (ETH) to 6 decimals (USDC)
        uint256 proceedsInUsdc = proceeds / 1e12;

        // Calculate 5% fee
        uint256 fee = (proceedsInUsdc * SELL_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 netProceeds = proceedsInUsdc - fee;

        // Split fee: 50% to reward pool, 50% to platform
        uint256 rewardShare = fee / 2;
        uint256 platformShare = fee - rewardShare;

        rewardPool += rewardShare;
        platformFees += platformShare;

        // Update user's recorded shares before burning
        _recordUserShares(msg.sender);

        // Burn shares from seller
        _burn(msg.sender, amount);
        currentSupply -= amount;

        // Transfer net proceeds to seller
        usdc.safeTransfer(msg.sender, netProceeds);

        emit SharesSold(msg.sender, amount, netProceeds, fee, block.timestamp);
    }

    /**
     * @notice Get the cost to buy a specific number of shares
     * @param amount Number of shares
     * @return cost Cost in USDC (6 decimals)
     */
    function getBuyPrice(uint256 amount) external view returns (uint256 cost) {
        if (amount == 0) return 0;
        if (currentSupply + amount > MAX_SUPPLY) revert MaxSupplyExceeded();

        uint256 costInWei = BondingCurve.calculateBuyPrice(currentSupply, amount);
        cost = costInWei / 1e12; // Convert to USDC decimals
    }

    /**
     * @notice Get the proceeds from selling a specific number of shares (after fee)
     * @param amount Number of shares
     * @return proceeds Net proceeds in USDC (6 decimals) after 5% fee
     */
    function getSellPrice(uint256 amount) external view returns (uint256 proceeds) {
        if (amount == 0) return 0;
        if (amount > currentSupply) revert InsufficientShares();

        uint256 proceedsInWei = BondingCurve.calculateSellPrice(currentSupply, amount);
        uint256 proceedsInUsdc = proceedsInWei / 1e12;

        // Subtract 5% fee
        uint256 fee = (proceedsInUsdc * SELL_FEE_PERCENT) / FEE_DENOMINATOR;
        proceeds = proceedsInUsdc - fee;
    }

    /**
     * @notice Finalize the current dividend epoch
     * @dev Can only be called by owner. Snapshots reward pool and total shares.
     */
    function finalizeEpoch() external onlyOwner {
        // Store snapshot of reward pool and total shares for this epoch
        epochRewardPool[epochNumber] = rewardPool;
        epochTotalShares[epochNumber] = totalSupply();

        emit EpochFinalized(
            epochNumber,
            rewardPool,
            totalSupply(),
            block.timestamp
        );

        // Reset reward pool and move to next epoch
        rewardPool = 0;
        epochNumber++;

        // Reset all user epoch recordings for new epoch
        // Note: This doesn't clear the mapping, users are re-recorded as needed
    }

    /**
     * @notice Claim accumulated dividends from all unclaimed epochs
     */
    function claimDividends() external nonReentrant {
        uint256 totalDividends = 0;
        uint256 fromEpoch = lastClaimedEpoch[msg.sender] + 1;
        uint256 toEpoch = epochNumber - 1; // Don't claim current epoch

        if (fromEpoch > toEpoch) revert NoDividendsAvailable();

        // Calculate dividends from all unclaimed epochs
        for (uint256 i = fromEpoch; i <= toEpoch; i++) {
            uint256 userShares = userEpochShares[msg.sender][i];
            uint256 totalShares = epochTotalShares[i];
            uint256 poolAmount = epochRewardPool[i];

            if (userShares > 0 && totalShares > 0) {
                uint256 dividend = (poolAmount * userShares) / totalShares;
                totalDividends += dividend;
            }
        }

        if (totalDividends == 0) revert NoDividendsAvailable();

        // Update last claimed epoch
        lastClaimedEpoch[msg.sender] = toEpoch;

        // Transfer dividends
        usdc.safeTransfer(msg.sender, totalDividends);

        emit DividendsClaimed(
            msg.sender,
            totalDividends,
            fromEpoch,
            toEpoch,
            block.timestamp
        );
    }

    /**
     * @notice Get pending dividends for a user
     * @param user Address to check
     * @return pendingAmount Total pending dividend amount in USDC
     */
    function getPendingDividends(address user) external view returns (uint256 pendingAmount) {
        uint256 fromEpoch = lastClaimedEpoch[user] + 1;
        uint256 toEpoch = epochNumber - 1;

        if (fromEpoch > toEpoch) return 0;

        for (uint256 i = fromEpoch; i <= toEpoch; i++) {
            uint256 userShares = userEpochShares[user][i];
            uint256 totalShares = epochTotalShares[i];
            uint256 poolAmount = epochRewardPool[i];

            if (userShares > 0 && totalShares > 0) {
                pendingAmount += (poolAmount * userShares) / totalShares;
            }
        }
    }

    /**
     * @notice Withdraw accumulated platform fees
     * @param recipient Address to receive the fees
     */
    function withdrawPlatformFees(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        uint256 amount = platformFees;
        require(amount > 0, "No fees to withdraw");

        platformFees = 0;
        usdc.safeTransfer(recipient, amount);

        emit PlatformFeesWithdrawn(recipient, amount);
    }

    /**
     * @notice Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Get user's share balance at a specific epoch
     * @param user Address to check
     * @param epoch Epoch number
     * @return shares Number of shares held
     */
    function getUserEpochShares(
        address user,
        uint256 epoch
    ) external view returns (uint256 shares) {
        return userEpochShares[user][epoch];
    }

    /**
     * @notice Get total shares at a specific epoch
     * @param epoch Epoch number
     * @return shares Total shares at epoch
     */
    function getEpochTotalShares(uint256 epoch) external view returns (uint256 shares) {
        return epochTotalShares[epoch];
    }

    /**
     * @notice Get reward pool amount at a specific epoch
     * @param epoch Epoch number
     * @return amount Reward pool amount
     */
    function getEpochRewardPool(uint256 epoch) external view returns (uint256 amount) {
        return epochRewardPool[epoch];
    }

    /**
     * @dev Record user's current shares for the current epoch
     * @param user Address to record
     */
    function _recordUserShares(address user) internal {
        if (!recordedInEpoch[user]) {
            userEpochShares[user][epochNumber] = balanceOf(user);
            recordedInEpoch[user] = true;
        }
    }

    /**
     * @dev Override _update to track user shares across epochs
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        // Record shares before transfer for both parties
        if (from != address(0) && to != address(0)) {
            _recordUserShares(from);
            _recordUserShares(to);
        }

        super._update(from, to, value);

        // Update recorded shares after transfer
        if (from != address(0)) {
            userEpochShares[from][epochNumber] = balanceOf(from);
        }
        if (to != address(0)) {
            userEpochShares[to][epochNumber] = balanceOf(to);
        }
    }
}
