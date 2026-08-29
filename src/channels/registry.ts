import { whatsappAdapter } from './whatsapp/adapter.js';
import type { ChannelAdapter } from './core/types.js';

/**
 * Channel registry. Adding Telegram or a web widget means implementing
 * ChannelAdapter and registering it here — nothing in the agent changes.
 */
const ADAPTERS = new Map<string, ChannelAdapter>([[whatsappAdapter.channel, whatsappAdapter]]);

export function getChannelAdapter(channel: string): ChannelAdapter | undefined {
  return ADAPTERS.get(channel);
}

export function registerChannelAdapter(adapter: ChannelAdapter): void {
  ADAPTERS.set(adapter.channel, adapter);
}

export function listChannels(): string[] {
  return [...ADAPTERS.keys()];
}

export * from './core/types.js';
