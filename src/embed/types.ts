export interface BirdBotInitOptions {
  apiUrl: string;
  button: string | HTMLElement;
  getToken: () => string | null | Promise<string | null>;
  getContext: () => Record<string, unknown> | Promise<Record<string, unknown>>;
}

export interface BirdBotInstance {
  open: () => void;
  close: () => void;
  toggle: () => void;
  destroy: () => void;
  /** Re-read getContext() and push to the widget (e.g. after SPA navigation). */
  updateContext: () => void;
}

export interface InitMessage {
  type: 'birdbot:init';
  token: string;
  context: Record<string, unknown>;
}

export interface ContextUpdateMessage {
  type: 'birdbot:context';
  context: Record<string, unknown>;
}

export interface PanelStateMessage {
  type: 'birdbot:panel-state';
  open: boolean;
}

export interface ReadyMessage {
  type: 'birdbot:ready';
}

export interface RequestCloseMessage {
  type: 'birdbot:request-close';
}

export interface UnreadMessage {
  type: 'birdbot:unread';
  hasUnread: boolean;
}

export type WidgetMessage = InitMessage | ContextUpdateMessage | PanelStateMessage;
export type HostInboundMessage = ReadyMessage | RequestCloseMessage | UnreadMessage;
