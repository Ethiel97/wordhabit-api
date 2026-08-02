import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateVocabularyWordCommand } from '../../../application/commands/create-vocabulary-word.command';
import { CreateVocabularyWordRequestDto } from '../../../application/dto/create-vocabulary-word.request.dto';
import { ApiSuccessResponse } from '../../../../../shared/presentation/http/api-success-response';
import { GetVocabularyWordByIdQuery } from '../../../application/queries/get-vocabulary-word-by-id.query';
import { SearchVocabularyWordsQuery } from '../../../application/queries/search-vocabulary-words.query';
import { ListVocabularyWordsQuery } from '../../../application/queries/list-vocabulary-words.query';
import { ListVocabularyWordsRequestDto } from '../../../application/dto/list-vocabulary-words.request.dto';
import { VOCABULARY } from '../../../../../shared/presentation/http/endpoints';
import { SearchVocabularyWordsRequestDto } from '../../../application/dto/search-vocabulary-words.request.dto';

@Controller(VOCABULARY.BASE)
export class VocabularyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async createWord(@Body() body: CreateVocabularyWordRequestDto) {
    const result = await this.commandBus.execute(
      new CreateVocabularyWordCommand({
        term: body.term,
        targetLanguage: body.targetLanguage,
        difficulty: body.difficulty,
        partOfSpeech: body.partOfSpeech,
        definitions: body.definitions,
        examples: body.examples ?? [],
        pronunciations: body.pronunciations ?? [],
        synonyms: body.synonyms ?? [],
        themeSlugs: body.themeSlugs ?? [],
      }),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(VOCABULARY.SEARCH)
  async searchWords(@Query() query: SearchVocabularyWordsRequestDto) {
    const result = await this.queryBus.execute(
      new SearchVocabularyWordsQuery(
        query.q,
        query.targetLanguage,
        query.theme,
        query.difficulty,
      ),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(VOCABULARY.GET_BY_ID)
  async getWordById(@Param('id') id: string) {
    const result = await this.queryBus.execute(
      new GetVocabularyWordByIdQuery(id),
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
