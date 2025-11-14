import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';

export async function seedUsers(dataSource: DataSource): Promise<User[]> {
  const userRepository = dataSource.getRepository(User);

  const users = [
    {
      twitterId: '1234567890',
      twitterHandle: '@guessly_admin',
      displayName: 'Guessly Admin',
      profilePictureUrl: 'https://pbs.twimg.com/profile_images/default.jpg',
      bio: 'Official Guessly unrestricted account for platform management',
      walletAddress: null,
      followerCount: 10000,
      followingCount: 100,
      email: 'admin@guessly.com',
      isAdmin: true,
      lastLoginAt: new Date(),
    },
    {
      twitterId: '1234567891',
      twitterHandle: '@alice_trader',
      displayName: 'Alice Thompson',
      profilePictureUrl: 'https://pbs.twimg.com/profile_images/default.jpg',
      bio: 'Crypto enthusiast and prediction market expert',
      walletAddress: '0x1234567890123456789012345678901234567890',
      followerCount: 5000,
      followingCount: 500,
      email: 'alice@example.com',
      isAdmin: false,
      lastLoginAt: new Date(),
    },
    {
      twitterId: '1234567892',
      twitterHandle: '@bob_sports',
      displayName: 'Bob Johnson',
      profilePictureUrl: 'https://pbs.twimg.com/profile_images/default.jpg',
      bio: 'Sports analyst and content creator',
      walletAddress: '0x2345678901234567890123456789012345678901',
      followerCount: 150000,
      followingCount: 800,
      email: 'bob@example.com',
      isAdmin: false,
      lastLoginAt: new Date(),
    },
    {
      twitterId: '1234567893',
      twitterHandle: '@charlie_tech',
      displayName: 'Charlie Williams',
      profilePictureUrl: 'https://pbs.twimg.com/profile_images/default.jpg',
      bio: 'Tech influencer covering AI and blockchain',
      walletAddress: '0x3456789012345678901234567890123456789012',
      followerCount: 200000,
      followingCount: 1200,
      email: 'charlie@example.com',
      isAdmin: false,
      lastLoginAt: new Date(),
    },
  ];

  const savedUsers: User[] = [];
  for (const userData of users) {
    const existingUser = await userRepository.findOne({
      where: { twitterId: userData.twitterId },
    });

    if (!existingUser) {
      const user = userRepository.create(userData);
      savedUsers.push(await userRepository.save(user));
    } else {
      savedUsers.push(existingUser);
    }
  }

  console.log(`✅ Seeded ${savedUsers.length} users`);
  return savedUsers;
}
