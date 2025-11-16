// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CreatorShareFactory.sol";

/**
 * @title OpinionMarket
 * @author Guessly
 * @notice Prediction market with AMM pricing for binary and multi-outcome markets
 * @dev Implements simplified AMM logic with fee distribution to platform, creator, and shareholders
 */
contract OpinionMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice CreatorShareFactory for volume tracking
    CreatorShareFactory public immutable factory;

    /// @notice Platform fee collector address
    address public platformFeeCollector;

    /// @notice Total fee percentage (1.5% = 150 basis points)
    uint256 public constant TOTAL_FEE_BPS = 150;

    /// @notice Platform fee share (50% of total = 0.75%)
    uint256 public constant PLATFORM_FEE_BPS = 75;

    /// @notice Creator direct fee share (40% of total = 0.6%)
    uint256 public constant CREATOR_FEE_BPS = 60;

    /// @notice Shareholder fee share (10% of total = 0.15%)
    uint256 public constant SHAREHOLDER_FEE_BPS = 15;

    /// @notice Basis points denominator (10000 = 100%)
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Minimum market duration (6 hours)
    uint256 public constant MIN_DURATION = 6 hours;

    /// @notice Maximum market duration (7 days)
    uint256 public constant MAX_DURATION = 7 days;

    /// @notice Minimum number of outcomes
    uint256 public constant MIN_OUTCOMES = 2;

    /// @notice Maximum number of outcomes
    uint256 public constant MAX_OUTCOMES = 4;

    /// @notice Virtual liquidity per outcome for AMM bootstrapping (5000 USDC per outcome)
    /// @dev This is used for price calculation only and is not withdrawable
    uint256 public constant VIRTUAL_LIQUIDITY_PER_OUTCOME = 5000e6;

    /// @notice Market counter for unique IDs
    uint256 public nextMarketId;

    /// @notice Market status enum
    enum MarketStatus {
        Active,
        Resolved,
        Disputed,
        Cancelled
    }

    /// @notice Market struct
    struct Market {
        uint256 id;
        address creator;
        string title;
        string description;
        string[] outcomes;
        uint256 endTime;
        MarketStatus status;
        uint256 totalVolume;
        uint256 winningOutcome;
        bool paused;
        uint256 createdAt;
    }

    /// @notice Mapping of market ID to Market struct
    mapping(uint256 => Market) public markets;

    /// @notice Mapping of market ID => outcome index => reserve amount
    mapping(uint256 => mapping(uint256 => uint256)) public outcomeReserves;

    /// @notice Mapping of market ID => user => outcome => shares owned
    mapping(uint256 => mapping(address => mapping(uint256 => uint256)))
        public userOutcomeShares;

    /// @notice Mapping of market ID => user => has claimed winnings
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    /// @notice Mapping of market ID => total shares per outcome
    mapping(uint256 => mapping(uint256 => uint256)) public totalOutcomeShares;

    /// @notice Emitted when a new market is created
    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string title,
        string[] outcomes,
        uint256 endTime,
        uint256 timestamp
    );

    /// @notice Emitted when a bet is placed
    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        uint256 outcome,
        uint256 amount,
        uint256 shares,
        uint256 timestamp
    );

    /// @notice Emitted when market is resolved
    event MarketResolved(
        uint256 indexed marketId,
        uint256 winningOutcome,
        uint256 timestamp
    );

    /// @notice Emitted when winnings are claimed
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when fees are collected
    event FeesCollected(
        uint256 indexed marketId,
        uint256 platformFee,
        uint256 creatorFee,
        uint256 shareholderFee,
        uint256 timestamp
    );

    /// @notice Emitted when market is paused
    event MarketPaused(uint256 indexed marketId, uint256 timestamp);

    /// @notice Emitted when market is unpaused
    event MarketUnpaused(uint256 indexed marketId, uint256 timestamp);

    /// @dev Error thrown when market does not exist
    error MarketDoesNotExist();

    /// @dev Error thrown when market is not active
    error MarketNotActive();

    /// @dev Error thrown when market has ended
    error MarketEnded();

    /// @dev Error thrown when market is paused
    error MarketIsPaused();

    /// @dev Error thrown when invalid number of outcomes
    error InvalidOutcomeCount();

    /// @dev Error thrown when invalid duration
    error InvalidDuration();

    /// @dev Error thrown when invalid outcome index
    error InvalidOutcome();

    /// @dev Error thrown when amount is zero
    error AmountCannotBeZero();

    /// @dev Error thrown when market not resolved
    error MarketNotResolved();

    /// @dev Error thrown when market already resolved
    error MarketAlreadyResolved();

    /// @dev Error thrown when no winnings to claim
    error NoWinningsToClaim();

    /// @dev Error thrown when already claimed
    error AlreadyClaimed();

    /// @dev Error thrown when market has not ended
    error MarketNotEnded();

    /**
     * @notice Constructor
     * @param _usdc USDC token address
     * @param _factory CreatorShareFactory address
     * @param _platformFeeCollector Platform fee collector address
     * @param _owner Initial owner address
     */
    constructor(
        address _usdc,
        address _factory,
        address _platformFeeCollector,
        address _owner
    ) Ownable(_owner) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_factory != address(0), "Invalid factory address");
        require(_platformFeeCollector != address(0), "Invalid fee collector");

        usdc = IERC20(_usdc);
        factory = CreatorShareFactory(_factory);
        platformFeeCollector = _platformFeeCollector;
        nextMarketId = 1;
    }

    /**
     * @notice Create a new prediction market
     * @param title Market title
     * @param outcomes Array of outcome strings (2-4 outcomes)
     * @param duration Market duration in seconds (6h - 7d)
     * @param description Market description
     * @return marketId ID of created market
     */
    function createMarket(
        string memory title,
        string[] memory outcomes,
        uint256 duration,
        string memory description
    ) external returns (uint256 marketId) {
        // Validate inputs
        if (outcomes.length < MIN_OUTCOMES || outcomes.length > MAX_OUTCOMES) {
            revert InvalidOutcomeCount();
        }
        if (duration < MIN_DURATION || duration > MAX_DURATION) {
            revert InvalidDuration();
        }

        marketId = nextMarketId++;
        uint256 endTime = block.timestamp + duration;

        // Create market
        Market storage market = markets[marketId];
        market.id = marketId;
        market.creator = msg.sender;
        market.title = title;
        market.description = description;
        market.outcomes = outcomes;
        market.endTime = endTime;
        market.status = MarketStatus.Active;
        market.createdAt = block.timestamp;

        // Initialize AMM reserves (starting at 0, will grow with bets)
        // Virtual liquidity is used for price calculation only (see VIRTUAL_LIQUIDITY_PER_OUTCOME)
        for (uint256 i = 0; i < outcomes.length; i++) {
            outcomeReserves[marketId][i] = 0;
        }

        emit MarketCreated(marketId, msg.sender, title, outcomes, endTime, block.timestamp);
    }

    /**
     * @notice Place a bet on a market outcome
     * @param marketId Market ID
     * @param outcome Outcome index (0-based)
     * @param amount Amount in USDC (6 decimals)
     */
    function placeBet(
        uint256 marketId,
        uint256 outcome,
        uint256 amount
    ) external nonReentrant {
        Market storage market = markets[marketId];

        // Validations
        if (market.id == 0) revert MarketDoesNotExist();
        if (market.status != MarketStatus.Active) revert MarketNotActive();
        if (block.timestamp >= market.endTime) revert MarketEnded();
        if (market.paused) revert MarketIsPaused();
        if (outcome >= market.outcomes.length) revert InvalidOutcome();
        if (amount == 0) revert AmountCannotBeZero();

        // Calculate fees
        uint256 totalFee = (amount * TOTAL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 creatorFee = (amount * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
        uint256 shareholderFee = (amount * SHAREHOLDER_FEE_BPS) / BPS_DENOMINATOR;

        uint256 amountAfterFee = amount - totalFee;

        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Calculate shares using AMM formula
        uint256 shares = calculateShares(marketId, outcome, amountAfterFee);

        // Update user shares
        userOutcomeShares[marketId][msg.sender][outcome] += shares;
        totalOutcomeShares[marketId][outcome] += shares;

        // Update outcome reserve
        outcomeReserves[marketId][outcome] += amountAfterFee;

        // Update market volume
        market.totalVolume += amount;

        // Distribute fees
        _distributeFees(
            market.creator,
            platformFee,
            creatorFee,
            shareholderFee,
            amount
        );

        emit BetPlaced(marketId, msg.sender, outcome, amount, shares, block.timestamp);
        emit FeesCollected(
            marketId,
            platformFee,
            creatorFee,
            shareholderFee,
            block.timestamp
        );
    }

    /**
     * @notice Resolve a market with winning outcome
     * @param marketId Market ID
     * @param winningOutcome Winning outcome index
     */
    function resolveMarket(
        uint256 marketId,
        uint256 winningOutcome
    ) external onlyOwner {
        Market storage market = markets[marketId];

        if (market.id == 0) revert MarketDoesNotExist();
        if (block.timestamp < market.endTime) revert MarketNotEnded();
        if (market.status == MarketStatus.Resolved) revert MarketAlreadyResolved();
        if (winningOutcome >= market.outcomes.length) revert InvalidOutcome();

        market.status = MarketStatus.Resolved;
        market.winningOutcome = winningOutcome;

        emit MarketResolved(marketId, winningOutcome, block.timestamp);
    }

    /**
     * @notice Claim winnings from a resolved market
     * @param marketId Market ID
     */
    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];

        if (market.id == 0) revert MarketDoesNotExist();
        if (market.status != MarketStatus.Resolved) revert MarketNotResolved();
        if (hasClaimed[marketId][msg.sender]) revert AlreadyClaimed();

        uint256 userShares = userOutcomeShares[marketId][msg.sender][
            market.winningOutcome
        ];
        if (userShares == 0) revert NoWinningsToClaim();

        // Calculate payout proportionally
        uint256 totalWinningShares = totalOutcomeShares[marketId][market.winningOutcome];
        uint256 totalPayout = _calculateTotalPayout(marketId);
        uint256 userPayout = (totalPayout * userShares) / totalWinningShares;

        // Mark as claimed
        hasClaimed[marketId][msg.sender] = true;

        // Transfer winnings
        usdc.safeTransfer(msg.sender, userPayout);

        emit WinningsClaimed(marketId, msg.sender, userPayout, block.timestamp);
    }

    /**
     * @notice Pause a market (emergency)
     * @param marketId Market ID
     */
    function pauseMarket(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        if (market.id == 0) revert MarketDoesNotExist();

        market.paused = true;
        emit MarketPaused(marketId, block.timestamp);
    }

    /**
     * @notice Unpause a market
     * @param marketId Market ID
     */
    function unpauseMarket(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        if (market.id == 0) revert MarketDoesNotExist();

        market.paused = false;
        emit MarketUnpaused(marketId, block.timestamp);
    }

    /**
     * @notice Get market information
     * @param marketId Market ID
     * @return market Market struct
     */
    function getMarketInfo(uint256 marketId) external view returns (Market memory market) {
        return markets[marketId];
    }

    /**
     * @notice Get user's position in a market
     * @param marketId Market ID
     * @param user User address
     * @return shares Array of shares per outcome
     */
    function getUserPosition(
        uint256 marketId,
        address user
    ) external view returns (uint256[] memory shares) {
        Market storage market = markets[marketId];
        shares = new uint256[](market.outcomes.length);

        for (uint256 i = 0; i < market.outcomes.length; i++) {
            shares[i] = userOutcomeShares[marketId][user][i];
        }
    }

    /**
     * @notice Get outcome probability/odds
     * @param marketId Market ID
     * @param outcome Outcome index
     * @return probability Probability in basis points (10000 = 100%)
     */
    function getOutcomeProbability(
        uint256 marketId,
        uint256 outcome
    ) external view returns (uint256 probability) {
        Market storage market = markets[marketId];
        if (outcome >= market.outcomes.length) revert InvalidOutcome();

        // Calculate total effective reserves (real + virtual)
        uint256 totalEffectiveReserves = 0;
        for (uint256 i = 0; i < market.outcomes.length; i++) {
            totalEffectiveReserves += outcomeReserves[marketId][i] + VIRTUAL_LIQUIDITY_PER_OUTCOME;
        }

        // Calculate effective reserve for the outcome
        uint256 outcomeEffectiveReserve = outcomeReserves[marketId][outcome] + VIRTUAL_LIQUIDITY_PER_OUTCOME;

        // Probability = (effective outcome reserve / total effective reserves) * 10000
        probability = (outcomeEffectiveReserve * BPS_DENOMINATOR) / totalEffectiveReserves;
    }

    /**
     * @notice Update platform fee collector
     * @param newCollector New collector address
     */
    function updatePlatformFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid address");
        platformFeeCollector = newCollector;
    }

    /**
     * @notice Calculate shares for a bet amount using AMM formula with virtual liquidity
     * @param marketId Market ID
     * @param outcome Outcome index
     * @param amount Amount to bet (after fees)
     * @return shares Number of shares
     * @dev Uses constant-product AMM with virtual liquidity bootstrapping
     *      shares = amount / price, where price = effective_reserve / total_effective_reserves
     */
    function calculateShares(
        uint256 marketId,
        uint256 outcome,
        uint256 amount
    ) public view returns (uint256 shares) {
        Market storage market = markets[marketId];

        // Calculate total effective reserves across all outcomes
        uint256 totalEffectiveReserves = 0;
        for (uint256 i = 0; i < market.outcomes.length; i++) {
            totalEffectiveReserves += outcomeReserves[marketId][i] + VIRTUAL_LIQUIDITY_PER_OUTCOME;
        }

        // Calculate effective reserve for the chosen outcome
        uint256 outcomeEffectiveReserve = outcomeReserves[marketId][outcome] + VIRTUAL_LIQUIDITY_PER_OUTCOME;

        // Price of this outcome = effective_reserve / total_effective_reserves
        // shares = amount / price = (amount * total_effective_reserves) / effective_reserve
        // This ensures more shares when outcome is less likely (lower reserve/price)
        shares = (amount * totalEffectiveReserves) / outcomeEffectiveReserve;
    }

    /**
     * @dev Distribute fees to platform, creator, and shareholders
     */
    function _distributeFees(
        address creator,
        uint256 platformFee,
        uint256 creatorFee,
        uint256 shareholderFee,
        uint256 totalAmount
    ) internal {
        // Transfer platform fee
        usdc.safeTransfer(platformFeeCollector, platformFee);

        // Transfer creator fee directly
        usdc.safeTransfer(creator, creatorFee);

        // Report volume to factory (includes shareholder fee)
        // Note: shareholderFee stays in contract, will be distributed via CreatorShare dividends
        factory.updateCreatorVolume(creator, totalAmount);
    }

    /**
     * @dev Calculate total payout for a market
     */
    function _calculateTotalPayout(uint256 marketId) internal view returns (uint256 total) {
        Market storage market = markets[marketId];

        // Total payout = sum of all reserves
        for (uint256 i = 0; i < market.outcomes.length; i++) {
            total += outcomeReserves[marketId][i];
        }
    }
}
