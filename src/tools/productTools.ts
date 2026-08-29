import { z } from 'zod';
import { getProductBySku, searchProducts } from '../db/repositories/commerce.js';
import { requireCapability } from '../security/authz.js';
import type { ToolDefinition } from './types.js';

const SearchProductsInput = z.object({
  query: z.string().trim().min(1).max(100).describe('Product name or keywords, in the customer\'s own words.'),
  category: z.string().trim().max(60).optional().describe('Optional category filter.'),
  in_stock_only: z.boolean().optional().describe('Only return items currently in stock.'),
  limit: z.number().int().min(1).max(10).optional(),
});

const ProductShape = z.object({
  sku: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  brand: z.string().nullable(),
  price: z.number(),
  sale_price: z.number().nullable(),
  effective_price: z.number(),
  currency: z.string(),
  in_stock: z.boolean(),
  stock_quantity: z.number(),
  description: z.string().nullable(),
});

const SearchProductsOutput = z.object({
  count: z.number(),
  results: z.array(ProductShape),
  note: z.string().optional(),
});

export const searchProductsTool: ToolDefinition<z.infer<typeof SearchProductsInput>, z.infer<typeof SearchProductsOutput>> = {
  name: 'search_products',
  description:
    'Search the store catalogue for products by name or keywords. Returns real prices and stock levels. ' +
    'Use this for any question about what the store sells, availability, or price. If it returns zero ' +
    'results, say you could not find the product — do NOT guess a price or claim an item exists.',
  inputSchema: SearchProductsInput,
  outputSchema: SearchProductsOutput,
  requiredCapabilities: ['product:read'],
  sideEffect: 'none',
  async handler(input, ctx) {
    requireCapability(ctx.principal, 'product:read');
    const rows = await searchProducts({
      tenantId: ctx.tenantId,
      q: input.query,
      category: input.category ?? null,
      limit: input.limit ?? 5,
      inStockOnly: input.in_stock_only ?? false,
    });

    return {
      ok: true,
      data: {
        count: rows.length,
        results: rows.map(toProductShape),
        ...(rows.length === 0
          ? { note: 'No matching product in the catalogue. Do not invent one; offer to check with a colleague.' }
          : {}),
      },
    };
  },
};

const GetPriceInput = z.object({
  sku: z.string().trim().min(1).max(64).optional().describe('Exact SKU if you already know it.'),
  product_name: z.string().trim().min(1).max(100).optional().describe('Product name if you do not have the SKU.'),
}).refine((v) => Boolean(v.sku || v.product_name), { message: 'Provide either sku or product_name.' });

const GetPriceOutput = z.object({
  found: z.boolean(),
  exact_match: z.boolean().optional(),
  product: ProductShape.optional(),
  candidates: z.array(z.object({ sku: z.string(), name: z.string() })).optional(),
  note: z.string().optional(),
});

/**
 * get_product_price — separate from search on purpose. When several products
 * match loosely, it refuses to pick one and returns candidates instead, so the
 * agent asks which item rather than quoting a price for the wrong thing.
 */
export const getProductPriceTool: ToolDefinition<z.infer<typeof GetPriceInput>, z.infer<typeof GetPriceOutput>> = {
  name: 'get_product_price',
  description:
    'Get the authoritative current price of one product. Prefer this over search_products when the customer ' +
    'asks "how much is X". If several products match it returns candidates instead of a price — in that case ' +
    'ask the customer which one they mean. NEVER state a price that did not come from this tool.',
  inputSchema: GetPriceInput,
  outputSchema: GetPriceOutput,
  requiredCapabilities: ['product:read'],
  sideEffect: 'none',
  async handler(input, ctx) {
    requireCapability(ctx.principal, 'product:read');

    if (input.sku) {
      const product = await getProductBySku(ctx.tenantId, input.sku);
      if (product) return { ok: true, data: { found: true, exact_match: true, product: toProductShape(product) } };
    }

    const term = input.product_name ?? input.sku!;
    const matches = await searchProducts({ tenantId: ctx.tenantId, q: term, limit: 5 });

    if (matches.length === 0) {
      return {
        ok: true,
        data: { found: false, note: 'Product not found in the catalogue. Do not quote any price.' },
      };
    }

    const best = matches[0]!;
    // One clearly dominant match, or a strong single hit → safe to quote.
    const second = matches[1];
    const dominant = !second || best.score - second.score > 0.2;
    if (dominant && best.score >= 0.45) {
      return { ok: true, data: { found: true, exact_match: best.score >= 0.9, product: toProductShape(best) } };
    }

    return {
      ok: true,
      data: {
        found: false,
        candidates: matches.map((m) => ({ sku: m.sku, name: m.name })),
        note: 'Several products match. Ask the customer which one they mean before quoting a price.',
      },
    };
  },
};

function toProductShape(p: {
  sku: string; name: string; category: string | null; brand: string | null;
  price: number; sale_price: number | null; currency: string; stock_quantity: number; description: string | null;
}): z.infer<typeof ProductShape> {
  const price = Number(p.price);
  const sale = p.sale_price === null ? null : Number(p.sale_price);
  return {
    sku: p.sku,
    name: p.name,
    category: p.category,
    brand: p.brand,
    price,
    sale_price: sale,
    effective_price: sale ?? price,
    currency: p.currency,
    in_stock: p.stock_quantity > 0,
    stock_quantity: p.stock_quantity,
    description: p.description,
  };
}
