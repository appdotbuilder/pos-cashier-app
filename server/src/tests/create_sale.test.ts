
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateSaleInput } from '../schema';
import { createSale } from '../handlers/create_sale';
import { eq } from 'drizzle-orm';

describe('createSale', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testProductId1: number;
  let testProductId2: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'test_cashier',
        email: 'cashier@test.com',
        password_hash: 'hashed_password',
        role: 'cashier'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 1',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100
      })
      .returning()
      .execute();
    testProductId1 = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 2',
        cost_price: '5.00',
        selling_price: '8.00',
        stock_quantity: 50
      })
      .returning()
      .execute();
    testProductId2 = product2Result[0].id;
  });

  it('should create a sale with single item', async () => {
    const input: CreateSaleInput = {
      items: [
        {
          product_id: testProductId1,
          quantity: 2,
          unit_price: 15.00
        }
      ],
      payment_method: 'cash',
      discount_amount: 0,
      tax_rate: 0.1
    };

    const result = await createSale(input, testUserId);

    // Verify transaction details
    expect(result.user_id).toEqual(testUserId);
    expect(result.payment_method).toEqual('cash');
    expect(result.status).toEqual('completed');
    expect(result.discount_amount).toEqual(0);
    expect(result.tax_amount).toEqual(3.0); // 30 * 0.1
    expect(result.total_amount).toEqual(33.0); // 30 + 3 - 0
    expect(result.receipt_number).toMatch(/^RCP-\d+$/);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a sale with multiple items and discount', async () => {
    const input: CreateSaleInput = {
      items: [
        {
          product_id: testProductId1,
          quantity: 1,
          unit_price: 15.00
        },
        {
          product_id: testProductId2,
          quantity: 3,
          unit_price: 8.00
        }
      ],
      payment_method: 'card',
      discount_amount: 5.00,
      tax_rate: 0.15
    };

    const result = await createSale(input, testUserId);

    // Verify calculations: subtotal = 15 + 24 = 39, tax = 39 * 0.15 = 5.85, total = 39 + 5.85 - 5 = 39.85
    expect(result.total_amount).toEqual(39.85);
    expect(result.tax_amount).toEqual(5.85);
    expect(result.discount_amount).toEqual(5.00);
    expect(result.payment_method).toEqual('card');
  });

  it('should save transaction to database', async () => {
    const input: CreateSaleInput = {
      items: [
        {
          product_id: testProductId1,
          quantity: 1,
          unit_price: 15.00
        }
      ],
      payment_method: 'mobile_money',
      discount_amount: 0,
      tax_rate: 0
    };

    const result = await createSale(input, testUserId);

    // Verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(testUserId);
    expect(parseFloat(transactions[0].total_amount)).toEqual(15.00);
    expect(transactions[0].payment_method).toEqual('mobile_money');
    expect(transactions[0].status).toEqual('completed');
  });

  it('should create transaction items', async () => {
    const input: CreateSaleInput = {
      items: [
        {
          product_id: testProductId1,
          quantity: 2,
          unit_price: 15.00
        },
        {
          product_id: testProductId2,
          quantity: 1,
          unit_price: 8.00
        }
      ],
      payment_method: 'cash',
      discount_amount: 0,
      tax_rate: 0
    };

    const result = await createSale(input, testUserId);

    // Verify transaction items were created
    const items = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, result.id))
      .execute();

    expect(items).toHaveLength(2);
    
    // First item
    expect(items[0].product_id).toEqual(testProductId1);
    expect(items[0].quantity).toEqual(2);
    expect(parseFloat(items[0].unit_price)).toEqual(15.00);
    expect(parseFloat(items[0].total_price)).toEqual(30.00);

    // Second item
    expect(items[1].product_id).toEqual(testProductId2);
    expect(items[1].quantity).toEqual(1);
    expect(parseFloat(items[1].unit_price)).toEqual(8.00);
    expect(parseFloat(items[1].total_price)).toEqual(8.00);
  });

  it('should update product stock quantities', async () => {
    const input: CreateSaleInput = {
      items: [
        {
          product_id: testProductId1,
          quantity: 5,
          unit_price: 15.00
        },
        {
          product_id: testProductId2,
          quantity: 3,
          unit_price: 8.00
        }
      ],
      payment_method: 'cash',
      discount_amount: 0,
      tax_rate: 0
    };

    await createSale(input, testUserId);

    // Verify stock quantities were reduced
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId1))
      .execute();

    expect(products[0].stock_quantity).toEqual(95); // 100 - 5

    const products2 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId2))
      .execute();

    expect(products2[0].stock_quantity).toEqual(47); // 50 - 3
  });

  it('should generate unique receipt numbers', async () => {
    const input: CreateSaleInput = {
      items: [
        {
          product_id: testProductId1,
          quantity: 1,
          unit_price: 15.00
        }
      ],
      payment_method: 'cash',
      discount_amount: 0,
      tax_rate: 0
    };

    const result1 = await createSale(input, testUserId);
    const result2 = await createSale(input, testUserId);

    expect(result1.receipt_number).not.toEqual(result2.receipt_number);
    expect(result1.receipt_number).toMatch(/^RCP-\d+$/);
    expect(result2.receipt_number).toMatch(/^RCP-\d+$/);
  });
});
