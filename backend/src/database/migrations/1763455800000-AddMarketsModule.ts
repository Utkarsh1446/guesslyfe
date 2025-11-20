import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarketsModule1763455800000 implements MigrationInterface {
  name = 'AddMarketsModule1763455800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create markets table
    await queryRunner.query(`
      CREATE TABLE "markets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar NOT NULL,
        "description" text NOT NULL,
        "category" varchar NOT NULL DEFAULT 'other',
        "status" varchar NOT NULL DEFAULT 'active',
        "contractAddress" varchar,
        "txHash" varchar,
        "creatorId" uuid NOT NULL,
        "endTime" timestamp NOT NULL,
        "duration" integer NOT NULL,
        "resolutionCriteria" text,
        "evidenceLinks" text,
        "tags" text,
        "totalVolume" decimal(18,6) DEFAULT '0',
        "totalLiquidity" decimal(18,6) DEFAULT '0',
        "participantCount" integer DEFAULT 0,
        "tradeCount" integer DEFAULT 0,
        "winningOutcomeIndex" integer,
        "resolvedAt" timestamp,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "FK_markets_creator" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for markets
    await queryRunner.query(`CREATE INDEX "IDX_markets_status" ON "markets"("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_markets_category" ON "markets"("category")`);
    await queryRunner.query(`CREATE INDEX "IDX_markets_creatorId" ON "markets"("creatorId")`);
    await queryRunner.query(`CREATE INDEX "IDX_markets_endTime" ON "markets"("endTime")`);
    await queryRunner.query(`CREATE INDEX "IDX_markets_contractAddress" ON "markets"("contractAddress")`);

    // Create outcomes table
    await queryRunner.query(`
      CREATE TABLE "outcomes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "marketId" uuid NOT NULL,
        "outcomeIndex" integer NOT NULL,
        "text" varchar NOT NULL,
        "initialProbability" decimal(5,2) NOT NULL,
        "currentProbability" decimal(5,2) DEFAULT '0',
        "totalShares" decimal(18,6) DEFAULT '0',
        "totalStaked" decimal(18,6) DEFAULT '0',
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "FK_outcomes_market" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for outcomes
    await queryRunner.query(`CREATE INDEX "IDX_outcomes_marketId" ON "outcomes"("marketId")`);
    await queryRunner.query(`CREATE INDEX "IDX_outcomes_outcomeIndex" ON "outcomes"("outcomeIndex")`);

    // Create positions table
    await queryRunner.query(`
      CREATE TABLE "positions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "marketId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "outcomeId" uuid NOT NULL,
        "walletAddress" varchar NOT NULL,
        "shares" decimal(18,6) DEFAULT '0',
        "costBasis" decimal(18,6) DEFAULT '0',
        "averagePrice" decimal(18,6) DEFAULT '0',
        "realizedPnl" decimal(18,6) DEFAULT '0',
        "claimed" boolean DEFAULT false,
        "claimedAmount" decimal(18,6),
        "claimedAt" timestamp,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "FK_positions_market" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_positions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_positions_outcome" FOREIGN KEY ("outcomeId") REFERENCES "outcomes"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_positions_market_user_outcome" UNIQUE ("marketId", "userId", "outcomeId")
      )
    `);

    // Create indexes for positions
    await queryRunner.query(`CREATE INDEX "IDX_positions_marketId" ON "positions"("marketId")`);
    await queryRunner.query(`CREATE INDEX "IDX_positions_userId" ON "positions"("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_positions_outcomeId" ON "positions"("outcomeId")`);
    await queryRunner.query(`CREATE INDEX "IDX_positions_walletAddress" ON "positions"("walletAddress")`);

    // Create trades table
    await queryRunner.query(`
      CREATE TABLE "trades" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "marketId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "outcomeId" uuid NOT NULL,
        "walletAddress" varchar NOT NULL,
        "action" varchar NOT NULL,
        "shares" decimal(18,6) NOT NULL,
        "amount" decimal(18,6) NOT NULL,
        "price" decimal(18,6) NOT NULL,
        "fee" decimal(18,6) DEFAULT '0',
        "txHash" varchar,
        "blockNumber" varchar,
        "blockTimestamp" timestamp,
        "createdAt" timestamp DEFAULT now(),
        CONSTRAINT "FK_trades_market" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trades_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trades_outcome" FOREIGN KEY ("outcomeId") REFERENCES "outcomes"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for trades
    await queryRunner.query(`CREATE INDEX "IDX_trades_marketId" ON "trades"("marketId")`);
    await queryRunner.query(`CREATE INDEX "IDX_trades_userId" ON "trades"("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_trades_outcomeId" ON "trades"("outcomeId")`);
    await queryRunner.query(`CREATE INDEX "IDX_trades_walletAddress" ON "trades"("walletAddress")`);
    await queryRunner.query(`CREATE INDEX "IDX_trades_txHash" ON "trades"("txHash")`);
    await queryRunner.query(`CREATE INDEX "IDX_trades_createdAt" ON "trades"("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "trades"`);
    await queryRunner.query(`DROP TABLE "positions"`);
    await queryRunner.query(`DROP TABLE "outcomes"`);
    await queryRunner.query(`DROP TABLE "markets"`);
  }
}
