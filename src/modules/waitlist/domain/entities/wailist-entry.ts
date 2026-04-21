export interface WaitlistEntry {
  id: string;
  email: string;
  source: string | null;
  status: WaitlistStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const WAITLIST_STATUSES = [
  'PENDING',
  'INVITED',
  'REJECTED',
  'CONVERTED',
] as const;

export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];
