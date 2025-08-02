
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type ReceiptInput } from '../schema';
import { generateReceipt } from '../handlers/generate_receipt';

describe('generateReceipt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate receipt for completed transaction', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'cashier'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test products
    const productResult = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          cost_price: '10.00',
          selling_price: '15.00',
          stock_quantity: 100
        },
        {
          name: 'Product B',
          cost_price: '5.00',
          selling_price: '8.00',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();

    const productA = productResult[0];
    const productB = productResult[1];

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        total_amount: '31.00',
        tax_amount: '2.00',
        discount_amount: '1.00',
        payment_method: 'cash',
        status: 'completed',
        receipt_number: 'RCP-001'
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create transaction items
    await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transactionId,
          product_id: productA.id,
          quantity: 2,
          unit_price: '15.00',
          total_price: '30.00'
        },
        {
          transaction_id: transactionId,
          product_id: productB.id,
          quantity: 1,
          unit_price: '8.00',
          total_price: '8.00'
        }
      ])
      .execute();

    const input: ReceiptInput = {
      transaction_id: transactionId
    };

    const result = await generateReceipt(input);

    // Verify transaction details
    expect(result.transaction.id).toEqual(transactionId);
    expect(result.transaction.user_id).toEqual(userId);
    expect(result.transaction.total_amount).toEqual(31.00);
    expect(result.transaction.tax_amount).toEqual(2.00);
    expect(result.transaction.discount_amount).toEqual(1.00);
    expect(result.transaction.payment_method).toEqual('cash');
    expect(result.transaction.status).toEqual('completed');
    expect(result.transaction.receipt_number).toEqual('RCP-001');

    // Verify items
    expect(result.items).toHaveLength(2);
    
    const itemA = result.items.find(item => item.product_name === 'Product A');
    expect(itemA).toBeDefined();
    expect(itemA!.quantity).toEqual(2);
    expect(itemA!.unit_price).toEqual(15.00);
    expect(itemA!.total_price).toEqual(30.00);

    const itemB = result.items.find(item => item.product_name === 'Product B');
    expect(itemB).toBeDefined();
    expect(itemB!.quantity).toEqual(1);
    expect(itemB!.unit_price).toEqual(8.00);
    expect(itemB!.total_price).toEqual(8.00);

    // Verify business info
    expect(result.business_info.name).toEqual('Point of Sale System');
    expect(result.business_info.address).toEqual('123 Business Street, City, Country');
    expect(result.business_info.phone).toEqual('+1-234-567-8900');
    expect(result.business_info.email).toEqual('info@possystem.com');
  });

  it('should throw error for non-existent transaction', async () => {
    const input: ReceiptInput = {
      transaction_id: 999
    };

    await expect(generateReceipt(input)).rejects.toThrow(/Transaction with ID 999 not found/i);
  });

  it('should handle transaction with no items', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'cashier'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create transaction without items
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        total_amount: '0.00',
        tax_amount: '0.00',
        discount_amount: '0.00',
        payment_method: 'cash',
        status: 'cancelled',
        receipt_number: 'RCP-002'
      })
      .returning()
      .execute();

    const input: ReceiptInput = {
      transaction_id: transactionResult[0].id
    };

    const result = await generateReceipt(input);

    expect(result.transaction.total_amount).toEqual(0.00);
    expect(result.transaction.status).toEqual('cancelled');
    expect(result.items).toHaveLength(0);
    expect(result.business_info.name).toEqual('Point of Sale System');
  });
});
