// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FeeCollector
 * @author Guessly
 * @notice Centralized fee collection contract for platform fees
 * @dev Collects fees from CreatorShare and OpinionMarket contracts
 */
contract FeeCollector is Ownable {
    using SafeERC20 for IERC20;

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice Total fees collected from CreatorShare contracts
    uint256 public totalShareFees;

    /// @notice Total fees collected from OpinionMarket contracts
    uint256 public totalMarketFees;

    /// @notice Mapping of whitelisted depositor contracts
    mapping(address => bool) public whitelistedDepositors;

    /// @notice Emitted when fees are deposited
    event FeesDeposited(
        address indexed source,
        string sourceType,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when fees are withdrawn
    event FeesWithdrawn(
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when depositor is whitelisted
    event DepositorWhitelisted(address indexed depositor, uint256 timestamp);

    /// @notice Emitted when depositor is removed from whitelist
    event DepositorRemoved(address indexed depositor, uint256 timestamp);

    /// @dev Error thrown when caller is not whitelisted
    error NotWhitelisted();

    /// @dev Error thrown when amount is zero
    error AmountCannotBeZero();

    /// @dev Error thrown when address is invalid
    error InvalidAddress();

    /// @dev Error thrown when insufficient balance
    error InsufficientBalance();

    /**
     * @notice Constructor
     * @param _usdc USDC token address
     * @param _owner Initial owner address
     */
    constructor(address _usdc, address _owner) Ownable(_owner) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Deposit fees from CreatorShare contracts
     * @param amount Amount of USDC fees to deposit
     */
    function depositShareFees(uint256 amount) external {
        if (!whitelistedDepositors[msg.sender]) revert NotWhitelisted();
        if (amount == 0) revert AmountCannotBeZero();

        // Transfer USDC from caller
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update tracking
        totalShareFees += amount;

        emit FeesDeposited(msg.sender, "share", amount, block.timestamp);
    }

    /**
     * @notice Deposit fees from OpinionMarket contracts
     * @param amount Amount of USDC fees to deposit
     */
    function depositMarketFees(uint256 amount) external {
        if (!whitelistedDepositors[msg.sender]) revert NotWhitelisted();
        if (amount == 0) revert AmountCannotBeZero();

        // Transfer USDC from caller
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update tracking
        totalMarketFees += amount;

        emit FeesDeposited(msg.sender, "market", amount, block.timestamp);
    }

    /**
     * @notice Withdraw fees to treasury (owner only)
     * @param recipient Address to receive the fees
     * @param amount Amount of USDC to withdraw
     */
    function withdraw(address recipient, uint256 amount) external onlyOwner {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert AmountCannotBeZero();

        uint256 balance = usdc.balanceOf(address(this));
        if (amount > balance) revert InsufficientBalance();

        // Transfer USDC to recipient
        usdc.safeTransfer(recipient, amount);

        emit FeesWithdrawn(recipient, amount, block.timestamp);
    }

    /**
     * @notice Add contract to depositor whitelist
     * @param depositor Address to whitelist
     */
    function addDepositor(address depositor) external onlyOwner {
        if (depositor == address(0)) revert InvalidAddress();

        whitelistedDepositors[depositor] = true;
        emit DepositorWhitelisted(depositor, block.timestamp);
    }

    /**
     * @notice Remove contract from depositor whitelist
     * @param depositor Address to remove
     */
    function removeDepositor(address depositor) external onlyOwner {
        if (depositor == address(0)) revert InvalidAddress();

        whitelistedDepositors[depositor] = false;
        emit DepositorRemoved(depositor, block.timestamp);
    }

    /**
     * @notice Get total fees collected (all sources)
     * @return total Total fees in USDC
     */
    function getTotalFees() external view returns (uint256 total) {
        return totalShareFees + totalMarketFees;
    }

    /**
     * @notice Get fees collected from CreatorShare contracts
     * @return fees Share fees in USDC
     */
    function getShareFees() external view returns (uint256 fees) {
        return totalShareFees;
    }

    /**
     * @notice Get fees collected from OpinionMarket contracts
     * @return fees Market fees in USDC
     */
    function getMarketFees() external view returns (uint256 fees) {
        return totalMarketFees;
    }

    /**
     * @notice Get current USDC balance in contract
     * @return balance Current balance
     */
    function getBalance() external view returns (uint256 balance) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice Check if address is whitelisted depositor
     * @param depositor Address to check
     * @return whitelisted Whether address is whitelisted
     */
    function isWhitelisted(address depositor) external view returns (bool whitelisted) {
        return whitelistedDepositors[depositor];
    }
}
