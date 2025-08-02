
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type BarcodeSearchInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export async function getProductByBarcode(input: BarcodeSearchInput): Promise<Product | null> {
  try {
    const result = await db.select()
      .from(productsTable)
      .where(eq(productsTable.barcode, input.barcode))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const product = result[0];
    return {
      ...product,
      cost_price: parseFloat(product.cost_price),
      selling_price: parseFloat(product.selling_price)
    };
  } catch (error) {
    console.error('Product barcode search failed:', error);
    throw error;
  }
}
