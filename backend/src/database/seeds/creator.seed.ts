import { DataSource } from 'typeorm';
import { Creator } from '../entities/creator.entity';
import { User } from '../entities/user.entity';
import { CreatorStatus } from '../enums';

export async function seedCreators(
  dataSource: DataSource,
  users: User[],
): Promise<Creator[]> {
  const creatorRepository = dataSource.getRepository(Creator);

  // Use Bob and Charlie as qualified creators
  const bobUser = users.find((u) => u.twitterHandle === '@bob_sports');
  const charlieUser = users.find((u) => u.twitterHandle === '@charlie_tech');

  if (!bobUser || !charlieUser) {
    throw new Error('Required users not found for creator seeding');
  }

  const creators = [
    {
      userId: bobUser.id,
      twitterId: bobUser.twitterId,
      twitterHandle: bobUser.twitterHandle,
      followerCount: bobUser.followerCount,
      engagementRate: 4.5,
      postCount30d: 120,
      qualifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      stakePaid: true,
      stakeAmount: 100,
      stakeReturned: false,
      totalMarketVolume: 0,
      sharesUnlocked: true,
      sharesUnlockedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      shareContractAddress: '0xABCD1234567890123456789012345678901234AB',
      totalShares: 1000000,
      status: CreatorStatus.ACTIVE,
    },
    {
      userId: charlieUser.id,
      twitterId: charlieUser.twitterId,
      twitterHandle: charlieUser.twitterHandle,
      followerCount: charlieUser.followerCount,
      engagementRate: 5.2,
      postCount30d: 150,
      qualifiedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      stakePaid: true,
      stakeAmount: 100,
      stakeReturned: false,
      totalMarketVolume: 0,
      sharesUnlocked: true,
      sharesUnlockedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      shareContractAddress: '0xEF123456789012345678901234567890123456EF',
      totalShares: 1000000,
      status: CreatorStatus.ACTIVE,
    },
  ];

  const savedCreators: Creator[] = [];
  for (const creatorData of creators) {
    const existingCreator = await creatorRepository.findOne({
      where: { twitterId: creatorData.twitterId },
    });

    if (!existingCreator) {
      const creator = creatorRepository.create(creatorData);
      savedCreators.push(await creatorRepository.save(creator));
    } else {
      savedCreators.push(existingCreator);
    }
  }

  console.log(`✅ Seeded ${savedCreators.length} creators`);
  return savedCreators;
}
