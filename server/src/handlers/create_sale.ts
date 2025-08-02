
import { db } from '../db';
import { transactionsTable, transactionItemsTable, productsTable } from '../db/schema';
import { type CreateSaleInput, type Transaction } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function createSale(input: CreateSaleInput, userId: number): Promise<Transaction> {
  try {
    // Calculate total amount from items
    const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = subtotal * input.tax_rate;
    const totalAmount = subtotal + taxAmount - input.discount_amount;

    // Generate unique receipt number
    const timestamp = Date.now();
    const receiptNumber = `RCP-${timestamp}`;

    // Start transaction - create the main transaction record
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        total_amount: totalAmount.toString(),
        tax_amount: taxAmount.toString(),
        discount_amount: input.discount_amount.toString(),
        payment_method: input.payment_method,
        status: 'completed',
        receipt_number: receiptNumber
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Create transaction items and update stock
    for (const item of input.items) {
      // Calculate total price for this item
      const itemTotalPrice = item.quantity * item.unit_price;

      // Insert transaction item
      await db.insert(transactionItemsTable)
        .values({
          transaction_id: transaction.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
          total_price: itemTotalPrice.toString()
        })
        .execute();

      // Update product stock quantity (decrease by sold quantity)
      await db.update(productsTable)
        .set({
          stock_quantity: sql`${productsTable.stock_quantity} - ${item.quantity}`
        })
        .where(eq(productsTable.id, item.product_id))
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount)
    };
  } catch (error) {
    console.error('Sale creation failed:', error);
    throw error;
  }
}
