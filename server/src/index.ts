
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  barcodeSearchInputSchema,
  createSaleInputSchema,
  receiptInputSchema,
  createStockAdjustmentInputSchema,
  dateRangeInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { updateProduct } from './handlers/update_product';
import { getProductByBarcode } from './handlers/get_product_by_barcode';
import { createSale } from './handlers/create_sale';
import { generateReceipt } from './handlers/generate_receipt';
import { createStockAdjustment } from './handlers/create_stock_adjustment';
import { getStockAdjustments } from './handlers/get_stock_adjustments';
import { getLowStockProducts } from './handlers/get_low_stock_products';
import { getSalesReport } from './handlers/get_sales_report';
import { getProfitLossReport } from './handlers/get_profit_loss_report';
import { getTransactions } from './handlers/get_transactions';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Product management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),

  getProducts: publicProcedure
    .query(() => getProducts()),

  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),

  getProductByBarcode: publicProcedure
    .input(barcodeSearchInputSchema)
    .query(({ input }) => getProductByBarcode(input)),

  // Sales and transactions
  createSale: publicProcedure
    .input(createSaleInputSchema)
    .mutation(({ input }) => createSale(input, 1)), // TODO: Get userId from context/auth

  generateReceipt: publicProcedure
    .input(receiptInputSchema)
    .query(({ input }) => generateReceipt(input)),

  getTransactions: publicProcedure
    .input(dateRangeInputSchema.optional())
    .query(({ input }) => getTransactions(input)),

  // Stock management
  createStockAdjustment: publicProcedure
    .input(createStockAdjustmentInputSchema)
    .mutation(({ input }) => createStockAdjustment(input, 1)), // TODO: Get userId from context/auth

  getStockAdjustments: publicProcedure
    .input(z.object({ productId: z.number().optional() }))
    .query(({ input }) => getStockAdjustments(input.productId)),

  getLowStockProducts: publicProcedure
    .query(() => getLowStockProducts()),

  // Reports
  getSalesReport: publicProcedure
    .input(dateRangeInputSchema)
    .query(({ input }) => getSalesReport(input)),

  getProfitLossReport: publicProcedure
    .input(dateRangeInputSchema)
    .query(({ input }) => getProfitLossReport(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
