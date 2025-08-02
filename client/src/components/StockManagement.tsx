
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Product, 
  StockAdjustment, 
  CreateStockAdjustmentInput, 
  StockAdjustmentType 
} from '../../../server/src/schema';

interface StockManagementProps {
  currentUser: User;
}

export function StockManagement({ currentUser }: StockManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [adjustmentForm, setAdjustmentForm] = useState<CreateStockAdjustmentInput>({
    product_id: 0,
    adjustment_type: 'increase',
    quantity_change: 0,
    reason: ''
  });

  // Load data
  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  const loadLowStockProducts = useCallback(async () => {
    try {
      const result = await trpc.getLowStockProducts.query();
      setLowStockProducts(result);
    } catch (error) {
      console.error('Failed to load low stock products:', error);
    }
  }, []);

  const loadStockAdjustments = useCallback(async () => {
    try {
      const result = await trpc.getStockAdjustments.query({});
      setStockAdjustments(result);
    } catch (error) {
      console.error('Failed to load stock adjustments:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadLowStockProducts();
    loadStockAdjustments();
  }, [loadProducts, loadLowStockProducts, loadStockAdjustments]);

  // Handle stock adjustment
  const handleStockAdjustment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsLoading(true);
    try {
      const adjustmentData: CreateStockAdjustmentInput = {
        ...adjustmentForm,
        product_id: selectedProduct.id
      };

      await trpc.createStockAdjustment.mutate(adjustmentData);
      
      // Update local product stock
      const newQuantity = adjustmentForm.adjustment_type === 'increase'
        ? selectedProduct.stock_quantity + adjustmentForm.quantity_change
        : adjustmentForm.adjustment_type === 'decrease'
        ? selectedProduct.stock_quantity - adjustmentForm.quantity_change
        : adjustmentForm.quantity_change; // recount

      setProducts((prev: Product[]) =>
        prev.map((p: Product) =>
          p.id === selectedProduct.id
            ? { ...p, stock_quantity: Math.max(0, newQuantity), updated_at: new Date() }
            : p
        )
      );

      // Reset form and close dialog
      setAdjustmentForm({
        product_id: 0,
        adjustment_type: 'increase',
        quantity_change: 0,
        reason: ''
      });
      setSelectedProduct(null);
      setShowAdjustDialog(false);
      
      // Reload data
      await Promise.all([loadLowStockProducts(), loadStockAdjustments()]);
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      alert('Failed to adjust stock. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [adjustmentForm, selectedProduct, loadLowStockProducts, loadStockAdjustments]);

  // Start stock adjustment for a product
  const startAdjustment = useCallback((product: Product) => {
    setSelectedProduct(product);
    setAdjustmentForm({
      product_id: product.id,
      adjustment_type: 'increase',
      quantity_change: 0,
      reason: ''
    });
    setShowAdjustDialog(true);
  }, []);

  const getAdjustmentIcon = (type: StockAdjustmentType) => {
    switch (type) {
      case 'increase': return '📈';
      case 'decrease': return '📉';
      case 'recount': return '🔄';
      default: return '📊';
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) return { text: 'Out of Stock', variant: 'destructive' as const };
    if (product.stock_quantity <= product.min_stock_level) return { text: 'Low Stock', variant: 'destructive' as const };
    if (product.stock_quantity <= product.min_stock_level * 2) return { text: 'Warning', variant: 'secondary' as const };
    return { text: 'In Stock', variant: 'default' as const };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">📊 Stock Management</h2>
        <p className="text-gray-600">Monitor and adjust inventory levels</p>
        {currentUser.role === 'manager' && (
          <p className="text-sm text-blue-600 mt-1">Manager access: Full stock control available</p>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="low-stock">⚠️ Low Stock</TabsTrigger>
          <TabsTrigger value="all-products">📦 All Products</TabsTrigger>
          <TabsTrigger value="adjustments">📝 History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{products.length}</div>
                  <div className="text-sm text-gray-600">Total Products</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{lowStockProducts.length}</div>
                  <div className="text-sm text-gray-600">Low Stock Items</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {products.filter((p: Product) => p.stock_quantity === 0).length}
                  </div>
                  <div className="text-sm text-gray-600">Out of Stock</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${products.reduce((sum, p) => sum + (p.stock_quantity * p.cost_price), 0).toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600">Stock Value</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          {lowStockProducts.length > 0 && (
            <Alert>
              <AlertDescription>
                <strong>⚠️ Attention:</strong> {lowStockProducts.length} products are running low on stock. 
                Check the Low Stock tab for details.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="low-stock" className="space-y-4">
          {lowStockProducts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-8">
                <p className="text-gray-500">✅ All products are well stocked!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockProducts.map((product: Product) => {
                const status = getStockStatus(product);
                return (
                  <Card key={product.id} className="border-red-200">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Current Stock:</span>
                          <span className="font-bold text-red-600">{product.stock_quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Min. Level:</span>
                          <span className="font-medium">{product.min_stock_level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Suggested Reorder:</span>
                          <span className="font-medium text-green-600">
                            {Math.max(0, product.min_stock_level * 3 - product.stock_quantity)}
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => startAdjustment(product)}
                        className="w-full"
                      >
                        📈 Adjust Stock
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* All Products Tab */}
        <TabsContent value="all-products" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product: Product) => {
              const status = getStockStatus(product);
              return (
                <Card key={product.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Stock:</span>
                        <span className="font-bold">{product.stock_quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Min. Level:</span>
                        <span className="font-medium">{product.min_stock_level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Value:</span>
                        <span className="font-medium">
                          ${(product.stock_quantity * product.cost_price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startAdjustment(product)}
                      className="w-full"
                    >
                      ⚙️ Adjust Stock
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Adjustments History Tab */}
        <TabsContent value="adjustments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📝 Stock Adjustment History</CardTitle>
            </CardHeader>
            <CardContent>
              {stockAdjustments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No stock adjustments yet.</p>
              ) : (
                <div className="space-y-3">
                  {stockAdjustments.map((adjustment: StockAdjustment) => (
                    <div key={adjustment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getAdjustmentIcon(adjustment.adjustment_type)}</span>
                        <div>
                          <p className="font-medium">Product ID: {adjustment.product_id}</p>
                          <p className="text-sm text-gray-600">{adjustment.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {adjustment.adjustment_type === 'increase' ? '+' : 
                           adjustment.adjustment_type === 'decrease' ? '-' : ''}
                          {adjustment.quantity_change}
                        </p>
                        <p className="text-xs text-gray-500">
                          {adjustment.created_at.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>📊 Adjust Stock - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockAdjustment} className="space-y-4">
            <Alert>
              <AlertDescription>
                Current stock: <strong>{selectedProduct?.stock_quantity}</strong> units
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="adjustment_type">Adjustment Type</Label>
              <Select
                value={adjustmentForm.adjustment_type || 'increase'}
                onValueChange={(value: StockAdjustmentType) =>
                  setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({
                    ...prev,
                    adjustment_type: value
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">📈 Increase Stock</SelectItem>
                  <SelectItem value="decrease">📉 Decrease Stock</SelectItem>
                  <SelectItem value="recount">🔄 Recount Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity_change">
                {adjustmentForm.adjustment_type === 'recount' ? 'New Stock Count' : 'Quantity Change'}
              </Label>
              <Input
                id="quantity_change"
                type="number"
                min="0"
                value={adjustmentForm.quantity_change}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({
                    ...prev,
                    quantity_change: parseInt(e.target.value) || 0
                  }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={adjustmentForm.reason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setAdjustmentForm((prev: CreateStockAdjustmentInput) => ({
                    ...prev,
                    reason: e.target.value
                  }))
                }
                placeholder="Explain the reason for this adjustment..."
                required
              />
            </div>

            {selectedProduct && adjustmentForm.quantity_change > 0 && (
              <Alert>
                <AlertDescription>
                  New stock will be: <strong>
                    {adjustmentForm.adjustment_type === 'increase'
                      ? selectedProduct.stock_quantity + adjustmentForm.quantity_change
                      : adjustmentForm.adjustment_type === 'decrease'
                      ? Math.max(0, selectedProduct.stock_quantity - adjustmentForm.quantity_change)
                      : adjustmentForm.quantity_change
                    }
                  </strong> units
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Processing...' : 'Apply Adjustment'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdjustDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
