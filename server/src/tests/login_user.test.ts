
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUserData = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password123', // In real implementation, this would be bcrypt hash
  role: 'cashier' as const,
  is_active: true
};

const testLoginInput: LoginInput = {
  username: 'testuser',
  password: 'password123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate valid user credentials', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUserData)
      .execute();

    const result = await loginUser(testLoginInput);

    // Verify response structure
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token).toMatch(/^token_\d+_\d+$/); // Simple token format
    expect(result.user.id).toBeDefined();
    expect(result.user.username).toEqual('testuser');
    expect(result.user.role).toEqual('cashier');
  });

  it('should reject invalid username', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUserData)
      .execute();

    const invalidInput: LoginInput = {
      username: 'nonexistent',
      password: 'password123'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should reject invalid password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUserData)
      .execute();

    const invalidInput: LoginInput = {
      username: 'testuser',
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should reject inactive user', async () => {
    // Create inactive test user
    await db.insert(usersTable)
      .values({
        ...testUserData,
        is_active: false
      })
      .execute();

    await expect(loginUser(testLoginInput)).rejects.toThrow(/user account is inactive/i);
  });

  it('should authenticate manager role correctly', async () => {
    // Create manager user
    await db.insert(usersTable)
      .values({
        ...testUserData,
        role: 'manager',
        username: 'manager_user'
      })
      .execute();

    const managerInput: LoginInput = {
      username: 'manager_user',
      password: 'password123'
    };

    const result = await loginUser(managerInput);

    expect(result.user.role).toEqual('manager');
    expect(result.user.username).toEqual('manager_user');
    expect(result.token).toBeDefined();
  });

  it('should return different tokens for different users', async () => {
    // Create two test users
    await db.insert(usersTable)
      .values([
        { ...testUserData, username: 'user1' },
        { ...testUserData, username: 'user2', email: 'user2@example.com' }
      ])
      .execute();

    const result1 = await loginUser({ username: 'user1', password: 'password123' });
    const result2 = await loginUser({ username: 'user2', password: 'password123' });

    expect(result1.token).not.toEqual(result2.token);
    expect(result1.user.username).toEqual('user1');
    expect(result2.user.username).toEqual('user2');
  });
});
