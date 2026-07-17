import { Command } from '@nestjs/cqrs';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

export class CreateUserLearningProfileCommand extends Command<CreateUserLearningProfileResult> {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly interfaceLanguage: LanguageCode,
    public readonly targetLanguage: LanguageCode,
    public readonly themeSlugs: string[],
  ) {
    super();
  }
}

export interface CreateUserLearningProfileResult {
  id: string;
  userId: string;
  isActive: boolean;
  interfaceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  themeSlugs: string[];
  createdAt: Date;
  updatedAt: Date;
}
