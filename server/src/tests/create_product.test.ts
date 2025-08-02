
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for testing',
  barcode: 'TEST123456',
  cost_price: 15.50,
  selling_price: 19.99,
  stock_quantity: 100,
  min_stock_level: 10,
  category: 'Electronics'
};

// Minimal test input
const minimalInput: CreateProductInput = {
  name: 'Minimal Product',
  cost_price: 10.00,
  selling_price: 15.00,
  stock_quantity: 50,
  min_stock_level: 0
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.description).toEqual('A product for testing');
    expect(result.barcode).toEqual('TEST123456');
    expect(result.cost_price).toEqual(15.50);
    expect(result.selling_price).toEqual(19.99);
    expect(result.stock_quantity).toEqual(100);
    expect(result.min_stock_level).toEqual(10);
    expect(result.category).toEqual('Electronics');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.selling_price).toBe('number');
  });

  it('should create a product with minimal fields', async () => {
    const result = await createProduct(minimalInput);

    expect(result.name).toEqual('Minimal Product');
    expect(result.description).toBeNull();
    expect(result.barcode).toBeNull();
    expect(result.cost_price).toEqual(10.00);
    expect(result.selling_price).toEqual(15.00);
    expect(result.stock_quantity).toEqual(50);
    expect(result.min_stock_level).toEqual(0);
    expect(result.category).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database correctly', async () => {
    const result = await createProduct(testInput);

    // Query database to verify product was saved
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    const savedProduct = products[0];
    expect(savedProduct.name).toEqual('Test Product');
    expect(savedProduct.description).toEqual('A product for testing');
    expect(savedProduct.barcode).toEqual('TEST123456');
    expect(parseFloat(savedProduct.cost_price)).toEqual(15.50);
    expect(parseFloat(savedProduct.selling_price)).toEqual(19.99);
    expect(savedProduct.stock_quantity).toEqual(100);
    expect(savedProduct.min_stock_level).toEqual(10);
    expect(savedProduct.category).toEqual('Electronics');
    expect(savedProduct.created_at).toBeInstanceOf(Date);
    expect(savedProduct.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for duplicate barcode', async () => {
    // Create first product
    await createProduct(testInput);

    // Try to create second product with same barcode
    const duplicateInput: CreateProductInput = {
      name: 'Duplicate Product',
      cost_price: 5.00,
      selling_price: 8.00,
      stock_quantity: 25,
      min_stock_level: 0,
      barcode: 'TEST123456' // Same barcode
    };

    await expect(createProduct(duplicateInput)).rejects.toThrow(/barcode.*already exists/i);
  });

  it('should allow products without barcode', async () => {
    const input1: CreateProductInput = {
      name: 'Product 1',
      cost_price: 10.00,
      selling_price: 15.00,
      stock_quantity: 30,
      min_stock_level: 0
    };

    const input2: CreateProductInput = {
      name: 'Product 2',
      cost_price: 12.00,
      selling_price: 18.00,
      stock_quantity: 40,
      min_stock_level: 0
    };

    // Both should succeed since no barcode is provided
    const result1 = await createProduct(input1);
    const result2 = await createProduct(input2);

    expect(result1.barcode).toBeNull();
    expect(result2.barcode).toBeNull();
    expect(result1.id).not.toEqual(result2.id);
  });

  it('should handle different barcode values correctly', async () => {
    const input1: CreateProductInput = {
      name: 'Product 1',
      cost_price: 10.00,
      selling_price: 15.00,
      stock_quantity: 30,
      min_stock_level: 0,
      barcode: 'UNIQUE001'
    };

    const input2: CreateProductInput = {
      name: 'Product 2',
      cost_price: 12.00,
      selling_price: 18.00,
      stock_quantity: 40,
      min_stock_level: 0,
      barcode: 'UNIQUE002'
    };

    // Both should succeed with different barcodes
    const result1 = await createProduct(input1);
    const result2 = await createProduct(input2);

    expect(result1.barcode).toEqual('UNIQUE001');
    expect(result2.barcode).toEqual('UNIQUE002');
    expect(result1.id).not.toEqual(result2.id);
  });
});
