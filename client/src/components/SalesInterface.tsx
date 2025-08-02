
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { User, Product, CreateSaleInput, PaymentMethod, Transaction } from '../../../server/src/schema';

interface SaleItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SalesInterfaceProps {
  currentUser: User;
}

export function SalesInterface({ currentUser }: SalesInterfaceProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discount, setDiscount] = useState(0);
  const [taxRate] = useState(0.15); // 15% default tax
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Filter products by search term
  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm)) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Add product to cart
  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total_price: (item.quantity + quantity) * item.unit_price
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity,
          unit_price: product.selling_price,
          total_price: quantity * product.selling_price
        }
      ];
    });
  }, []);

  // Update cart item quantity
  const updateCartItemQuantity = useCallback((productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.product.id === productId
            ? {
                ...item,
                quantity: newQuantity,
                total_price: newQuantity * item.unit_price
              }
            : item
        )
      );
    }
  }, []);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);
  const taxAmount = subtotal * taxRate;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal + taxAmount - discountAmount;

  // Handle barcode scan
  const handleBarcodeSearch = useCallback(async (barcode: string) => {
    if (!barcode.trim()) return;
    
    try {
      const product = await trpc.getProductByBarcode.query({ barcode: barcode.trim() });
      if (product) {
        addToCart(product);
        setBarcodeInput('');
        setSearchTerm('');
      } else {
        alert('Product not found with this barcode');
      }
    } catch (error) {
      console.error('Barcode search failed:', error);
      alert('Failed to search product by barcode');
    }
  }, [addToCart]);

  // Camera barcode scanning (simplified - in real app would use barcode scanner library)
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use rear camera
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      alert('Camera access failed. Please use manual barcode input.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  // Process sale
  const processSale = useCallback(async () => {
    if (cartItems.length === 0) {
      alert('Cart is empty');
      return;
    }

    setIsProcessing(true);
    try {
      const saleData: CreateSaleInput = {
        items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        payment_method: paymentMethod,
        discount_amount: discountAmount,
        tax_rate: taxRate
      };

      const transaction = await trpc.createSale.mutate(saleData);
      setLastTransaction(transaction);
      setShowReceipt(true);
      
      // Clear cart after successful sale
      setCartItems([]);
      setDiscount(0);
      setBarcodeInput('');
      setSearchTerm('');
      
      // Reload products to update stock
      await loadProducts();
    } catch (error) {
      console.error('Sale processing failed:', error);
      alert('Failed to process sale. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [cartItems, paymentMethod, discountAmount, taxRate, loadProducts]);

  // Generate and download receipt PDF (simplified)
  const downloadReceipt = useCallback(async () => {
    if (!lastTransaction) return;
    
    try {
      const receipt = await trpc.generateReceipt.query({ 
        transaction_id: lastTransaction.id 
      });
      
      // In a real app, this would generate and download a PDF
      // For demo, we'll create a simple text receipt
      const receiptText = `
RECEIPT - ${receipt.transaction.receipt_number}
Date: ${new Date().toLocaleDateString()}
Cashier: ${currentUser.username}

${cartItems.map(item => 
  `${item.product.name} x${item.quantity} - $${item.total_price.toFixed(2)}`
).join('\n')}

Subtotal: $${subtotal.toFixed(2)}
Tax: $${taxAmount.toFixed(2)}
Discount: -$${discountAmount.toFixed(2)}
Total: $${total.toFixed(2)}

Payment Method: ${paymentMethod.toUpperCase()}
      `;
      
      // Create and download as text file (in real app would be PDF)
      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${lastTransaction.receipt_number}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate receipt:', error);
      alert('Failed to generate receipt');
    }
  }, [lastTransaction, cartItems, subtotal, taxAmount, discountAmount, total, paymentMethod, currentUser.username]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Search & Selection */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🛒 Product Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Barcode Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or enter barcode"
                  value={barcodeInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      handleBarcodeSearch(barcodeInput);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => handleBarcodeSearch(barcodeInput)}
                  disabled={!barcodeInput.trim()}
                >
                  Search
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={isCameraOpen ? stopCamera : startCamera}
                >
                  📷
                </Button>
              </div>
            </div>

            {/* Camera View for Barcode Scanning */}
            {isCameraOpen && (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full max-w-md mx-auto rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-32 border-2 border-red-500 border-dashed rounded"></div>
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">
                  Position barcode within the frame. In a real app, this would use a barcode scanner library.
                </p>
              </div>
            )}

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {filteredProducts.length === 0 && searchTerm && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No products found matching "{searchTerm}"
                </div>
              )}
              {filteredProducts.map((product: Product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm">{product.name}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-green-600">
                          ${product.selling_price.toFixed(2)}
                        </span>
                        <Badge variant={product.stock_quantity > product.min_stock_level ? 'default' : 'destructive'}>
                          Stock: {product.stock_quantity}
                        </Badge>
                      </div>
                      {product.barcode && (
                        <p className="text-xs text-gray-500">Barcode: {product.barcode}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shopping Cart & Checkout */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              🛍️ Cart ({cartItems.length})
              {cartItems.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCartItems([])}
                >
                  Clear
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cartItems.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Cart is empty</p>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item: SaleItem) => (
                  <div key={item.product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">${item.unit_price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                      <span className="text-sm font-bold w-16 text-right">
                        ${item.total_price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checkout */}
        {cartItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>💳 Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium mb-2 block">Payment Method</label>
                <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="card">💳 Card</SelectItem>
                    <SelectItem value="mobile_money">📱 Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discount */}
              <div>
                <label className="text-sm font-medium mb-2 block">Discount (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={discount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setDiscount(parseFloat(e.target.value) || 0)
                  }
                />
              </div>

              {/* Order Summary */}
              <div className="space-y-2">
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax ({(taxRate * 100).toFixed(0)}%):</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={processSale}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : `Complete Sale - $${total.toFixed(2)}`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🧾 Sale Complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Sale processed successfully! Receipt number: {lastTransaction?.receipt_number}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={downloadReceipt} className="flex-1">
                📄 Download Receipt
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.print()} 
                className="flex-1"
              >
                🖨️ Print
              </Button>
            </div>
            
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => setShowReceipt(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
