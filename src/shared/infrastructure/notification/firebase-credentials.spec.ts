import {
  assertProjectMatches,
  readServiceAccount,
  FirebaseServiceAccount,
} from './firebase-credentials';

const account: FirebaseServiceAccount = {
  project_id: 'wordhabit-prod',
  client_email: 'firebase-adminsdk@wordhabit-prod.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
};

describe('readServiceAccount', () => {
  it('reads raw JSON', () => {
    expect(readServiceAccount({ inline: JSON.stringify(account) })).toEqual(
      account,
    );
  });

  it('reads base64, which is how a secret survives newlines', () => {
    // A private key is mostly newlines, and `fly secrets set` does not
    // keep them.
    const encoded = Buffer.from(JSON.stringify(account)).toString('base64');
    expect(readServiceAccount({ inline: encoded })).toEqual(account);
  });

  it('rejects an incomplete account instead of failing at send time', () => {
    expect(() =>
      readServiceAccount({ inline: JSON.stringify({ project_id: 'x' }) }),
    ).toThrow(/missing required fields/);
  });

  it('says which variable to set when neither source is given', () => {
    expect(() => readServiceAccount({})).toThrow(/FIREBASE_SERVICE_ACCOUNT/);
  });
});

describe('assertProjectMatches', () => {
  it('accepts credentials for the configured project', () => {
    expect(() => assertProjectMatches(account, 'wordhabit-prod')).not.toThrow();
  });

  it('refuses credentials for another project', () => {
    // The whole point: production left on the development service
    // account pushes into a project where no device is registered, and
    // every send reports success.
    expect(() => assertProjectMatches(account, 'wordhabit-dev')).toThrow(
      /'wordhabit-prod'.*'wordhabit-dev'/,
    );
  });
});
