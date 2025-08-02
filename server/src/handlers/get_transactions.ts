
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction, type DateRangeInput } from '../schema';
import { desc, and, gte, lte, type SQL } from 'drizzle-orm';

export async function getTransactions(dateRange?: DateRangeInput): Promise<Transaction[]> {
  try {
    // Build the base query
    let baseQuery = db.select().from(transactionsTable);

    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Apply date filtering if provided
    if (dateRange) {
      const startDate = new Date(dateRange.start_date);
      const endDate = new Date(dateRange.end_date);
      
      // Set end date to end of day (23:59:59.999)
      endDate.setHours(23, 59, 59, 999);

      conditions.push(gte(transactionsTable.created_at, startDate));
      conditions.push(lte(transactionsTable.created_at, endDate));
    }

    // Apply conditions if any exist
    const finalQuery = conditions.length > 0
      ? baseQuery.where(and(...conditions)).orderBy(desc(transactionsTable.created_at))
      : baseQuery.orderBy(desc(transactionsTable.created_at));

    const results = await finalQuery.execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount)
    }));
  } catch (error) {
    console.error('Failed to get transactions:', error);
    throw error;
  }
}
