import { WaitlistEntry } from '../entities/wailist-entry';

export const WAITLIST_REPOSITORY = 'WAITLIST_REPOSITORY';

export interface WaitlistRepository {
  count(): Promise<number>;
  findAll(): Promise<WaitlistEntry[]>;
  findByEmail(email: string): Promise<WaitlistEntry | null>;
  create(params: { email: string; source?: string }): Promise<WaitlistEntry>;
}
