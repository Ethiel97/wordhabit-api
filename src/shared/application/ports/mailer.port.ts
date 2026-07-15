export const MAILER = Symbol('MAILER');

export interface MailTemplateRef {
  id: string;
  variables?: Record<string, string | number>;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /**
   * Provider-hosted template. Mailers that support templates send it
   * instead of the inline subject/text/html, which remain as fallback.
   */
  template?: MailTemplateRef;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
