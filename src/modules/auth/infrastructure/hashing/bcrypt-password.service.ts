import { PasswordService } from '../../domain/services/password-service';
import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BcryptPasswordService implements PasswordService {
  private static readonly SALT_ROUNDS = 12;
  verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BcryptPasswordService.SALT_ROUNDS);
  }
}
