export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export interface TokenService {
  signAccessToken(payload: AccessTokenPayload): Promise<string>;

  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
}
