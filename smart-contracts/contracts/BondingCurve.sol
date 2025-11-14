// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BondingCurve
 * @author Guessly
 * @notice Library for calculating share prices using a quadratic bonding curve
 * @dev Implements the formula: Price = (Supply²) / 1400
 *      Uses fixed-point arithmetic with 18 decimal precision
 *      Maximum supply is capped at 1000 shares
 */
library BondingCurve {
    /// @notice Maximum number of shares allowed
    uint256 public constant MAX_SUPPLY = 1000;

    /// @notice Curve parameter divisor (1400)
    uint256 private constant CURVE_DIVISOR = 1400;

    /// @notice Integration divisor for area under curve (3 * 1400 = 4200)
    uint256 private constant INTEGRATION_DIVISOR = 4200;

    /// @notice Scaling factor for fixed-point math (18 decimals)
    uint256 private constant PRECISION = 1e18;

    /// @dev Error thrown when supply exceeds maximum
    error SupplyExceedsMaximum();

    /// @dev Error thrown when amount is zero
    error AmountCannotBeZero();

    /// @dev Error thrown when selling more than current supply
    error InsufficientSupply();

    /**
     * @notice Calculate the price of a single share at a given supply level
     * @dev Uses the formula: Price = (Supply²) / 1400
     *      Returns price in wei (18 decimal precision)
     * @param supply Current supply of shares
     * @return price Price of one share at the given supply level
     */
    function calculatePrice(uint256 supply) internal pure returns (uint256 price) {
        // Handle edge case: supply = 0
        if (supply == 0) {
            return 0;
        }

        // Price = (Supply² * PRECISION) / CURVE_DIVISOR
        // Using PRECISION to maintain decimal accuracy
        price = (supply * supply * PRECISION) / CURVE_DIVISOR;

        return price;
    }

    /**
     * @notice Calculate total cost to buy a specific amount of shares
     * @dev Uses integration of the bonding curve formula
     *      Total Cost = (Supply_end³ - Supply_start³) / 4200
     *      where Supply_end = currentSupply + amount
     * @param currentSupply Current total supply of shares
     * @param amount Number of shares to purchase
     * @return totalCost Total cost in wei to purchase the shares
     */
    function calculateBuyPrice(
        uint256 currentSupply,
        uint256 amount
    ) internal pure returns (uint256 totalCost) {
        // Validate inputs
        if (amount == 0) revert AmountCannotBeZero();

        uint256 newSupply = currentSupply + amount;
        if (newSupply > MAX_SUPPLY) revert SupplyExceedsMaximum();

        // Handle edge case: buying first share
        if (currentSupply == 0 && amount == 1) {
            // (1³ - 0³) * PRECISION / INTEGRATION_DIVISOR
            return PRECISION / INTEGRATION_DIVISOR;
        }

        // Calculate area under the curve using integration
        // Area = (newSupply³ - currentSupply³) / INTEGRATION_DIVISOR
        uint256 endCubed = newSupply ** 3;
        uint256 startCubed = currentSupply ** 3;

        // Multiply by PRECISION for fixed-point math
        totalCost = ((endCubed - startCubed) * PRECISION) / INTEGRATION_DIVISOR;

        return totalCost;
    }

    /**
     * @notice Calculate total proceeds from selling a specific amount of shares
     * @dev Uses integration of the bonding curve formula in reverse
     *      Total Proceeds = (Supply_start³ - Supply_end³) / 4200
     *      where Supply_end = currentSupply - amount
     * @param currentSupply Current total supply of shares
     * @param amount Number of shares to sell
     * @return totalProceeds Total proceeds in wei from selling the shares
     */
    function calculateSellPrice(
        uint256 currentSupply,
        uint256 amount
    ) internal pure returns (uint256 totalProceeds) {
        // Validate inputs
        if (amount == 0) revert AmountCannotBeZero();
        if (amount > currentSupply) revert InsufficientSupply();

        uint256 newSupply = currentSupply - amount;

        // Handle edge case: selling to zero supply
        if (newSupply == 0) {
            // Return the entire area under the curve from 0 to currentSupply
            uint256 currentCubed = currentSupply ** 3;
            return (currentCubed * PRECISION) / INTEGRATION_DIVISOR;
        }

        // Calculate area under the curve using integration
        // Area = (currentSupply³ - newSupply³) / INTEGRATION_DIVISOR
        uint256 startCubed = currentSupply ** 3;
        uint256 endCubed = newSupply ** 3;

        // Multiply by PRECISION for fixed-point math
        totalProceeds = ((startCubed - endCubed) * PRECISION) / INTEGRATION_DIVISOR;

        return totalProceeds;
    }

    /**
     * @notice Calculate the average price per share for a buy transaction
     * @dev Divides total cost by amount
     * @param currentSupply Current total supply of shares
     * @param amount Number of shares to purchase
     * @return avgPrice Average price per share in wei
     */
    function calculateAverageBuyPrice(
        uint256 currentSupply,
        uint256 amount
    ) internal pure returns (uint256 avgPrice) {
        uint256 totalCost = calculateBuyPrice(currentSupply, amount);
        return totalCost / amount;
    }

    /**
     * @notice Calculate the average price per share for a sell transaction
     * @dev Divides total proceeds by amount
     * @param currentSupply Current total supply of shares
     * @param amount Number of shares to sell
     * @return avgPrice Average price per share in wei
     */
    function calculateAverageSellPrice(
        uint256 currentSupply,
        uint256 amount
    ) internal pure returns (uint256 avgPrice) {
        uint256 totalProceeds = calculateSellPrice(currentSupply, amount);
        return totalProceeds / amount;
    }
}
