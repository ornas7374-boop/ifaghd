import { ForbiddenError } from '../utils/errors.js';

/**
 * Capabilities a session may exercise. Tools declare what they need; the
 * session grants what the caller actually is. A conversation with a customer
 * gets read-only, own-data capabilities and nothing else.
 */
export type Capability =
  | 'customer:read_self'
  | 'order:read_self'
  | 'order:read_any'
  | 'product:read'
  | 'kb:read'
  | 'ticket:create'
  | 'handoff:create'
  | 'customer:write'
  | 'order:write';

export interface Principal {
  kind: 'customer_conversation' | 'staff' | 'system';
  tenantId: string;
  /** Present for customer conversations; scopes every data read. */
  customerId?: string | null;
  staffId?: string | null;
  capabilities: Set<Capability>;
}

/**
 * The capability set an agent turn runs with. Note what is absent: no
 * order:write, no customer:write, no order:read_any. The agent physically
 * cannot mutate commerce data or read another customer, whatever it is told.
 */
export const CUSTOMER_CONVERSATION_CAPABILITIES: Capability[] = [
  'customer:read_self',
  'order:read_self',
  'product:read',
  'kb:read',
  'ticket:create',
  'handoff:create',
];

export function customerPrincipal(tenantId: string, customerId: string): Principal {
  return {
    kind: 'customer_conversation',
    tenantId,
    customerId,
    capabilities: new Set(CUSTOMER_CONVERSATION_CAPABILITIES),
  };
}

export function staffPrincipal(tenantId: string, staffId: string, capabilities: Capability[]): Principal {
  return { kind: 'staff', tenantId, staffId, capabilities: new Set(capabilities) };
}

export function requireCapability(principal: Principal, capability: Capability): void {
  if (!principal.capabilities.has(capability)) {
    throw new ForbiddenError(`missing capability: ${capability}`, { capability, principal: principal.kind });
  }
}

export function hasCapability(principal: Principal, capability: Capability): boolean {
  return principal.capabilities.has(capability);
}

/**
 * Hard tenant check. Called on every row a tool is about to return, so a
 * mis-scoped query becomes an error instead of a data leak.
 */
export function assertSameTenant(principal: Principal, row: { tenant_id: string } | null | undefined, what = 'record'): void {
  if (row && row.tenant_id !== principal.tenantId) {
    throw new ForbiddenError(`cross-tenant access blocked on ${what}`, { what });
  }
}
