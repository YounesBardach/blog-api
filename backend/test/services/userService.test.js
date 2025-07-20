import * as userService from '../src/services/userService.js';
import bcrypt from 'bcryptjs';

// --- Mock Prisma ---
vi.mock('../src/config/prisma.js', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// --- Mock JWT ---
// Any jwt function will return mock-token
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(() => 'mock-token'),
}));
// When need to reimport for the mock to work because prisma executes before the mock in userService.js and creates a real prisma instance
const prisma = (await import('../src/config/prisma.js')).default;

let sampleUser;

beforeEach(async () => {
  vi.clearAllMocks();

  sampleUser = {
    id: 'user-123',
    name: 'Test',
    email: 'test@email.com',
    username: 'testuser',
    passwordHash: await bcrypt.hash('Test123!', 10),
    role: 'READER',
  };
});

describe('userService', () => {
  test('registers a new user if not taken', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(sampleUser);

    const result = await userService.register({
      name: sampleUser.name,
      email: sampleUser.email,
      username: sampleUser.username,
      password: 'Test123!',
    });

    expect(prisma.user.findFirst).toHaveBeenCalled();
    expect(prisma.user.create).toHaveBeenCalled();
    expect(result).toEqual({
      user: {
        id: sampleUser.id,
        name: sampleUser.name,
        email: sampleUser.email,
        username: sampleUser.username,
        role: sampleUser.role,
      },
      token: 'mock-token',
    });
  });

  test('throws error if user already exists', async () => {
    prisma.user.findFirst.mockResolvedValue({
      email: sampleUser.email,
      username: sampleUser.username,
    });

    await expect(
      userService.register({
        name: 'Another',
        email: sampleUser.email,
        username: sampleUser.username,
        password: 'Pass123!',
      })
    ).rejects.toMatchObject({
      name: 'DuplicateEntryError',
      statusCode: 409,
      errors: {
        fields: {
          email: 'Email already in use',
          username: 'Username already taken',
        },
      },
    });
  });

  test('logs in a valid user', async () => {
    prisma.user.findUnique.mockResolvedValue(sampleUser);

    const result = await userService.login({
      username: sampleUser.username,
      password: 'Test123!',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: sampleUser.username },
    });
    expect(result.user.username).toBe(sampleUser.username);
    expect(result.token).toBe('mock-token');
  });

  test('throws if login credentials are invalid (no user)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      userService.login({ username: 'wronguser', password: 'wrongpass' })
    ).rejects.toMatchObject({
      name: 'AuthenticationError',
      statusCode: 401,
    });
  });

  test('throws if login credentials are invalid (bad password)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...sampleUser,
      passwordHash: await bcrypt.hash('AnotherPass123!', 10),
    });

    await expect(
      userService.login({ username: sampleUser.username, password: 'WrongPassword!' })
    ).rejects.toMatchObject({
      name: 'AuthenticationError',
      statusCode: 401,
    });
  });

  test('retrieves user profile by ID', async () => {
    const profile = {
      id: sampleUser.id,
      name: sampleUser.name,
      email: sampleUser.email,
      username: sampleUser.username,
      role: sampleUser.role,
      createdAt: new Date(),
    };

    prisma.user.findUnique.mockResolvedValue(profile);

    const result = await userService.findUserProfileById(sampleUser.id);
    expect(result).toMatchObject({
      id: sampleUser.id,
      username: sampleUser.username,
    });
  });

  test('throws if user profile not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(userService.findUserProfileById('nonexistent')).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
      errors: {
        code: 'USER_NOT_FOUND',
      },
    });
  });
});
