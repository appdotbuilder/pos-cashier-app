
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type DateRangeInput } from '../schema';
import { getProfitLossReport } from '../handlers/get_profit_loss_report';

// Test input
const testDateRange: DateRangeInput = {
  start_date: '2024-01-01',
  end_date: '2024-01-31'
};

describe('getProfitLossReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero values for empty period', async () => {
    const result = await getProfitLossReport(testDateRange);

    expect(result.total_revenue).toEqual(0);
    expect(result.total_cost_of_goods_sold).toEqual(0);
    expect(result.gross_profit).toEqual(0);
    expect(result.gross_profit_margin).toEqual(0);
    expect(result.total_transactions).toEqual(0);
    expect(result.period_start).toEqual(new Date('2024-01-01'));
    expect(result.period_end).toEqual(new Date('2024-01-31'));
  });

  it('should calculate profit loss report correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'cashier'
      })
      .returning()
      .execute();

    // Create test products with different cost/selling prices
    const product1 = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        cost_price: '10.00',      // Cost $10
        selling_price: '15.00',   // Sell $15, profit $5 per unit
        stock_quantity: 100
      })
      .returning()
      .execute();

    const product2 = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        cost_price: '20.00',      // Cost $20
        selling_price: '30.00',   // Sell $30, profit $10 per unit
        stock_quantity: 50
      })
      .returning()
      .execute();

    // Create completed transaction within date range
    const transaction = await db.insert(transactionsTable)
      .values({
        user_id: user[0].id,
        total_amount: '75.00',    // Total transaction amount
        tax_amount: '0.00',
        discount_amount: '0.00',
        payment_method: 'cash',
        status: 'completed',
        receipt_number: 'RCP-001',
        created_at: new Date('2024-01-15T10:00:00Z')
      })
      .returning()
      .execute();

    // Create transaction items
    // Product 1: 3 units at $15 each = $45 revenue, $30 cost
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transaction[0].id,
        product_id: product1[0].id,
        quantity: 3,
        unit_price: '15.00',
        total_price: '45.00'
      })
      .execute();

    // Product 2: 1 unit at $30 each = $30 revenue, $20 cost
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transaction[0].id,
        product_id: product2[0].id,
        quantity: 1,
        unit_price: '30.00',
        total_price: '30.00'
      })
      .execute();

    const result = await getProfitLossReport(testDateRange);

    // Expected calculations:
    // Total Revenue: $45 + $30 = $75
    // Total COGS: (3 * $10) + (1 * $20) = $30 + $20 = $50
    // Gross Profit: $75 - $50 = $25
    // Gross Profit Margin: ($25 / $75) * 100 = 33.33%
    expect(result.total_revenue).toEqual(75);
    expect(result.total_cost_of_goods_sold).toEqual(50);
    expect(result.gross_profit).toEqual(25);
    expect(result.gross_profit_margin).toBeCloseTo(33.33, 2);
    expect(result.total_transactions).toEqual(1);
    expect(result.period_start).toEqual(new Date('2024-01-01'));
    expect(result.period_end).toEqual(new Date('2024-01-31'));
  });

  it('should exclude transactions outside date range', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'cashier'
      })
      .returning()
      .execute();

    // Create test product
    const product = await db.insert(productsTable)
      .values({
        name: 'Product',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100
      })
      .returning()
      .execute();

    // Create transaction BEFORE date range
    const earlyTransaction = await db.insert(transactionsTable)
      .values({
        user_id: user[0].id,
        total_amount: '15.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        payment_method: 'cash',
        status: 'completed',
        receipt_number: 'RCP-EARLY',
        created_at: new Date('2023-12-31T23:59:59Z')
      })
      .returning()
      .execute();

    // Create transaction AFTER date range
    const lateTransaction = await db.insert(transactionsTable)
      .values({
        user_id: user[0].id,
        total_amount: '15.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        payment_method: 'cash',
        status: 'completed',
        receipt_number: 'RCP-LATE',
        created_at: new Date('2024-02-01T00:00:01Z')
      })
      .returning()
      .execute();

    // Add items to both transactions
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: earlyTransaction[0].id,
        product_id: product[0].id,
        quantity: 1,
        unit_price: '15.00',
        total_price: '15.00'
      })
      .execute();

    await db.insert(transactionItemsTable)
      .values({
        transaction_id: lateTransaction[0].id,
        product_id: product[0].id,
        quantity: 1,
        unit_price: '15.00',
        total_price: '15.00'
      })
      .execute();

    const result = await getProfitLossReport(testDateRange);

    // Should exclude both transactions since they're outside the range
    expect(result.total_revenue).toEqual(0);
    expect(result.total_cost_of_goods_sold).toEqual(0);
    expect(result.gross_profit).toEqual(0);
    expect(result.total_transactions).toEqual(0);
  });

  it('should exclude non-completed transactions', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'cashier'
      })
      .returning()
      .execute();

    // Create test product
    const product = await db.insert(productsTable)
      .values({
        name: 'Product',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100
      })
      .returning()
      .execute();

    // Create pending transaction within date range
    const pendingTransaction = await db.insert(transactionsTable)
      .values({
        user_id: user[0].id,
        total_amount: '15.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        payment_method: 'cash',
        status: 'pending',
        receipt_number: 'RCP-PENDING',
        created_at: new Date('2024-01-15T10:00:00Z')
      })
      .returning()
      .execute();

    // Create cancelled transaction within date range
    const cancelledTransaction = await db.insert(transactionsTable)
      .values({
        user_id: user[0].id,
        total_amount: '15.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        payment_method: 'cash',
        status: 'cancelled',
        receipt_number: 'RCP-CANCELLED',
        created_at: new Date('2024-01-20T10:00:00Z')
      })
      .returning()
      .execute();

    // Add items to both transactions
    await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: pendingTransaction[0].id,
          product_id: product[0].id,
          quantity: 1,
          unit_price: '15.00',
          total_price: '15.00'
        },
        {
          transaction_id: cancelledTransaction[0].id,
          product_id: product[0].id,
          quantity: 1,
          unit_price: '15.00',
          total_price: '15.00'
        }
      ])
      .execute();

    const result = await getProfitLossReport(testDateRange);

    // Should exclude non-completed transactions
    expect(result.total_revenue).toEqual(0);
    expect(result.total_cost_of_goods_sold).toEqual(0);
    expect(result.gross_profit).toEqual(0);
    expect(result.total_transactions).toEqual(0);
  });
});
