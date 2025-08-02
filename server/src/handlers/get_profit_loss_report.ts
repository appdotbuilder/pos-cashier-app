
import { db } from '../db';
import { transactionsTable, transactionItemsTable, productsTable } from '../db/schema';
import { type DateRangeInput, type ProfitLossReport } from '../schema';
import { eq, and, gte, lte, sum } from 'drizzle-orm';

export async function getProfitLossReport(input: DateRangeInput): Promise<ProfitLossReport> {
  try {
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);
    
    // Get completed transactions in date range with their items and product details
    const transactionData = await db.select({
      transactionId: transactionsTable.id,
      totalAmount: transactionsTable.total_amount,
      quantity: transactionItemsTable.quantity,
      unitPrice: transactionItemsTable.unit_price,
      costPrice: productsTable.cost_price,
      totalPrice: transactionItemsTable.total_price
    })
    .from(transactionsTable)
    .innerJoin(transactionItemsTable, eq(transactionsTable.id, transactionItemsTable.transaction_id))
    .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
    .where(and(
      eq(transactionsTable.status, 'completed'),
      gte(transactionsTable.created_at, startDate),
      lte(transactionsTable.created_at, endDate)
    ))
    .execute();

    // Calculate totals
    let totalRevenue = 0;
    let totalCostOfGoodsSold = 0;
    const uniqueTransactions = new Set<number>();

    transactionData.forEach(item => {
      // Track unique transactions for count
      uniqueTransactions.add(item.transactionId);
      
      // Convert numeric fields to numbers
      const itemRevenue = parseFloat(item.totalPrice);
      const itemCostPrice = parseFloat(item.costPrice);
      const quantity = item.quantity;
      
      // Add to revenue
      totalRevenue += itemRevenue;
      
      // Calculate cost of goods sold for this item
      const itemCostOfGoodsSold = itemCostPrice * quantity;
      totalCostOfGoodsSold += itemCostOfGoodsSold;
    });

    // Calculate derived metrics
    const grossProfit = totalRevenue - totalCostOfGoodsSold;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const totalTransactions = uniqueTransactions.size;

    return {
      total_revenue: totalRevenue,
      total_cost_of_goods_sold: totalCostOfGoodsSold,
      gross_profit: grossProfit,
      gross_profit_margin: grossProfitMargin,
      total_transactions: totalTransactions,
      period_start: startDate,
      period_end: endDate
    };
  } catch (error) {
    console.error('Profit loss report generation failed:', error);
    throw error;
  }
}
