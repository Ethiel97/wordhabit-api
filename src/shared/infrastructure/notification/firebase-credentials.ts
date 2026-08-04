import { readFileSync } from 'node:fs';

export type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

/**
 * The service account, from wherever this environment keeps it: a path
 * locally, the JSON itself in a secret on Fly, which has no filesystem
 * to put a file on.
 *
 * [inline] accepts raw JSON or base64, because `fly secrets set` mangles
 * the newlines a private key is made of.
 */
export function readServiceAccount(params: {
  inline?: string;
  path?: string;
}): FirebaseServiceAccount {
  const raw = params.inline?.trim()
    ? decode(params.inline.trim())
    : readFileSync(requirePath(params.path), 'utf8');

  const account = JSON.parse(raw) as Partial<FirebaseServiceAccount>;

  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error('Firebase service account is missing required fields');
  }

  return account as FirebaseServiceAccount;
}

/**
 * Refuses a service account belonging to another project. The failure is
 * silent otherwise: production pushing with dev credentials reaches a
 * project where nobody has a device, and every send succeeds.
 */
export function assertProjectMatches(
  account: FirebaseServiceAccount,
  expectedProjectId: string,
): void {
  if (account.project_id !== expectedProjectId) {
    throw new Error(
      `Firebase credentials are for project '${account.project_id}' ` +
        `but FIREBASE_PROJECT_ID is '${expectedProjectId}'`,
    );
  }
}

function decode(value: string): string {
  return value.startsWith('{')
    ? value
    : Buffer.from(value, 'base64').toString('utf8');
}

function requirePath(path?: string): string {
  if (!path?.trim()) {
    throw new Error(
      'Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS',
    );
  }
  return path.trim();
}
