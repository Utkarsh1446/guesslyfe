/**
 * Guessly Smart Contract Types
 * 
 * Auto-generated TypeScript types for all Guessly smart contracts.
 * Generated from TypeChain.
 */

// Contract Types
export type { BondingCurve } from "./BondingCurve";
export type { CreatorShare } from "./CreatorShare";
export type { CreatorShareFactory } from "./CreatorShareFactory";
export type { OpinionMarket } from "./OpinionMarket";
export type { FeeCollector } from "./FeeCollector";

// Common Types
export * from "./common";

// ABIs
import BondingCurveABI from "./abis/BondingCurve.json";
import CreatorShareABI from "./abis/CreatorShare.json";
import CreatorShareFactoryABI from "./abis/CreatorShareFactory.json";
import OpinionMarketABI from "./abis/OpinionMarket.json";
import FeeCollectorABI from "./abis/FeeCollector.json";

export const ABIs = {
  BondingCurve: BondingCurveABI,
  CreatorShare: CreatorShareABI,
  CreatorShareFactory: CreatorShareFactoryABI,
  OpinionMarket: OpinionMarketABI,
  FeeCollector: FeeCollectorABI,
};

// Type-safe ABI access
export {
  BondingCurveABI,
  CreatorShareABI,
  CreatorShareFactoryABI,
  OpinionMarketABI,
  FeeCollectorABI,
};
