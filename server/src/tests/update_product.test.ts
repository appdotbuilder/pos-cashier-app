
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testProductId: number;

  beforeEach(async () => {
    // Create a test product to update
    const result = await db.insert(productsTable)
      .values({
        name: 'Original Product',
        description: 'Original description',
        barcode: 'ORIG123',
        cost_price: '10.00',
        selling_price: '15.00',
        stock_quantity: 50,
        min_stock_level: 5,
        category: 'Electronics'
      })
      .returning()
      .execute();
    
    testProductId = result[0].id;
  });

  it('should update all product fields', async () => {
    const updateInput: UpdateProductInput = {
      id: testProductId,
      name: 'Updated Product',
      description: 'Updated description',
      barcode: 'UPD123',
      cost_price: 12.50,
      selling_price: 18.99,
      stock_quantity: 75,
      min_stock_level: 10,
      category: 'Updated Electronics'
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toEqual(testProductId);
    expect(result.name).toEqual('Updated Product');
    expect(result.description).toEqual('Updated description');
    expect(result.barcode).toEqual('UPD123');
    expect(result.cost_price).toEqual(12.50);
    expect(result.selling_price).toEqual(18.99);
    expect(result.stock_quantity).toEqual(75);
    expect(result.min_stock_level).toEqual(10);
    expect(result.category).toEqual('Updated Electronics');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.selling_price).toBe('number');
  });

  it('should update only provided fields', async () => {
    const updateInput: UpdateProductInput = {
      id: testProductId,
      name: 'Partially Updated',
      selling_price: 20.00
    };

    const result = await updateProduct(updateInput);

    expect(result.name).toEqual('Partially Updated');
    expect(result.selling_price).toEqual(20.00);
    // Original values should remain unchanged
    expect(result.description).toEqual('Original description');
    expect(result.barcode).toEqual('ORIG123');
    expect(result.cost_price).toEqual(10.00);
    expect(result.stock_quantity).toEqual(50);
    expect(result.min_stock_level).toEqual(5);
    expect(result.category).toEqual('Electronics');
  });

  it('should update nullable fields to null', async () => {
    const updateInput: UpdateProductInput = {
      id: testProductId,
      description: null,
      barcode: null,
      category: null
    };

    const result = await updateProduct(updateInput);

    expect(result.description).toBeNull();
    expect(result.barcode).toBeNull();
    expect(result.category).toBeNull();
  });

  it('should save updated product to database', async () => {
    const updateInput: UpdateProductInput = {
      id: testProductId,
      name: 'Database Test Product',
      cost_price: 25.99
    };

    await updateProduct(updateInput);

    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Test Product');
    expect(parseFloat(products[0].cost_price)).toEqual(25.99);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original timestamp
    const originalProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    const originalTimestamp = originalProduct[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateProductInput = {
      id: testProductId,
      name: 'Timestamp Test'
    };

    const result = await updateProduct(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999,
      name: 'Non-existent Product'
    };

    expect(updateProduct(updateInput)).rejects.toThrow(/Product with id 99999 not found/i);
  });

  it('should handle numeric precision correctly', async () => {
    const updateInput: UpdateProductInput = {
      id: testProductId,
      cost_price: 12.34, // Using 2 decimal places to match numeric(10, 2)
      selling_price: 19.88 // Using 2 decimal places to match numeric(10, 2)
    };

    const result = await updateProduct(updateInput);

    expect(result.cost_price).toEqual(12.34);
    expect(result.selling_price).toEqual(19.88);
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.selling_price).toBe('number');
  });
});
