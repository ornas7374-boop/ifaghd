export type LeadStatus =
  | "LEAD"
  | "QUALIFIED"
  | "CONTACTED"
  | "REPLIED"
  | "INTERESTED"
  | "DEMO"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type LeadTemperature = "HOT" | "WARM" | "COLD" | "NOT_FIT";

export interface Lead {
  id: number;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  business_type: string | null;
  source: string;
  score: number;
  temperature: LeadTemperature;
  status: LeadStatus;
  needs_human: boolean;
  automation_paused: boolean;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number | null;
  lead_id: number;
  direction: "OUTBOUND" | "INBOUND";
  channel: string;
  body: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SENT" | "FAILED" | "RECEIVED";
  classification: string | null;
  recommended_action: string | null;
  ai_generated: boolean;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Activity {
  id: number;
  lead_id: number;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Followup {
  id: number;
  lead_id: number;
  sequence_step: number;
  scheduled_at: string;
  status: "PENDING" | "SENT" | "CANCELLED" | "SKIPPED";
  created_at: string;
}

export interface Appointment {
  id: number;
  lead_id: number;
  type: string;
  scheduled_at: string | null;
  status: "BOOKED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  demo_link: string | null;
  notes: string | null;
  created_at: string;
}

export const PIPELINE_STATUSES: LeadStatus[] = [
  "LEAD",
  "QUALIFIED",
  "CONTACTED",
  "REPLIED",
  "INTERESTED",
  "DEMO",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];
