export const PASSWORD_SERVICE = Symbol('PASSWORD_SERVICE');

export interface PasswordService {
  hash(password: string): Promise<string>;

  verify(password: string, passwordHash: string): Promise<boolean>;
}
