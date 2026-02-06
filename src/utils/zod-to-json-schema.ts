import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';

/**
 * Minimal Zod-to-JSON-Schema converter for MCP tool input schemas.
 * Handles the subset of Zod types we use (string, number, enum, object, optional).
 */
export function zodToJsonSchema(schema: ZodObject<ZodRawShape>): Record<string, unknown> {
  const shape = schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as ZodTypeAny;
    const { jsonSchema, isOptional } = convertZodType(zodType);
    properties[key] = jsonSchema;
    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function convertZodType(zodType: ZodTypeAny): { jsonSchema: Record<string, unknown>; isOptional: boolean } {
  const def = zodType._def;
  let isOptional = false;

  // Unwrap optional
  if (def.typeName === 'ZodOptional') {
    const inner = convertZodType(def.innerType);
    return { jsonSchema: inner.jsonSchema, isOptional: true };
  }

  // Unwrap default
  if (def.typeName === 'ZodDefault') {
    const inner = convertZodType(def.innerType);
    return { jsonSchema: { ...inner.jsonSchema, default: def.defaultValue() }, isOptional: true };
  }

  // Get description if present
  const description = zodType.description;
  const base: Record<string, unknown> = {};
  if (description) base.description = description;

  switch (def.typeName) {
    case 'ZodString':
      return { jsonSchema: { type: 'string', ...base }, isOptional };

    case 'ZodNumber':
      return { jsonSchema: { type: 'number', ...base }, isOptional };

    case 'ZodEnum':
      return { jsonSchema: { type: 'string', enum: def.values, ...base }, isOptional };

    case 'ZodObject': {
      const nested = zodToJsonSchema(zodType as ZodObject<ZodRawShape>);
      return { jsonSchema: { ...nested, ...base }, isOptional };
    }

    default:
      return { jsonSchema: { type: 'string', ...base }, isOptional };
  }
}
