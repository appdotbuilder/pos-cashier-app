
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type BarcodeSearchInput, type CreateProductInput } from '../schema';
import { getProductByBarcode } from '../handlers/get_product_by_barcode';

// Test product with barcode
const testProduct: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for barcode testing',
  barcode: '1234567890123',
  cost_price: 10.50,
  selling_price: 19.99,
  stock_quantity: 100,
  min_stock_level: 10,
  category: 'Electronics'
};

describe('getProductByBarcode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should find product by barcode', async () => {
    // Create test product with barcode
    await db.insert(productsTable)
      .values({
        name: testProduct.name,
        description: testProduct.description,
        barcode: testProduct.barcode,
        cost_price: testProduct.cost_price.toString(),
        selling_price: testProduct.selling_price.toString(),
        stock_quantity: testProduct.stock_quantity,
        min_stock_level: testProduct.min_stock_level,
        category: testProduct.category
      })
      .execute();

    const input: BarcodeSearchInput = {
      barcode: '1234567890123'
    };

    const result = await getProductByBarcode(input);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Test Product');
    expect(result!.barcode).toEqual('1234567890123');
    expect(result!.cost_price).toEqual(10.50);
    expect(result!.selling_price).toEqual(19.99);
    expect(result!.stock_quantity).toEqual(100);
    expect(result!.category).toEqual('Electronics');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent barcode', async () => {
    const input: BarcodeSearchInput = {
      barcode: 'nonexistent-barcode'
    };

    const result = await getProductByBarcode(input);

    expect(result).toBeNull();
  });

  it('should handle empty barcode string', async () => {
    const input: BarcodeSearchInput = {
      barcode: ''
    };

    const result = await getProductByBarcode(input);

    expect(result).toBeNull();
  });

  it('should find correct product when multiple products exist', async () => {
    // Create multiple products with different barcodes
    await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          barcode: 'BARCODE-A',
          cost_price: '5.00',
          selling_price: '10.00',
          stock_quantity: 50,
          min_stock_level: 5
        },
        {
          name: 'Product B',
          barcode: 'BARCODE-B',
          cost_price: '15.00',
          selling_price: '25.00',
          stock_quantity: 30,
          min_stock_level: 3
        }
      ])
      .execute();

    const input: BarcodeSearchInput = {
      barcode: 'BARCODE-B'
    };

    const result = await getProductByBarcode(input);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Product B');
    expect(result!.barcode).toEqual('BARCODE-B');
    expect(result!.cost_price).toEqual(15.00);
    expect(result!.selling_price).toEqual(25.00);
  });

  it('should handle product with null barcode correctly', async () => {
    // Create product without barcode
    await db.insert(productsTable)
      .values({
        name: 'No Barcode Product',
        barcode: null,
        cost_price: '8.00',
        selling_price: '12.00',
        stock_quantity: 25,
        min_stock_level: 2
      })
      .execute();

    const input: BarcodeSearchInput = {
      barcode: '1234567890123'
    };

    const result = await getProductByBarcode(input);

    expect(result).toBeNull();
  });
});
