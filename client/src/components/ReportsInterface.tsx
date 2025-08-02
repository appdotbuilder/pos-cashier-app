
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { 
  SalesReport, 
  ProfitLossReport, 
  Transaction, 
  DateRangeInput 
} from '../../../server/src/schema';

interface TopSellingProduct {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

interface PaymentMethodSummary {
  payment_method: string;
  count: number;
  total_amount: number;
}

export function ReportsInterface() {
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [profitLossReport, setProfitLossReport] = useState<ProfitLossReport | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeInput>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end_date: new Date().toISOString().split('T')[0] // today
  });

  // Load reports
  const loadSalesReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const report = await trpc.getSalesReport.query(dateRange);
      setSalesReport(report);
    } catch (error) {
      console.error('Failed to load sales report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  const loadProfitLossReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const report = await trpc.getProfitLossReport.query(dateRange);
      setProfitLossReport(report);
    } catch (error) {
      console.error('Failed to load profit/loss report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getTransactions.query(dateRange);
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  // Generate reports for selected date range
  const generateReports = useCallback(async () => {
    await Promise.all([
      loadSalesReport(),
      loadProfitLossReport(),
      loadTransactions()
    ]);
  }, [loadSalesReport, loadProfitLossReport, loadTransactions]);

  // Load initial reports
  useEffect(() => {
    generateReports();
  }, [generateReports]);

  // Export report as CSV (simplified)
  const exportReport = useCallback((data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((item: Record<string, unknown>) =>
      Object.values(item).map((value: unknown) => 
        typeof value === 'string' ? `"${value}"` : String(value)
      ).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${dateRange.start_date}-to-${dateRange.end_date}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  }, [dateRange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">📈 Financial Reports</h2>
        <p className="text-gray-600">Analyze your business performance</p>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>📅 Report Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={dateRange.start_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDateRange((prev: DateRangeInput) => ({
                    ...prev,
                    start_date: e.target.value
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={dateRange.end_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDateRange((prev: DateRangeInput) => ({
                    ...prev,
                    end_date: e.target.value
                  }))
                }
              />
            </div>
            <Button onClick={generateReports} disabled={isLoading}>
              {isLoading ? 'Generating...' : '🔄 Generate Reports'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="sales">💰 Sales</TabsTrigger>
          <TabsTrigger value="profit-loss">📈 P&L</TabsTrigger>
          <TabsTrigger value="transactions">🧾 Transactions</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${salesReport?.total_sales.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Total Sales</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {salesReport?.total_transactions || 0}
                  </div>
                  <div className="text-sm text-gray-600">Transactions</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    ${salesReport?.average_transaction_value.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Avg. Transaction</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    ${profitLossReport?.gross_profit.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Gross Profit</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Selling Products */}
          {salesReport?.top_selling_products && salesReport.top_selling_products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🏆 Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesReport.top_selling_products.slice(0, 5).map((product: TopSellingProduct, index: number) => (
                    <div key={product.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{product.product_name}</p>
                          <p className="text-sm text-gray-600">Sold: {product.quantity_sold} units</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${product.revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sales Report Tab */}
        <TabsContent value="sales" className="space-y-4">
          {salesReport ? (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Sales Analysis</h3>
                <Button
                  variant="outline"
                  onClick={() => salesReport.top_selling_products && 
                    exportReport(salesReport.top_selling_products, 'sales-report')
                  }
                >
                  📊 Export CSV
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>💰 Sales Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Sales:</span>
                      <span className="font-bold text-green-600">${salesReport.total_sales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Transactions:</span>
                      <span className="font-medium">{salesReport.total_transactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Transaction:</span>
                      <span className="font-medium">${salesReport.average_transaction_value.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Profit:</span>
                      <span className="font-bold text-blue-600">${salesReport.total_profit.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle>💳 Payment Methods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {salesReport.sales_by_payment_method.map((method: PaymentMethodSummary) => (
                        <div key={method.payment_method} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span>
                              {method.payment_method === 'cash' ? '💵' :
                               method.payment_method === 'card' ? '💳' :
                               method.payment_method === 'mobile_money' ? '📱' : '🏦'}
                            </span>
                            <span className="capitalize">{method.payment_method.replace('_', ' ')}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${method.total_amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{method.count} transactions</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Alert>
              <AlertDescription>Generate reports to view sales analysis.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Profit & Loss Tab */}
        <TabsContent value="profit-loss" className="space-y-4">
          {profitLossReport ? (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Profit & Loss Statement</h3>
                <Button
                  variant="outline"
                  onClick={() => exportReport([profitLossReport], 'profit-loss-report')}
                >
                  📊 Export CSV
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>📈 Financial Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-lg">
                      <span>Total Revenue:</span>
                      <span className="font-bold text-green-600">
                        ${profitLossReport.total_revenue.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Cost of Goods Sold:</span>
                      <span className="font-medium text-red-600">
                        ${profitLossReport.total_cost_of_goods_sold.toFixed(2)}
                      </span>
                    </div>
                    
                    <hr />
                    
                    <div className="flex justify-between text-lg">
                      <span>Gross Profit:</span>
                      <span className="font-bold text-blue-600">
                        ${profitLossReport.gross_profit.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Gross Profit Margin:</span>
                      <span className="font-medium">
                        {(profitLossReport.gross_profit_margin * 100).toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Total Transactions:</span>
                      <span>{profitLossReport.total_transactions}</span>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>Period:</strong> {new Date(profitLossReport.period_start).toLocaleDateString()} 
                      {' to '} {new Date(profitLossReport.period_end).toLocaleDateString()}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertDescription>Generate reports to view profit & loss analysis.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Transaction History</h3>
            {transactions.length > 0 && (
              <Button
                variant="outline"
                onClick={() => exportReport(transactions, 'transactions')}
              >
                📊 Export CSV
              </Button>
            )}
          </div>

          {transactions.length === 0 ? (
            <Alert>
              <AlertDescription>No transactions found for the selected period.</AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-2 p-4">
                    {transactions.map((transaction: Transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant={
                            transaction.status === 'completed' ? 'default' :
                            transaction.status === 'pending' ? 'secondary' :
                            transaction.status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {transaction.status}
                          </Badge>
                          <div>
                            <p className="font-medium">Receipt: {transaction.receipt_number}</p>
                            <p className="text-sm text-gray-600">
                              {transaction.created_at.toLocaleDateString()} at{' '}
                              {transaction.created_at.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${transaction.total_amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {transaction.payment_method.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
