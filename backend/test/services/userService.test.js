import bcrypt from 'bcryptjs';
import { register, login, findUserProfileById } from '../../src/services/userService.js';
import { prisma } from '../setup.js';
import { createTestUser } from '../helpers/testHelpers.js';

describe('User Service', () => {
  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        password: 'password123',
      };

      const result = await register(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(userData.email);
      expect(result.user.username).toBe(userData.username);
      expect(result.user.name).toBe(userData.name);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('password');

      // Verify user was created in database
      const dbUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(dbUser).toBeTruthy();
      expect(dbUser.email).toBe(userData.email);

      // Verify password was hashed
      const passwordMatch = await bcrypt.compare(userData.password, dbUser.passwordHash);
      expect(passwordMatch).toBe(true);
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        password: 'password123',
      };

      // Create first user
      await register(userData);

      // Try to create user with same email
      const duplicateData = {
        ...userData,
        username: 'johndoe2',
      };

      await expect(register(duplicateData)).rejects.toThrow('User already exists');
    });

    it('should throw error for duplicate username', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        password: 'password123',
      };

      // Create first user
      await register(userData);

      // Try to create user with same username
      const duplicateData = {
        ...userData,
        email: 'john2@example.com',
      };

      await expect(register(duplicateData)).rejects.toThrow('User already exists');
    });

    it('should set default role as USER', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        password: 'password123',
      };

      const result = await register(userData);

      expect(result.user.role).toBe('USER');
    });
  });

  describe('login', () => {
    let testUser;
    const testPassword = 'password123';

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'login@example.com',
        username: 'loginuser',
        password: await bcrypt.hash(testPassword, 12),
      });
    });

    it('should login user with valid credentials', async () => {
      const loginData = {
        username: 'loginuser',
        password: testPassword,
      };

      const result = await login(loginData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.username).toBe(testUser.username);
      expect(result.user.email).toBe(testUser.email);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw error for non-existent user', async () => {
      const loginData = {
        username: 'nonexistent',
        password: testPassword,
      };

      await expect(login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for wrong password', async () => {
      const loginData = {
        username: 'loginuser',
        password: 'wrongpassword',
      };

      await expect(login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should return authentication error with proper structure', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'wrongpassword',
      };

      try {
        await login(loginData);
      } catch (error) {
        expect(error.name).toBe('AuthenticationError');
        expect(error.statusCode).toBe(401);
        expect(error.errors).toHaveProperty('code', 'INVALID_CREDENTIALS');
      }
    });
  });

  describe('findUserProfileById', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'profile@example.com',
        username: 'profileuser',
      });
    });

    it('should find user profile by valid id', async () => {
      const result = await findUserProfileById(testUser.id);

      expect(result).toHaveProperty('id', testUser.id);
      expect(result).toHaveProperty('email', testUser.email);
      expect(result).toHaveProperty('username', testUser.username);
      expect(result).toHaveProperty('role', testUser.role);
      expect(result).toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password');
    });

    it('should throw error for non-existent user id', async () => {
      const nonExistentId = 999999;

      await expect(findUserProfileById(nonExistentId)).rejects.toThrow('User not found');
    });

    it('should return not found error with proper structure', async () => {
      const nonExistentId = 999999;

      try {
        await findUserProfileById(nonExistentId);
      } catch (error) {
        expect(error.name).toBe('NotFoundError');
        expect(error.statusCode).toBe(404);
        expect(error.errors).toHaveProperty('code', 'USER_NOT_FOUND');
        expect(error.errors).toHaveProperty('resource', 'user');
        expect(error.errors).toHaveProperty('id', nonExistentId);
      }
    });
  });
});
