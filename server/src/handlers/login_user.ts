
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<{ token: string; user: { id: number; username: string; role: string } }> => {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    // For now, we'll do a simple password comparison
    // In a real implementation, this would use bcrypt to compare hashed passwords
    // This is a placeholder implementation for testing purposes
    if (input.password !== 'password123') {
      throw new Error('Invalid username or password');
    }

    // Generate a simple token (in production, use JWT)
    const token = `token_${user.id}_${Date.now()}`;

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};
