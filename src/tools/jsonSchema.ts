import { z } from 'zod';

/**
 * Minimal Zod → JSON Schema converter covering the shapes our tool inputs use.
 * Written by hand rather than pulled in as a dependency so the emitted schema
 * is exactly what the providers accept (no $ref, no unsupported keywords).
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const out = convert(schema);
  if (out.type !== 'object') {
    // Providers require a top-level object schema for tool inputs.
    return { type: 'object', properties: { value: out }, required: ['value'], additionalProperties: false };
  }
  return out;
}

function convert(schema: z.ZodTypeAny): Record<string, unknown> {
  const def = schema._def as { typeName: string; [k: string]: unknown };
  const description = schema.description;
  const withDesc = (obj: Record<string, unknown>) => (description ? { ...obj, description } : obj);

  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodString: {
      const checks = (def.checks ?? []) as Array<{ kind: string; value?: number; regex?: RegExp }>;
      const node: Record<string, unknown> = { type: 'string' };
      for (const c of checks) {
        if (c.kind === 'min') node.minLength = c.value;
        if (c.kind === 'max') node.maxLength = c.value;
        if (c.kind === 'regex' && c.regex) node.pattern = c.regex.source;
      }
      return withDesc(node);
    }
    case z.ZodFirstPartyTypeKind.ZodNumber: {
      const checks = (def.checks ?? []) as Array<{ kind: string; value?: number }>;
      const node: Record<string, unknown> = { type: 'number' };
      for (const c of checks) {
        if (c.kind === 'int') node.type = 'integer';
        if (c.kind === 'min') node.minimum = c.value;
        if (c.kind === 'max') node.maximum = c.value;
      }
      return withDesc(node);
    }
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return withDesc({ type: 'boolean' });
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return withDesc({ type: 'string', enum: def.values as string[] });
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return withDesc({ const: def.value });
    case z.ZodFirstPartyTypeKind.ZodArray:
      return withDesc({ type: 'array', items: convert(def.type as z.ZodTypeAny) });
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = (def.shape as () => z.ZodRawShape)();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        const field = value as z.ZodTypeAny;
        properties[key] = convert(field);
        if (!field.isOptional()) required.push(key);
      }
      return withDesc({
        type: 'object',
        properties,
        ...(required.length ? { required } : {}),
        additionalProperties: false,
      });
    }
    case z.ZodFirstPartyTypeKind.ZodOptional:
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return { ...convert(def.innerType as z.ZodTypeAny), ...(description ? { description } : {}) };
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return { ...convert(def.innerType as z.ZodTypeAny), ...(description ? { description } : {}) };
    case z.ZodFirstPartyTypeKind.ZodUnion: {
      const options = (def.options as z.ZodTypeAny[]).map(convert);
      return withDesc({ anyOf: options });
    }
    case z.ZodFirstPartyTypeKind.ZodRecord:
      return withDesc({ type: 'object', additionalProperties: true });
    case z.ZodFirstPartyTypeKind.ZodAny:
    case z.ZodFirstPartyTypeKind.ZodUnknown:
      return withDesc({});
    default:
      return withDesc({});
  }
}
