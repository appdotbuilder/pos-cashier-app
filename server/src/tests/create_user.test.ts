
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'cashier'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.role).toEqual('cashier');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should hash the password correctly', async () => {
    const result = await createUser(testInput);

    // Password should be hashed with Bun's password hashing
    const isValidHash = await Bun.password.verify('password123', result.password_hash);
    expect(isValidHash).toBe(true);

    // Wrong password should not match
    const isInvalidHash = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalidHash).toBe(false);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].role).toEqual('cashier');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create manager user', async () => {
    const managerInput: CreateUserInput = {
      username: 'manager1',
      email: 'manager@example.com',
      password: 'managerpass',
      role: 'manager'
    };

    const result = await createUser(managerInput);

    expect(result.role).toEqual('manager');
    expect(result.username).toEqual('manager1');
    expect(result.email).toEqual('manager@example.com');
  });

  it('should reject duplicate username', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create user with same username but different email
    const duplicateUsernameInput: CreateUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com', // Different email
      password: 'password456',
      role: 'manager'
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/username already exists/i);
  });

  it('should reject duplicate email', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create user with same email but different username
    const duplicateEmailInput: CreateUserInput = {
      username: 'differentuser', // Different username
      email: 'test@example.com', // Same email
      password: 'password456',
      role: 'manager'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/email already exists/i);
  });

  it('should allow multiple users with different credentials', async () => {
    // Create first user
    const firstUser = await createUser(testInput);

    // Create second user with different credentials
    const secondInput: CreateUserInput = {
      username: 'seconduser',
      email: 'second@example.com',
      password: 'password789',
      role: 'manager'
    };

    const secondUser = await createUser(secondInput);

    expect(firstUser.id).not.toEqual(secondUser.id);
    expect(firstUser.username).toEqual('testuser');
    expect(secondUser.username).toEqual('seconduser');
    expect(firstUser.email).toEqual('test@example.com');
    expect(secondUser.email).toEqual('second@example.com');
  });
});
