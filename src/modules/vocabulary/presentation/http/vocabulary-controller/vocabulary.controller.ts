import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateVocabularyWordCommand } from '../../../application/commands/create-vocabulary-word.command';
import { CreateVocabularyWordRequestDto } from '../../../application/dto/create-vocabulary-word.request.dto';
import { ApiSuccessResponse } from '../../../../waitlist/presentation/http/api-success-response';

@Controller('vocabulary/words')
export class VocabularyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: CommandBus,
  ) {}

  @Post()
  async createWord(@Body() body: CreateVocabularyWordRequestDto) {
    const result = await this.commandBus.execute(
      new CreateVocabularyWordCommand(
        body.term,
        body.targetLanguage,
        body.difficulty,
        body.partOfSpeech,
        body.definitions,
        body.examples ?? [],
        body.pronunciations ?? [],
        body.synonyms ?? [],
      ),
    );

    return ApiSuccessResponse.of(result);
  }
}
