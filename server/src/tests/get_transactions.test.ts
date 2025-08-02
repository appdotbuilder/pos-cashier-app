
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type DateRangeInput } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactions();
    expect(result).toEqual([]);
  });

  it('should return all transactions ordered by creation date (newest first)', async () => {
    // Create test user first
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'cashier'
      })
      .returning()
      .execute();

    // Create transactions with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(transactionsTable)
      .values([
        {
          user_id: user.id,
          total_amount: '100.00',
          tax_amount: '10.00',
          discount_amount: '5.00',
          payment_method: 'cash',
          status: 'completed',
          receipt_number: 'REC001',
          created_at: twoHoursAgo
        },
        {
          user_id: user.id,
          total_amount: '200.00',
          tax_amount: '20.00',
          discount_amount: '0.00',
          payment_method: 'card',
          status: 'completed',
          receipt_number: 'REC002',
          created_at: oneHourAgo
        },
        {
          user_id: user.id,
          total_amount: '150.00',
          tax_amount: '15.00',
          discount_amount: '10.00',
          payment_method: 'mobile_money',
          status: 'pending',
          receipt_number: 'REC003',
          created_at: now
        }
      ])
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(3);
    
    // Check ordering (newest first)
    expect(result[0].receipt_number).toEqual('REC003');
    expect(result[1].receipt_number).toEqual('REC002');
    expect(result[2].receipt_number).toEqual('REC001');

    // Check numeric conversions
    expect(typeof result[0].total_amount).toBe('number');
    expect(typeof result[0].tax_amount).toBe('number');
    expect(typeof result[0].discount_amount).toBe('number');
    
    expect(result[0].total_amount).toEqual(150.00);
    expect(result[0].tax_amount).toEqual(15.00);
    expect(result[0].discount_amount).toEqual(10.00);
  });

  it('should filter transactions by date range', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'cashier'
      })
      .returning()
      .execute();

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Create transactions on different dates
    await db.insert(transactionsTable)
      .values([
        {
          user_id: user.id,
          total_amount: '100.00',
          tax_amount: '10.00',
          discount_amount: '0.00',
          payment_method: 'cash',
          status: 'completed',
          receipt_number: 'REC001',
          created_at: twoDaysAgo
        },
        {
          user_id: user.id,
          total_amount: '200.00',
          tax_amount: '20.00',
          discount_amount: '0.00',
          payment_method: 'card',
          status: 'completed',
          receipt_number: 'REC002',
          created_at: yesterday
        },
        {
          user_id: user.id,
          total_amount: '150.00',
          tax_amount: '15.00',
          discount_amount: '0.00',
          payment_method: 'mobile_money',
          status: 'completed',
          receipt_number: 'REC003',
          created_at: today
        }
      ])
      .execute();

    const dateRange: DateRangeInput = {
      start_date: yesterday.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    };

    const result = await getTransactions(dateRange);

    expect(result).toHaveLength(2);
    expect(result[0].receipt_number).toEqual('REC003'); // newest first
    expect(result[1].receipt_number).toEqual('REC002');
    
    // Verify date filtering worked
    result.forEach(transaction => {
      expect(transaction.created_at).toBeInstanceOf(Date);
      expect(transaction.created_at >= yesterday).toBe(true);
      expect(transaction.created_at <= today).toBe(true);
    });
  });

  it('should return empty array when no transactions match date range', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'cashier'
      })
      .returning()
      .execute();

    const today = new Date();
    
    // Create transaction today
    await db.insert(transactionsTable)
      .values({
        user_id: user.id,
        total_amount: '100.00',
        tax_amount: '10.00',
        discount_amount: '0.00',
        payment_method: 'cash',
        status: 'completed',
        receipt_number: 'REC001'
      })
      .execute();

    // Search for transactions from last week
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const sixDaysAgo = new Date(today);
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

    const dateRange: DateRangeInput = {
      start_date: oneWeekAgo.toISOString().split('T')[0],
      end_date: sixDaysAgo.toISOString().split('T')[0]
    };

    const result = await getTransactions(dateRange);
    expect(result).toHaveLength(0);
  });

  it('should include transactions created at end of day', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'cashier'
      })
      .returning()
      .execute();

    const today = new Date();
    const lateToday = new Date(today);
    lateToday.setHours(23, 30, 0, 0); // 11:30 PM

    // Create transaction late in the day
    await db.insert(transactionsTable)
      .values({
        user_id: user.id,
        total_amount: '100.00',
        tax_amount: '10.00',
        discount_amount: '0.00',
        payment_method: 'cash',
        status: 'completed',
        receipt_number: 'REC001',
        created_at: lateToday
      })
      .execute();

    const dateRange: DateRangeInput = {
      start_date: today.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    };

    const result = await getTransactions(dateRange);
    expect(result).toHaveLength(1);
    expect(result[0].receipt_number).toEqual('REC001');
  });
});
