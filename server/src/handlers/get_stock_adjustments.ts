
import { db } from '../db';
import { stockAdjustmentsTable } from '../db/schema';
import { type StockAdjustment } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getStockAdjustments(productId?: number): Promise<StockAdjustment[]> {
  try {
    let results;

    if (productId !== undefined) {
      // Query with product filter
      results = await db.select()
        .from(stockAdjustmentsTable)
        .where(eq(stockAdjustmentsTable.product_id, productId))
        .orderBy(desc(stockAdjustmentsTable.created_at))
        .execute();
    } else {
      // Query without filter
      results = await db.select()
        .from(stockAdjustmentsTable)
        .orderBy(desc(stockAdjustmentsTable.created_at))
        .execute();
    }

    // Return results - no numeric conversion needed as quantity_change is integer
    return results;
  } catch (error) {
    console.error('Failed to fetch stock adjustments:', error);
    throw error;
  }
}
