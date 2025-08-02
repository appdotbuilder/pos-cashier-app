
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['cashier', 'manager']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Product schemas
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  barcode: z.string().nullable(),
  cost_price: z.number(),
  selling_price: z.number(),
  stock_quantity: z.number().int(),
  min_stock_level: z.number().int(),
  category: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  cost_price: z.number().positive(),
  selling_price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  min_stock_level: z.number().int().nonnegative().default(0),
  category: z.string().nullable().optional()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  cost_price: z.number().positive().optional(),
  selling_price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  min_stock_level: z.number().int().nonnegative().optional(),
  category: z.string().nullable().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

export const barcodeSearchInputSchema = z.object({
  barcode: z.string()
});

export type BarcodeSearchInput = z.infer<typeof barcodeSearchInputSchema>;

// Transaction and sale schemas
export const transactionStatusSchema = z.enum(['pending', 'completed', 'cancelled', 'refunded']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

export const paymentMethodSchema = z.enum(['cash', 'card', 'mobile_money', 'bank_transfer']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  total_amount: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  payment_method: paymentMethodSchema,
  status: transactionStatusSchema,
  receipt_number: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

export const saleItemInputSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive()
});

export type SaleItemInput = z.infer<typeof saleItemInputSchema>;

export const createSaleInputSchema = z.object({
  items: z.array(saleItemInputSchema).min(1),
  payment_method: paymentMethodSchema,
  discount_amount: z.number().nonnegative().default(0),
  tax_rate: z.number().nonnegative().default(0)
});

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;

// Stock adjustment schemas
export const stockAdjustmentTypeSchema = z.enum(['increase', 'decrease', 'recount']);
export type StockAdjustmentType = z.infer<typeof stockAdjustmentTypeSchema>;

export const stockAdjustmentSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  user_id: z.number(),
  adjustment_type: stockAdjustmentTypeSchema,
  quantity_change: z.number().int(),
  reason: z.string(),
  created_at: z.coerce.date()
});

export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

export const createStockAdjustmentInputSchema = z.object({
  product_id: z.number(),
  adjustment_type: stockAdjustmentTypeSchema,
  quantity_change: z.number().int(),
  reason: z.string().min(1).max(500)
});

export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentInputSchema>;

// Report schemas
export const dateRangeInputSchema = z.object({
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid start date"
  }),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid end date"
  })
});

export type DateRangeInput = z.infer<typeof dateRangeInputSchema>;

export const salesReportSchema = z.object({
  total_sales: z.number(),
  total_transactions: z.number(),
  average_transaction_value: z.number(),
  total_profit: z.number(),
  top_selling_products: z.array(z.object({
    product_id: z.number(),
    product_name: z.string(),
    quantity_sold: z.number(),
    revenue: z.number()
  })),
  sales_by_payment_method: z.array(z.object({
    payment_method: paymentMethodSchema,
    count: z.number(),
    total_amount: z.number()
  }))
});

export type SalesReport = z.infer<typeof salesReportSchema>;

export const profitLossReportSchema = z.object({
  total_revenue: z.number(),
  total_cost_of_goods_sold: z.number(),
  gross_profit: z.number(),
  gross_profit_margin: z.number(),
  total_transactions: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export type ProfitLossReport = z.infer<typeof profitLossReportSchema>;

// Receipt schema
export const receiptInputSchema = z.object({
  transaction_id: z.number()
});

export type ReceiptInput = z.infer<typeof receiptInputSchema>;

export const receiptSchema = z.object({
  transaction: transactionSchema,
  items: z.array(transactionItemSchema.extend({
    product_name: z.string()
  })),
  business_info: z.object({
    name: z.string(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable()
  })
});

export type Receipt = z.infer<typeof receiptSchema>;
