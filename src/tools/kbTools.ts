import { z } from 'zod';
import { searchKnowledgeBase } from '../db/repositories/knowledge.js';
import { requireCapability } from '../security/authz.js';
import type { KbCategory } from '../db/types.js';
import type { ToolDefinition } from './types.js';

const CATEGORIES = [
  'products', 'pricing', 'payment', 'shipping', 'returns',
  'exchange', 'faq', 'policy', 'contact', 'general',
] as const;

const SearchKbInput = z.object({
  query: z.string().trim().min(1).max(300).describe('What the customer is asking about, in their own words.'),
  category: z.enum(CATEGORIES).optional().describe('Narrow the search when you already know the topic.'),
  limit: z.number().int().min(1).max(6).optional(),
});

const SearchKbOutput = z.object({
  count: z.number(),
  results: z.array(z.object({
    id: z.string(),
    category: z.string(),
    title: z.string(),
    question: z.string().nullable(),
    answer: z.string(),
    score: z.number(),
  })),
  note: z.string().optional(),
});

/**
 * search_knowledge_base — the grounding source for policy questions.
 * Entries are rows staff edit; the agent never has policy text baked in.
 */
export const searchKnowledgeBaseTool: ToolDefinition<z.infer<typeof SearchKbInput>, z.infer<typeof SearchKbOutput>> = {
  name: 'search_knowledge_base',
  description:
    'Search the store\'s official knowledge base (shipping, returns, exchange, payment methods, policies, ' +
    'contact details, FAQs). This is the ONLY approved source for policy answers. Call it before answering ' +
    'any policy or general question. If it returns nothing relevant, say you will check with a colleague — ' +
    'do not answer from your own knowledge.',
  inputSchema: SearchKbInput,
  outputSchema: SearchKbOutput,
  requiredCapabilities: ['kb:read'],
  sideEffect: 'none',
  async handler(input, ctx) {
    requireCapability(ctx.principal, 'kb:read');
    const hits = await searchKnowledgeBase({
      tenantId: ctx.tenantId,
      q: input.query,
      category: (input.category as KbCategory | undefined) ?? null,
      limit: input.limit ?? 4,
    });

    return {
      ok: true,
      data: {
        count: hits.length,
        results: hits.map((h) => ({
          id: h.id,
          category: h.category,
          title: h.title,
          question: h.question,
          answer: h.answer,
          score: Number(h.score.toFixed(3)),
        })),
        ...(hits.length === 0
          ? { note: 'Nothing in the knowledge base covers this. Do not answer from general knowledge — escalate or say you will check.' }
          : {}),
      },
    };
  },
};
