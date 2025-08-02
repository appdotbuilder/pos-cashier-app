
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type DateRangeInput } from '../schema';
import { getSalesReport } from '../handlers/get_sales_report';

const testDateRange: DateRangeInput = {
  start_date: '2024-01-01',
  end_date: '2024-01-31'
};

describe('getSalesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty report for no transactions', async () => {
    const result = await getSalesReport(testDateRange);

    expect(result.total_sales).toEqual(0);
    expect(result.total_transactions).toEqual(0);
    expect(result.average_transaction_value).toEqual(0);
    expect(result.total_profit).toEqual(0);
    expect(result.top_selling_products).toHaveLength(0);
    expect(result.sales_by_payment_method).toHaveLength(0);
  });

  it('should calculate basic sales metrics correctly', async () => {
    // Create test data
    const user = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      role: 'cashier'
    }).returning().execute();

    const product = await db.insert(productsTable).values({
      name: 'Test Product',
      cost_price: '10.00',
      selling_price: '15.00',
      stock_quantity: 100,
      min_stock_level: 10
    }).returning().execute();

    const transaction = await db.insert(transactionsTable).values({
      user_id: user[0].id,
      total_amount: '150.00',
      tax_amount: '0.00',
      discount_amount: '0.00',
      payment_method: 'cash',
      status: 'completed',
      receipt_number: 'REC001',
      created_at: new Date('2024-01-15T10:00:00Z')
    }).returning().execute();

    await db.insert(transactionItemsTable).values({
      transaction_id: transaction[0].id,
      product_id: product[0].id,
      quantity: 10,
      unit_price: '15.00',
      total_price: '150.00'
    }).execute();

    const result = await getSalesReport(testDateRange);

    expect(result.total_sales).toEqual(150);
    expect(result.total_transactions).toEqual(1);
    expect(result.average_transaction_value).toEqual(150);
    expect(result.total_profit).toEqual(50); // (15-10) * 10 = 50
  });

  it('should only include completed transactions', async () => {
    // Create test data
    const user = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      role: 'cashier'
    }).returning().execute();

    const product = await db.insert(productsTable).values({
      name: 'Test Product',
      cost_price: '10.00',
      selling_price: '15.00',
      stock_quantity: 100,
      min_stock_level: 10
    }).returning().execute();

    // Create completed transaction
    const completedTransaction = await db.insert(transactionsTable).values({
      user_id: user[0].id,
      total_amount: '150.00',
      tax_amount: '0.00',
      discount_amount: '0.00',
      payment_method: 'cash',
      status: 'completed',
      receipt_number: 'REC001',
      created_at: new Date('2024-01-15T10:00:00Z')
    }).returning().execute();

    // Create pending transaction (should be excluded)
    const pendingTransaction = await db.insert(transactionsTable).values({
      user_id: user[0].id,
      total_amount: '100.00',
      tax_amount: '0.00',
      discount_amount: '0.00',
      payment_method: 'card',
      status: 'pending',
      receipt_number: 'REC002',
      created_at: new Date('2024-01-15T11:00:00Z')
    }).returning().execute();

    await db.insert(transactionItemsTable).values([
      {
        transaction_id: completedTransaction[0].id,
        product_id: product[0].id,
        quantity: 10,
        unit_price: '15.00',
        total_price: '150.00'
      },
      {
        transaction_id: pendingTransaction[0].id,
        product_id: product[0].id,
        quantity: 5,
        unit_price: '15.00',
        total_price: '75.00'
      }
    ]).execute();

    const result = await getSalesReport(testDateRange);

    expect(result.total_sales).toEqual(150); // Only completed transaction
    expect(result.total_transactions).toEqual(1);
  });

  it('should respect date range filter', async () => {
    // Create test data
    const user = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      role: 'cashier'
    }).returning().execute();

    const product = await db.insert(productsTable).values({
      name: 'Test Product',
      cost_price: '10.00',
      selling_price: '15.00',
      stock_quantity: 100,
      min_stock_level: 10
    }).returning().execute();

    // Transaction within range
    const transactionIn = await db.insert(transactionsTable).values({
      user_id: user[0].id,
      total_amount: '150.00',
      tax_amount: '0.00',
      discount_amount: '0.00',
      payment_method: 'cash',
      status: 'completed',
      receipt_number: 'REC001',
      created_at: new Date('2024-01-15T10:00:00Z')
    }).returning().execute();

    // Transaction outside range
    const transactionOut = await db.insert(transactionsTable).values({
      user_id: user[0].id,
      total_amount: '100.00',
      tax_amount: '0.00',
      discount_amount: '0.00',
      payment_method: 'card',
      status: 'completed',
      receipt_number: 'REC002',
      created_at: new Date('2024-02-15T10:00:00Z')
    }).returning().execute();

    await db.insert(transactionItemsTable).values([
      {
        transaction_id: transactionIn[0].id,
        product_id: product[0].id,
        quantity: 10,
        unit_price: '15.00',
        total_price: '150.00'
      },
      {
        transaction_id: transactionOut[0].id,
        product_id: product[0].id,
        quantity: 5,
        unit_price: '15.00',
        total_price: '75.00'
      }
    ]).execute();

    const result = await getSalesReport(testDateRange);

    expect(result.total_sales).toEqual(150); // Only transaction within range
    expect(result.total_transactions).toEqual(1);
  });

  it('should return top-selling products correctly', async () => {
    // Create test data
    const user = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      role: 'cashier'
    }).returning().execute();

    const products = await db.insert(productsTable).values([
      {
        name: 'Product A',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100,
        min_stock_level: 10
      },
      {
        name: 'Product B',
        cost_price: '5.00',
        selling_price: '8.00',
        stock_quantity: 100,
        min_stock_level: 10
      }
    ]).returning().execute();

    const transaction = await db.insert(transactionsTable).values({
      user_id: user[0].id,
      total_amount: '174.00',
      tax_amount: '0.00',
      discount_amount: '0.00',
      payment_method: 'cash',
      status: 'completed',
      receipt_number: 'REC001',
      created_at: new Date('2024-01-15T10:00:00Z')
    }).returning().execute();

    await db.insert(transactionItemsTable).values([
      {
        transaction_id: transaction[0].id,
        product_id: products[0].id,
        quantity: 10,
        unit_price: '15.00',
        total_price: '150.00'
      },
      {
        transaction_id: transaction[0].id,
        product_id: products[1].id,
        quantity: 3,
        unit_price: '8.00',
        total_price: '24.00'
      }
    ]).execute();

    const result = await getSalesReport(testDateRange);

    expect(result.top_selling_products).toHaveLength(2);
    expect(result.top_selling_products[0].product_name).toEqual('Product A');
    expect(result.top_selling_products[0].quantity_sold).toEqual(10);
    expect(result.top_selling_products[0].revenue).toEqual(150);
    expect(result.top_selling_products[1].product_name).toEqual('Product B');
    expect(result.top_selling_products[1].quantity_sold).toEqual(3);
    expect(result.top_selling_products[1].revenue).toEqual(24);
  });

  it('should return sales by payment method correctly', async () => {
    // Create test data
    const user = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      role: 'cashier'
    }).returning().execute();

    const product = await db.insert(productsTable).values({
      name: 'Test Product',
      cost_price: '10.00',
      selling_price: '15.00',
      stock_quantity: 100,
      min_stock_level: 10
    }).returning().execute();

    const transactions = await db.insert(transactionsTable).values([
      {
        user_id: user[0].id,
        total_amount: '150.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        payment_method: 'cash',
        status: 'completed',
        receipt_number: 'REC001',
        created_at: new Date('2024-01-15T10:00:00Z')
      },
      {
        user_id: user[0].id,
        total_amount: '100.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        payment_method: 'cash',
        status: 'completed',
        receipt_number: 'REC002',
        created_at: new Date('2024-01-16T10:00:00Z')
      },
      {
        user_id: user[0].id,
        total_amount: '75.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        payment_method: 'card',
        status: 'completed',
        receipt_number: 'REC003',
        created_at: new Date('2024-01-17T10:00:00Z')
      }
    ]).returning().execute();

    await db.insert(transactionItemsTable).values([
      {
        transaction_id: transactions[0].id,
        product_id: product[0].id,
        quantity: 10,
        unit_price: '15.00',
        total_price: '150.00'
      },
      {
        transaction_id: transactions[1].id,
        product_id: product[0].id,
        quantity: 5,
        unit_price: '15.00',
        total_price: '75.00'
      },
      {
        transaction_id: transactions[2].id,
        product_id: product[0].id,
        quantity: 5,
        unit_price: '15.00',
        total_price: '75.00'
      }
    ]).execute();

    const result = await getSalesReport(testDateRange);

    expect(result.sales_by_payment_method).toHaveLength(2);
    
    const cashStats = result.sales_by_payment_method.find(s => s.payment_method === 'cash');
    expect(cashStats?.count).toEqual(2);
    expect(cashStats?.total_amount).toEqual(250);

    const cardStats = result.sales_by_payment_method.find(s => s.payment_method === 'card');
    expect(cardStats?.count).toEqual(1);
    expect(cardStats?.total_amount).toEqual(75);
  });
});
