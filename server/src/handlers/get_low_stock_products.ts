
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { lte, sql } from 'drizzle-orm';

export async function getLowStockProducts(): Promise<Product[]> {
  try {
    // Find products where stock_quantity <= min_stock_level
    const results = await db.select()
      .from(productsTable)
      .where(lte(productsTable.stock_quantity, sql`${productsTable.min_stock_level}`))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(product => ({
      ...product,
      cost_price: parseFloat(product.cost_price),
      selling_price: parseFloat(product.selling_price)
    }));
  } catch (error) {
    console.error('Failed to get low stock products:', error);
    throw error;
  }
}
