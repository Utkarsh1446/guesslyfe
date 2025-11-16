import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingOpinionMarketColumns1763108000000 implements MigrationInterface {
  name = 'AddMissingOpinionMarketColumns1763108000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add marketId column (blockchain market ID)
    await queryRunner.query(`
      ALTER TABLE "opinion_markets"
      ADD COLUMN "marketId" bigint
    `);

    // Add creatorAddress column
    await queryRunner.query(`
      ALTER TABLE "opinion_markets"
      ADD COLUMN "creatorAddress" character varying
    `);

    // Add cancelled column
    await queryRunner.query(`
      ALTER TABLE "opinion_markets"
      ADD COLUMN "cancelled" boolean NOT NULL DEFAULT false
    `);

    // Add isResolved column
    await queryRunner.query(`
      ALTER TABLE "opinion_markets"
      ADD COLUMN "isResolved" boolean NOT NULL DEFAULT false
    `);

    // Add sharesPurchased column to market_trades (referenced in entity but missing in migration)
    await queryRunner.query(`
      ALTER TABLE "market_trades"
      ADD COLUMN "sharesPurchased" numeric(18,6) NOT NULL DEFAULT 0
    `);

    // Add transactionHash column to market_trades (referenced in entity but missing)
    await queryRunner.query(`
      ALTER TABLE "market_trades"
      ADD COLUMN "transactionHash" character varying
    `);

    // Create index on marketId for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_opinion_markets_marketId"
      ON "opinion_markets" ("marketId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_opinion_markets_marketId"`);
    await queryRunner.query(`ALTER TABLE "market_trades" DROP COLUMN "transactionHash"`);
    await queryRunner.query(`ALTER TABLE "market_trades" DROP COLUMN "sharesPurchased"`);
    await queryRunner.query(`ALTER TABLE "opinion_markets" DROP COLUMN "isResolved"`);
    await queryRunner.query(`ALTER TABLE "opinion_markets" DROP COLUMN "cancelled"`);
    await queryRunner.query(`ALTER TABLE "opinion_markets" DROP COLUMN "creatorAddress"`);
    await queryRunner.query(`ALTER TABLE "opinion_markets" DROP COLUMN "marketId"`);
  }
}
