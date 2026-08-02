export const PUSH_SENDER = Symbol('PUSH_SENDER');

export type PushMessage = {
  tokens: string[];
  title: string;
  body: string;
  /** FCM carries strings only; anything else must be stringified. */
  data?: Record<string, string>;
  /**
   * Android 8+ drops a notification whose channel does not exist. The
   * ids are the ones the app creates in MainActivity.
   */
  androidChannelId?: string;
};

export type PushSendResult = {
  sent: number;
  /**
   * Tokens the platform reported as gone — uninstalled or replaced.
   * Only those: deleting devices over a quota or availability error
   * would lose reachable users permanently.
   */
  invalidTokens: string[];
};

export interface PushSender {
  send(messages: PushMessage[]): Promise<PushSendResult>;
}
