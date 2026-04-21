export interface WaitlistEntryRecord {
  id: string;
  email: string;
  source: string | null;
  status: 'PENDING' | 'INVITED' | 'REJECTED' | 'CONVERTED';
  createdAt: Date;
  updatedAt: Date;
}

export const WAITLIST_REPOSITORY = 'WAITLIST_REPOSITORY';

export interface WaitlistRepository {
  findByEmail(email: string): Promise<WaitlistEntryRecord | null>;
  create(params: {
    email: string;
    source?: string;
  }): Promise<WaitlistEntryRecord>;
}
