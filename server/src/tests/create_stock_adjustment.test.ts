
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, stockAdjustmentsTable } from '../db/schema';
import { type CreateStockAdjustmentInput } from '../schema';
import { createStockAdjustment } from '../handlers/create_stock_adjustment';
import { eq } from 'drizzle-orm';

describe('createStockAdjustment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testProductId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'manager'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100,
        min_stock_level: 10,
        category: 'test'
      })
      .returning()
      .execute();
    testProductId = productResult[0].id;
  });

  it('should create stock adjustment for increase', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: testProductId,
      adjustment_type: 'increase',
      quantity_change: 50,
      reason: 'New stock delivery'
    };

    const result = await createStockAdjustment(input, testUserId);

    expect(result.product_id).toEqual(testProductId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.adjustment_type).toEqual('increase');
    expect(result.quantity_change).toEqual(50);
    expect(result.reason).toEqual('New stock delivery');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update product stock quantity for increase adjustment', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: testProductId,
      adjustment_type: 'increase',
      quantity_change: 25,
      reason: 'Stock replenishment'
    };

    await createStockAdjustment(input, testUserId);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(125); // 100 + 25
    expect(updatedProduct[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create stock adjustment for decrease', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: testProductId,
      adjustment_type: 'decrease',
      quantity_change: 30,
      reason: 'Damaged goods'
    };

    const result = await createStockAdjustment(input, testUserId);

    expect(result.adjustment_type).toEqual('decrease');
    expect(result.quantity_change).toEqual(30);
    expect(result.reason).toEqual('Damaged goods');
  });

  it('should update product stock quantity for decrease adjustment', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: testProductId,
      adjustment_type: 'decrease',
      quantity_change: 20,
      reason: 'Loss due to damage'
    };

    await createStockAdjustment(input, testUserId);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(80); // 100 - 20
  });

  it('should not allow stock to go below zero for decrease', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: testProductId,
      adjustment_type: 'decrease',
      quantity_change: 150, // More than current stock
      reason: 'Major loss'
    };

    await createStockAdjustment(input, testUserId);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(0); // Should not go below 0
  });

  it('should create stock adjustment for recount', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: testProductId,
      adjustment_type: 'recount',
      quantity_change: 85, // New total count
      reason: 'Physical inventory count'
    };

    const result = await createStockAdjustment(input, testUserId);

    expect(result.adjustment_type).toEqual('recount');
    expect(result.quantity_change).toEqual(85);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(85); // Set to exact count
  });

  it('should save adjustment to database', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: testProductId,
      adjustment_type: 'increase',
      quantity_change: 15,
      reason: 'Test adjustment'
    };

    const result = await createStockAdjustment(input, testUserId);

    const adjustments = await db.select()
      .from(stockAdjustmentsTable)
      .where(eq(stockAdjustmentsTable.id, result.id))
      .execute();

    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].product_id).toEqual(testProductId);
    expect(adjustments[0].user_id).toEqual(testUserId);
    expect(adjustments[0].adjustment_type).toEqual('increase');
    expect(adjustments[0].quantity_change).toEqual(15);
    expect(adjustments[0].reason).toEqual('Test adjustment');
  });

  it('should throw error for non-existent product', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: 99999, // Non-existent product
      adjustment_type: 'increase',
      quantity_change: 10,
      reason: 'Test'
    };

    await expect(createStockAdjustment(input, testUserId))
      .rejects.toThrow(/Product with id 99999 not found/i);
  });

  it('should handle negative quantity_change for increase by taking absolute value', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: testProductId,
      adjustment_type: 'increase',
      quantity_change: -10, // Negative value
      reason: 'Test negative value handling'
    };

    await createStockAdjustment(input, testUserId);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(110); // 100 + 10 (absolute value)
  });

  it('should handle recount with negative value by setting stock to zero', async () => {
    const input: CreateStockAdjustmentInput = {
      product_id: testProductId,
      adjustment_type: 'recount',
      quantity_change: -5, // Negative recount
      reason: 'Negative recount test'
    };

    await createStockAdjustment(input, testUserId);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(0); // Should not go below 0
  });
});
