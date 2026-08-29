/** Row shapes returned by the repositories. Mirrors db/migrations. */

export type ConversationStatus = 'open' | 'handed_off' | 'resolved' | 'closed';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageRole = 'customer' | 'agent' | 'human' | 'system';
export type ContentType =
  | 'text' | 'image' | 'audio' | 'document' | 'video' | 'location' | 'interactive' | 'unsupported';

export type HandoffReason =
  | 'customer_request' | 'angry_customer' | 'sensitive_issue' | 'low_confidence'
  | 'tool_failure' | 'missing_information' | 'repeated_failure' | 'policy_violation' | 'manual';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type KbCategory =
  | 'products' | 'pricing' | 'payment' | 'shipping' | 'returns'
  | 'exchange' | 'faq' | 'policy' | 'contact' | 'general';

export type TicketCategory =
  | 'order_issue' | 'return_request' | 'exchange_request' | 'complaint'
  | 'product_question' | 'shipping_issue' | 'payment_issue' | 'other';

export interface TenantSettings {
  /** Overrides the default Saudi-dialect persona name in replies. */
  brandName?: string;
  supportHours?: string;
  supportPhone?: string;
  supportEmail?: string;
  /** Extra instructions appended to the system prompt (never replaces guardrails). */
  personaNotes?: string;
  /** Intents that always go to a human for this tenant. */
  alwaysEscalateIntents?: string[];
  /** Turn off individual tools per tenant without a deploy. */
  disabledTools?: string[];
  llmModel?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'suspended' | 'trial';
  default_locale: string;
  timezone: string;
  settings: TenantSettings;
  created_at: Date;
  updated_at: Date;
}

export interface ChannelAccount {
  id: string;
  tenant_id: string;
  channel: string;
  external_id: string;
  display_name: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
}

export interface Customer {
  id: string;
  tenant_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  locale: string;
  external_ref: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  is_blocked: boolean;
  first_seen_at: Date;
  last_seen_at: Date;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  customer_id: string;
  channel: string;
  channel_account_id: string | null;
  status: ConversationStatus;
  handled_by: 'agent' | 'human';
  assigned_agent_id: string | null;
  last_intent: string | null;
  summary: string | null;
  summary_message_count: number;
  message_count: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'angry' | null;
  metadata: Record<string, unknown>;
  started_at: Date;
  last_message_at: Date;
}

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  customer_id: string;
  direction: MessageDirection;
  role: MessageRole;
  content: string;
  content_type: ContentType;
  channel_message_id: string | null;
  intent: string | null;
  tool_calls: unknown[];
  sent_at: Date;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  name_en: string | null;
  description: string | null;
  category: string | null;
  brand: string | null;
  price: number;
  sale_price: number | null;
  currency: string;
  stock_quantity: number;
  is_active: boolean;
  attributes: Record<string, unknown>;
}

export interface OrderItem {
  id: string;
  order_id: string;
  sku: string | null;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  total_amount: number;
  currency: string;
  shipping_company: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_address: Record<string, unknown> | null;
  estimated_delivery: Date | null;
  placed_at: Date;
  delivered_at: Date | null;
  items?: OrderItem[];
}

export interface KnowledgeBaseEntry {
  id: string;
  tenant_id: string;
  category: KbCategory;
  title: string;
  question: string | null;
  answer: string;
  keywords: string[];
  locale: string;
  priority: number;
  is_active: boolean;
  version: number;
}

export interface HumanHandoff {
  id: string;
  tenant_id: string;
  conversation_id: string;
  customer_id: string;
  reason_code: HandoffReason;
  reason_detail: string | null;
  priority: Priority;
  status: string;
  conversation_summary: string | null;
  last_customer_message: string | null;
  customer_snapshot: Record<string, unknown>;
  notification_status: string;
  created_at: Date;
}

export interface SupportTicket {
  id: string;
  tenant_id: string;
  customer_id: string;
  conversation_id: string | null;
  order_id: string | null;
  ticket_number: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: Priority;
  status: string;
  created_at: Date;
}
