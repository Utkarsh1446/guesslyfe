import { DataSource } from 'typeorm';
import { OpinionMarket } from '../entities/opinion-market.entity';
import { Creator } from '../entities/creator.entity';
import { MarketStatus, MarketCategory } from '../enums';

export async function seedOpinionMarkets(
  dataSource: DataSource,
  creators: Creator[],
): Promise<OpinionMarket[]> {
  const marketRepository = dataSource.getRepository(OpinionMarket);

  const bobCreator = creators.find(
    (c) => c.twitterHandle === '@bob_sports',
  );
  const charlieCreator = creators.find(
    (c) => c.twitterHandle === '@charlie_tech',
  );

  if (!bobCreator || !charlieCreator) {
    throw new Error('Required creators not found for market seeding');
  }

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  const markets = [
    {
      creatorId: bobCreator.id,
      title: 'Will the Lakers make the NBA playoffs this season?',
      description:
        'Prediction market on whether the Los Angeles Lakers will secure a playoff spot in the current NBA season.',
      category: MarketCategory.SPORTS,
      outcomes: [
        { id: 0, label: 'Yes', description: 'Lakers make playoffs' },
        { id: 1, label: 'No', description: 'Lakers miss playoffs' },
      ],
      duration: sevenDays / 1000,
      endTime: new Date(now + sevenDays),
      status: MarketStatus.ACTIVE,
      volume: 0,
      totalTrades: 0,
      resolutionTime: null,
      winningOutcome: null,
      resolutionNote: null,
      resolvedBy: null,
      contractAddress: '0x1111111111111111111111111111111111111111',
    },
    {
      creatorId: bobCreator.id,
      title: 'Will Messi score 30+ goals this season?',
      description:
        'Prediction on whether Lionel Messi will score 30 or more goals in the current season.',
      category: MarketCategory.SPORTS,
      outcomes: [
        { id: 0, label: 'Yes', description: '30+ goals' },
        { id: 1, label: 'No', description: 'Less than 30 goals' },
      ],
      duration: sevenDays / 1000,
      endTime: new Date(now + 3 * oneDay),
      status: MarketStatus.ACTIVE,
      volume: 0,
      totalTrades: 0,
      resolutionTime: null,
      winningOutcome: null,
      resolutionNote: null,
      resolvedBy: null,
      contractAddress: '0x2222222222222222222222222222222222222222',
    },
    {
      creatorId: charlieCreator.id,
      title: 'Will GPT-5 be released in 2025?',
      description:
        'Market on whether OpenAI will release GPT-5 before the end of 2025.',
      category: MarketCategory.TECHNOLOGY,
      outcomes: [
        { id: 0, label: 'Yes', description: 'GPT-5 released in 2025' },
        { id: 1, label: 'No', description: 'No GPT-5 in 2025' },
      ],
      duration: (180 * oneDay) / 1000,
      endTime: new Date(now + 180 * oneDay),
      status: MarketStatus.ACTIVE,
      volume: 0,
      totalTrades: 0,
      resolutionTime: null,
      winningOutcome: null,
      resolutionNote: null,
      resolvedBy: null,
      contractAddress: '0x3333333333333333333333333333333333333333',
    },
    {
      creatorId: charlieCreator.id,
      title: 'Will Bitcoin reach $100k by end of 2025?',
      description:
        'Prediction market on whether Bitcoin will reach $100,000 USD by December 31, 2025.',
      category: MarketCategory.CRYPTO,
      outcomes: [
        { id: 0, label: 'Yes', description: 'BTC ≥ $100k' },
        { id: 1, label: 'No', description: 'BTC < $100k' },
      ],
      duration: (365 * oneDay) / 1000,
      endTime: new Date(now + 365 * oneDay),
      status: MarketStatus.ACTIVE,
      volume: 0,
      totalTrades: 0,
      resolutionTime: null,
      winningOutcome: null,
      resolutionNote: null,
      resolvedBy: null,
      contractAddress: '0x4444444444444444444444444444444444444444',
    },
  ];

  const savedMarkets: OpinionMarket[] = [];
  for (const marketData of markets) {
    const existingMarket = await marketRepository.findOne({
      where: { title: marketData.title },
    });

    if (!existingMarket) {
      const market = marketRepository.create(marketData);
      savedMarkets.push(await marketRepository.save(market));
    } else {
      savedMarkets.push(existingMarket);
    }
  }

  console.log(`✅ Seeded ${savedMarkets.length} opinion markets`);
  return savedMarkets;
}
