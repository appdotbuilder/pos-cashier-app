
import { db } from '../db';
import { transactionsTable, transactionItemsTable, productsTable } from '../db/schema';
import { type ReceiptInput, type Receipt } from '../schema';
import { eq } from 'drizzle-orm';

export async function generateReceipt(input: ReceiptInput): Promise<Receipt> {
  try {
    // Fetch transaction details
    const transactionResult = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.transaction_id))
      .execute();

    if (transactionResult.length === 0) {
      throw new Error(`Transaction with ID ${input.transaction_id} not found`);
    }

    const transactionData = transactionResult[0];

    // Convert numeric fields back to numbers
    const transaction = {
      ...transactionData,
      total_amount: parseFloat(transactionData.total_amount),
      tax_amount: parseFloat(transactionData.tax_amount),
      discount_amount: parseFloat(transactionData.discount_amount)
    };

    // Fetch transaction items with product details
    const itemsResult = await db.select()
      .from(transactionItemsTable)
      .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .where(eq(transactionItemsTable.transaction_id, input.transaction_id))
      .execute();

    // Map items with product names and convert numeric fields
    const items = itemsResult.map(result => ({
      id: result.transaction_items.id,
      transaction_id: result.transaction_items.transaction_id,
      product_id: result.transaction_items.product_id,
      quantity: result.transaction_items.quantity,
      unit_price: parseFloat(result.transaction_items.unit_price),
      total_price: parseFloat(result.transaction_items.total_price),
      created_at: result.transaction_items.created_at,
      product_name: result.products.name
    }));

    // Business information (static for now, could be configurable)
    const business_info = {
      name: 'Point of Sale System',
      address: '123 Business Street, City, Country',
      phone: '+1-234-567-8900',
      email: 'info@possystem.com'
    };

    return {
      transaction,
      items,
      business_info
    };
  } catch (error) {
    console.error('Receipt generation failed:', error);
    throw error;
  }
}
