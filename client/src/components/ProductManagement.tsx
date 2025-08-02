
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, Product, CreateProductInput, UpdateProductInput } from '../../../server/src/schema';

interface ProductManagementProps {
  currentUser: User;
}

export function ProductManagement({ currentUser }: ProductManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    description: null,
    barcode: null,
    cost_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    min_stock_level: 0,
    category: null
  });

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: null,
      barcode: null,
      cost_price: 0,
      selling_price: 0,
      stock_quantity: 0,
      min_stock_level: 0,
      category: null
    });
    setEditingProduct(null);
  }, []);

  // Handle create/update product
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingProduct) {
        // Update existing product
        const updateData: UpdateProductInput = {
          id: editingProduct.id,
          ...formData
        };
        await trpc.updateProduct.mutate(updateData);
        setProducts((prev: Product[]) =>
          prev.map((p: Product) =>
            p.id === editingProduct.id ? { ...p, ...formData, updated_at: new Date() } : p
          )
        );
      } else {
        // Create new product
        const newProduct = await trpc.createProduct.mutate(formData);
        setProducts((prev: Product[]) => [...prev, newProduct]);
      }

      resetForm();
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, editingProduct, resetForm]);

  // Start editing a product
  const startEdit = useCallback((product: Product) => {
    setFormData({
      name: product.name,
      description: product.description,
      barcode: product.barcode,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      category: product.category
    });
    setEditingProduct(product);
    setShowAddDialog(true);
  }, []);

  // Filter products
  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm)) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canEdit = currentUser.role === 'manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📦 Product Management</h2>
          <p className="text-gray-600">Manage your store inventory</p>
        </div>
        {canEdit && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                ➕ Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData((prev: CreateProductInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({
                        ...prev,
                        barcode: e.target.value || null
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateProductInput) => ({
                        ...prev,
                        category: e.target.value || null
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost_price">Cost Price *</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost_price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({
                          ...prev,
                          cost_price: parseFloat(e.target.value) || 0
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="selling_price">Selling Price *</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.selling_price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({
                          ...prev,
                          selling_price: parseFloat(e.target.value) || 0
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({
                          ...prev,
                          stock_quantity: parseInt(e.target.value) || 0
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="min_stock_level">Min. Stock Level</Label>
                    <Input
                      id="min_stock_level"
                      type="number"
                      min="0"
                      value={formData.min_stock_level}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateProductInput) => ({
                          ...prev,
                          min_stock_level: parseInt(e.target.value) || 0
                        }))
                      }
                    />
                  </div>
                </div>

                {formData.selling_price > 0 && formData.cost_price > 0 && (
                  <Alert>
                    <AlertDescription>
                      Profit Margin: {((formData.selling_price - formData.cost_price) / formData.cost_price * 100).toFixed(1)}%
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Search products by name, barcode, or category..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length === 0 && searchTerm && (
          <div className="col-span-full text-center py-8 text-gray-500">
            No products found matching "{searchTerm}"
          </div>
        )}
        {filteredProducts.length === 0 && !searchTerm && (
          <div className="col-span-full text-center py-8 text-gray-500">
            No products yet. {canEdit && 'Add your first product!'}
          </div>
        )}
        {filteredProducts.map((product: Product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <Badge
                  variant={
                    product.stock_quantity <= product.min_stock_level
                      ? 'destructive'
                      : product.stock_quantity <= product.min_stock_level * 2
                      ? 'secondary'
                      : 'default'
                  }
                >
                  Stock: {product.stock_quantity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Cost Price:</span>
                  <span className="font-medium">${product.cost_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Selling Price:</span>
                  <span className="font-bold text-green-600">${product.selling_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Profit Margin:</span>
                  <span className="font-medium">
                    {((product.selling_price - product.cost_price) / product.cost_price * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {product.barcode && (
                <p className="text-xs text-gray-500">Barcode: {product.barcode}</p>
              )}
              
              {product.category && (
                <Badge variant="outline" className="text-xs">
                  {product.category}
                </Badge>
              )}

              {canEdit && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(product)}
                    className="w-full"
                  >
                    ✏️ Edit Product
                  </Button>
                </div>
              )}

              <div className="text-xs text-gray-400">
                Added: {product.created_at.toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
