
import { db } from '../db';
import { transactionsTable, transactionItemsTable, productsTable } from '../db/schema';
import { type DateRangeInput, type SalesReport } from '../schema';
import { eq, gte, lte, and, desc, sum, count, sql } from 'drizzle-orm';

export async function getSalesReport(input: DateRangeInput): Promise<SalesReport> {
  try {
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);

    // Get basic sales metrics from completed transactions
    const salesMetrics = await db
      .select({
        total_sales: sum(transactionsTable.total_amount),
        total_transactions: count(transactionsTable.id),
        total_cost: sum(sql`${transactionItemsTable.quantity} * ${productsTable.cost_price}`),
      })
      .from(transactionsTable)
      .innerJoin(transactionItemsTable, eq(transactionsTable.id, transactionItemsTable.transaction_id))
      .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .where(
        and(
          eq(transactionsTable.status, 'completed'),
          gte(transactionsTable.created_at, startDate),
          lte(transactionsTable.created_at, endDate)
        )
      )
      .execute();

    const metrics = salesMetrics[0];
    const totalSales = parseFloat(metrics.total_sales || '0');
    const totalTransactions = metrics.total_transactions || 0;
    const totalCost = parseFloat(metrics.total_cost || '0');
    const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const totalProfit = totalSales - totalCost;

    // Get top-selling products
    const topProducts = await db
      .select({
        product_id: productsTable.id,
        product_name: productsTable.name,
        quantity_sold: sum(transactionItemsTable.quantity),
        revenue: sum(transactionItemsTable.total_price),
      })
      .from(transactionItemsTable)
      .innerJoin(transactionsTable, eq(transactionItemsTable.transaction_id, transactionsTable.id))
      .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .where(
        and(
          eq(transactionsTable.status, 'completed'),
          gte(transactionsTable.created_at, startDate),
          lte(transactionsTable.created_at, endDate)
        )
      )
      .groupBy(productsTable.id, productsTable.name)
      .orderBy(desc(sum(transactionItemsTable.quantity)))
      .limit(5)
      .execute();

    // Get sales by payment method
    const paymentMethodStats = await db
      .select({
        payment_method: transactionsTable.payment_method,
        count: count(transactionsTable.id),
        total_amount: sum(transactionsTable.total_amount),
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.status, 'completed'),
          gte(transactionsTable.created_at, startDate),
          lte(transactionsTable.created_at, endDate)
        )
      )
      .groupBy(transactionsTable.payment_method)
      .execute();

    return {
      total_sales: totalSales,
      total_transactions: totalTransactions,
      average_transaction_value: averageTransactionValue,
      total_profit: totalProfit,
      top_selling_products: topProducts.map(product => ({
        product_id: product.product_id,
        product_name: product.product_name,
        quantity_sold: typeof product.quantity_sold === 'string' ? parseInt(product.quantity_sold) : (product.quantity_sold || 0),
        revenue: parseFloat(product.revenue || '0')
      })),
      sales_by_payment_method: paymentMethodStats.map(stat => ({
        payment_method: stat.payment_method,
        count: stat.count,
        total_amount: parseFloat(stat.total_amount || '0')
      }))
    };
  } catch (error) {
    console.error('Sales report generation failed:', error);
    throw error;
  }
}
