
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // First verify the product exists
    const existingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();

    if (existingProducts.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.barcode !== undefined) {
      updateData.barcode = input.barcode;
    }
    if (input.cost_price !== undefined) {
      updateData.cost_price = input.cost_price.toString();
    }
    if (input.selling_price !== undefined) {
      updateData.selling_price = input.selling_price.toString();
    }
    if (input.stock_quantity !== undefined) {
      updateData.stock_quantity = input.stock_quantity;
    }
    if (input.min_stock_level !== undefined) {
      updateData.min_stock_level = input.min_stock_level;
    }
    if (input.category !== undefined) {
      updateData.category = input.category;
    }

    // Update the product
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const product = result[0];
    return {
      ...product,
      cost_price: parseFloat(product.cost_price),
      selling_price: parseFloat(product.selling_price)
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};
