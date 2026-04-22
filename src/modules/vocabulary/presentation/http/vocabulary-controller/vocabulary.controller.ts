import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateVocabularyWordCommand } from '../../../application/commands/create-vocabulary-word.command';
import { CreateVocabularyWordRequestDto } from '../../../application/dto/create-vocabulary-word.request.dto';
import { ApiSuccessResponse } from '../../../../waitlist/presentation/http/api-success-response';
import { GetVocabularyWordByIdQuery } from '../../../application/queries/get-vocabulary-word-by-id.query';
import { GetVocabularyWordByTermQuery } from '../../../application/queries/get-vocabulary-word-by-term.query';
import { LanguageCode } from '../../../domain/entities/language-code';
import { ListVocabularyWordsQuery } from '../../../application/queries/list-vocabulary-words.query';
import { ListVocabularyWordsRequestDto } from '../../../application/dto/list-vocabulary-words.request.dto';

@Controller('vocabulary/words')
export class VocabularyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
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

  @Get(':id')
  async getWordById(@Param('id') id: string) {
    const result = await this.queryBus.execute(
      new GetVocabularyWordByIdQuery(id),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get('by-term/search')
  async getWordByTerm(
    @Query('term') term: string,
    @Query('targetLanguage') targetLanguage: LanguageCode,
  ) {
    const result = await this.queryBus.execute(
      new GetVocabularyWordByTermQuery(term, targetLanguage),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get()
  async listWords(@Query() query: ListVocabularyWordsRequestDto) {
    const result = await this.queryBus.execute(
      new ListVocabularyWordsQuery(
        query.page ?? 1,
        query.pageSize ?? 10,
        query.targetLanguage,
        query.difficulty,
        query.partOfSpeech,
        query.status,
        query.search,
      ),
    );

    return ApiSuccessResponse.of(result);
  }
}
