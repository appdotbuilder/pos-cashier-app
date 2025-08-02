
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all products', async () => {
    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          description: 'First product',
          cost_price: '10.50',
          selling_price: '15.99',
          stock_quantity: 100,
          min_stock_level: 10,
          category: 'electronics'
        },
        {
          name: 'Product 2',
          description: 'Second product',
          cost_price: '5.25',
          selling_price: '8.75',
          stock_quantity: 50,
          min_stock_level: 5,
          category: 'books'
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    
    // Verify first product
    const product1 = result.find(p => p.name === 'Product 1');
    expect(product1).toBeDefined();
    expect(product1!.name).toEqual('Product 1');
    expect(product1!.description).toEqual('First product');
    expect(product1!.cost_price).toEqual(10.50);
    expect(product1!.selling_price).toEqual(15.99);
    expect(typeof product1!.cost_price).toBe('number');
    expect(typeof product1!.selling_price).toBe('number');
    expect(product1!.stock_quantity).toEqual(100);
    expect(product1!.min_stock_level).toEqual(10);
    expect(product1!.category).toEqual('electronics');
    expect(product1!.id).toBeDefined();
    expect(product1!.created_at).toBeInstanceOf(Date);
    expect(product1!.updated_at).toBeInstanceOf(Date);

    // Verify second product
    const product2 = result.find(p => p.name === 'Product 2');
    expect(product2).toBeDefined();
    expect(product2!.name).toEqual('Product 2');
    expect(product2!.cost_price).toEqual(5.25);
    expect(product2!.selling_price).toEqual(8.75);
    expect(typeof product2!.cost_price).toBe('number');
    expect(typeof product2!.selling_price).toBe('number');
    expect(product2!.category).toEqual('books');
  });

  it('should handle products with null optional fields', async () => {
    // Create product with minimal required fields
    await db.insert(productsTable)
      .values({
        name: 'Minimal Product',
        description: null,
        barcode: null,
        cost_price: '12.00',
        selling_price: '20.00',
        stock_quantity: 25,
        min_stock_level: 0,
        category: null
      })
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Minimal Product');
    expect(result[0].description).toBeNull();
    expect(result[0].barcode).toBeNull();
    expect(result[0].category).toBeNull();
    expect(result[0].cost_price).toEqual(12.00);
    expect(result[0].selling_price).toEqual(20.00);
    expect(typeof result[0].cost_price).toBe('number');
    expect(typeof result[0].selling_price).toBe('number');
  });
});
