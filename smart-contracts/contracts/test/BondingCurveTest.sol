// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../BondingCurve.sol";

/**
 * @title BondingCurveTest
 * @notice Test wrapper contract to expose BondingCurve library functions
 * @dev This contract is only used for testing purposes
 */
contract BondingCurveTest {
    using BondingCurve for *;

    /**
     * @notice Wrapper for BondingCurve.calculatePrice
     */
    function calculatePrice(uint256 supply) external pure returns (uint256) {
        return BondingCurve.calculatePrice(supply);
    }

    /**
     * @notice Wrapper for BondingCurve.calculateBuyPrice
     */
    function calculateBuyPrice(
        uint256 currentSupply,
        uint256 amount
    ) external pure returns (uint256) {
        return BondingCurve.calculateBuyPrice(currentSupply, amount);
    }

    /**
     * @notice Wrapper for BondingCurve.calculateSellPrice
     */
    function calculateSellPrice(
        uint256 currentSupply,
        uint256 amount
    ) external pure returns (uint256) {
        return BondingCurve.calculateSellPrice(currentSupply, amount);
    }

    /**
     * @notice Wrapper for BondingCurve.calculateAverageBuyPrice
     */
    function calculateAverageBuyPrice(
        uint256 currentSupply,
        uint256 amount
    ) external pure returns (uint256) {
        return BondingCurve.calculateAverageBuyPrice(currentSupply, amount);
    }

    /**
     * @notice Wrapper for BondingCurve.calculateAverageSellPrice
     */
    function calculateAverageSellPrice(
        uint256 currentSupply,
        uint256 amount
    ) external pure returns (uint256) {
        return BondingCurve.calculateAverageSellPrice(currentSupply, amount);
    }

    /**
     * @notice Get the maximum supply constant
     */
    function MAX_SUPPLY() external pure returns (uint256) {
        return BondingCurve.MAX_SUPPLY;
    }
}
