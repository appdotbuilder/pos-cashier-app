
import { db } from '../db';
import { stockAdjustmentsTable, productsTable } from '../db/schema';
import { type CreateStockAdjustmentInput, type StockAdjustment } from '../schema';
import { eq } from 'drizzle-orm';

export async function createStockAdjustment(input: CreateStockAdjustmentInput, userId: number): Promise<StockAdjustment> {
  try {
    // First verify that the product exists
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (product.length === 0) {
      throw new Error(`Product with id ${input.product_id} not found`);
    }

    const currentStock = product[0].stock_quantity;

    // Calculate new stock quantity based on adjustment type
    let newStockQuantity: number;
    switch (input.adjustment_type) {
      case 'increase':
        newStockQuantity = currentStock + Math.abs(input.quantity_change);
        break;
      case 'decrease':
        newStockQuantity = Math.max(0, currentStock - Math.abs(input.quantity_change));
        break;
      case 'recount':
        // For recount, quantity_change represents the new total stock count
        newStockQuantity = Math.max(0, input.quantity_change);
        break;
      default:
        throw new Error(`Invalid adjustment type: ${input.adjustment_type}`);
    }

    // Create the stock adjustment record
    const adjustmentResult = await db.insert(stockAdjustmentsTable)
      .values({
        product_id: input.product_id,
        user_id: userId,
        adjustment_type: input.adjustment_type,
        quantity_change: input.quantity_change,
        reason: input.reason
      })
      .returning()
      .execute();

    // Update the product's stock quantity
    await db.update(productsTable)
      .set({ 
        stock_quantity: newStockQuantity,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.product_id))
      .execute();

    return adjustmentResult[0];
  } catch (error) {
    console.error('Stock adjustment creation failed:', error);
    throw error;
  }
}
