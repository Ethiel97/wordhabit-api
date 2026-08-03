import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  IssuedRefreshToken,
  RefreshTokenService,
} from '../../domain/services/refresh-token-service';

/** How long a session survives without the user signing in again. */
const REFRESH_TOKEN_TTL_DAYS = 60;

const TOKEN_BYTES = 32;

@Injectable()
export class Sha256RefreshTokenService implements RefreshTokenService {
  issue(): IssuedRefreshToken {
    // base64url so the value survives a header, a JSON body and a URL
    // untouched — no escaping anywhere to get wrong.
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + REFRESH_TOKEN_TTL_DAYS);

    return { token, tokenHash: this.hash(token), expiresAt };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
