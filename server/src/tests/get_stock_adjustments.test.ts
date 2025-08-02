
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, stockAdjustmentsTable } from '../db/schema';
import { getStockAdjustments } from '../handlers/get_stock_adjustments';

describe('getStockAdjustments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no adjustments exist', async () => {
    const result = await getStockAdjustments();
    expect(result).toEqual([]);
  });

  it('should return all stock adjustments ordered by creation date (newest first)', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'cashier'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite products
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          cost_price: '10.00',
          selling_price: '15.00',
          stock_quantity: 100
        },
        {
          name: 'Product 2',
          cost_price: '20.00',
          selling_price: '25.00',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();
    const product1Id = productResults[0].id;
    const product2Id = productResults[1].id;

    // Create stock adjustments with slight delay to ensure different timestamps
    const adjustment1 = await db.insert(stockAdjustmentsTable)
      .values({
        product_id: product1Id,
        user_id: userId,
        adjustment_type: 'increase',
        quantity_change: 10,
        reason: 'Restocking'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const adjustment2 = await db.insert(stockAdjustmentsTable)
      .values({
        product_id: product2Id,
        user_id: userId,
        adjustment_type: 'decrease',
        quantity_change: -5,
        reason: 'Damaged goods'
      })
      .returning()
      .execute();

    const result = await getStockAdjustments();

    expect(result).toHaveLength(2);
    
    // Verify ordering (newest first)
    expect(result[0].id).toEqual(adjustment2[0].id);
    expect(result[1].id).toEqual(adjustment1[0].id);
    
    // Verify first adjustment details
    expect(result[0].product_id).toEqual(product2Id);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].adjustment_type).toEqual('decrease');
    expect(result[0].quantity_change).toEqual(-5);
    expect(result[0].reason).toEqual('Damaged goods');
    expect(result[0].created_at).toBeInstanceOf(Date);
    
    // Verify second adjustment details
    expect(result[1].product_id).toEqual(product1Id);
    expect(result[1].adjustment_type).toEqual('increase');
    expect(result[1].quantity_change).toEqual(10);
    expect(result[1].reason).toEqual('Restocking');
  });

  it('should filter stock adjustments by product ID when provided', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'manager'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite products
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          cost_price: '10.00',
          selling_price: '15.00',
          stock_quantity: 100
        },
        {
          name: 'Product 2',
          cost_price: '20.00',
          selling_price: '25.00',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();
    const product1Id = productResults[0].id;
    const product2Id = productResults[1].id;

    // Create stock adjustments for both products
    await db.insert(stockAdjustmentsTable)
      .values([
        {
          product_id: product1Id,
          user_id: userId,
          adjustment_type: 'increase',
          quantity_change: 10,
          reason: 'Restocking product 1'
        },
        {
          product_id: product1Id,
          user_id: userId,
          adjustment_type: 'recount',
          quantity_change: 2,
          reason: 'Inventory recount product 1'
        },
        {
          product_id: product2Id,
          user_id: userId,
          adjustment_type: 'decrease',
          quantity_change: -3,
          reason: 'Damaged product 2'
        }
      ])
      .execute();

    // Filter by product1Id
    const result = await getStockAdjustments(product1Id);

    expect(result).toHaveLength(2);
    
    // All results should be for product1
    result.forEach(adjustment => {
      expect(adjustment.product_id).toEqual(product1Id);
      expect(adjustment.user_id).toEqual(userId);
      expect(adjustment.created_at).toBeInstanceOf(Date);
    });

    // Verify adjustments are ordered by creation date (newest first)
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    
    // Verify specific adjustment details
    const reasonsFound = result.map(adj => adj.reason);
    expect(reasonsFound).toContain('Restocking product 1');
    expect(reasonsFound).toContain('Inventory recount product 1');
    expect(reasonsFound).not.toContain('Damaged product 2');
  });

  it('should return empty array when filtering by non-existent product ID', async () => {
    // Create prerequisite user and product with adjustments
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'cashier'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 100
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    await db.insert(stockAdjustmentsTable)
      .values({
        product_id: productId,
        user_id: userId,
        adjustment_type: 'increase',
        quantity_change: 5,
        reason: 'Test adjustment'
      })
      .execute();

    // Filter by non-existent product ID
    const nonExistentProductId = 999999;
    const result = await getStockAdjustments(nonExistentProductId);

    expect(result).toEqual([]);
  });
});
