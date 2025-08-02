
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getLowStockProducts } from '../handlers/get_low_stock_products';

// Test products with different stock scenarios
const testProducts: CreateProductInput[] = [
  {
    name: 'Low Stock Product 1',
    description: 'Product below minimum stock',
    cost_price: 10.00,
    selling_price: 15.00,
    stock_quantity: 5,
    min_stock_level: 10,
    category: 'test'
  },
  {
    name: 'Low Stock Product 2',
    description: 'Product at minimum stock',
    cost_price: 20.00,
    selling_price: 30.00,
    stock_quantity: 15,
    min_stock_level: 15,
    category: 'test'
  },
  {
    name: 'Normal Stock Product',
    description: 'Product above minimum stock',
    cost_price: 8.00,
    selling_price: 12.00,
    stock_quantity: 50,
    min_stock_level: 20,
    category: 'test'
  },
  {
    name: 'Zero Stock Product',
    description: 'Product with no stock',
    cost_price: 5.00,
    selling_price: 8.00,
    stock_quantity: 0,
    min_stock_level: 5,
    category: 'test'
  }
];

describe('getLowStockProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return products with stock at or below minimum level', async () => {
    // Create test products
    await db.insert(productsTable)
      .values(testProducts.map(product => ({
        ...product,
        cost_price: product.cost_price.toString(),
        selling_price: product.selling_price.toString()
      })))
      .execute();

    const result = await getLowStockProducts();

    // Should return 3 products: 2 low stock + 1 zero stock
    expect(result).toHaveLength(3);

    // Verify correct products are returned
    const productNames = result.map(p => p.name).sort();
    expect(productNames).toEqual([
      'Low Stock Product 1',
      'Low Stock Product 2', 
      'Zero Stock Product'
    ]);

    // Verify all returned products have stock <= min_stock_level
    result.forEach(product => {
      expect(product.stock_quantity).toBeLessThanOrEqual(product.min_stock_level);
    });
  });

  it('should return empty array when no products are low on stock', async () => {
    // Create only products with good stock levels
    const goodStockProduct: CreateProductInput = {
      name: 'Well Stocked Product',
      description: 'Product with plenty of stock',
      cost_price: 10.00,
      selling_price: 15.00,
      stock_quantity: 100,
      min_stock_level: 10,
      category: 'test'
    };

    await db.insert(productsTable)
      .values({
        ...goodStockProduct,
        cost_price: goodStockProduct.cost_price.toString(),
        selling_price: goodStockProduct.selling_price.toString()
      })
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });

  it('should convert numeric fields correctly', async () => {
    // Create one low stock product
    await db.insert(productsTable)
      .values({
        ...testProducts[0],
        cost_price: testProducts[0].cost_price.toString(),
        selling_price: testProducts[0].selling_price.toString()
      })
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    const product = result[0];

    // Verify numeric fields are properly converted
    expect(typeof product.cost_price).toBe('number');
    expect(typeof product.selling_price).toBe('number');
    expect(product.cost_price).toEqual(10.00);
    expect(product.selling_price).toEqual(15.00);

    // Verify other fields
    expect(product.name).toEqual('Low Stock Product 1');
    expect(product.stock_quantity).toEqual(5);
    expect(product.min_stock_level).toEqual(10);
    expect(product.id).toBeDefined();
    expect(product.created_at).toBeInstanceOf(Date);
    expect(product.updated_at).toBeInstanceOf(Date);
  });

  it('should handle products with zero minimum stock level', async () => {
    // Create product with 0 min stock level but positive stock
    const zeroMinProduct: CreateProductInput = {
      name: 'Zero Min Stock Product',
      description: 'Product with zero minimum stock level',
      cost_price: 5.00,
      selling_price: 10.00,
      stock_quantity: 5,
      min_stock_level: 0,
      category: 'test'
    };

    await db.insert(productsTable)
      .values({
        ...zeroMinProduct,
        cost_price: zeroMinProduct.cost_price.toString(),
        selling_price: zeroMinProduct.selling_price.toString()
      })
      .execute();

    const result = await getLowStockProducts();

    // Should not return this product since stock (5) > min_stock_level (0)
    expect(result).toHaveLength(0);
  });
});
