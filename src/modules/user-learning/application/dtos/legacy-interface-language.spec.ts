import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { CreateUserLearningProfileRequestDto } from './create-user-learning-profile.request.dto';
import { UpdateUserLearningProfileDto } from './update-user-learning-profile.dto';
import { withLegacyInterfaceLanguage } from './legacy-interface-language';

// The options main.ts installs globally: the alias has to survive
// exactly this pipe, `forbidNonWhitelisted` included.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const create = (body: Record<string, unknown>) =>
  pipe.transform(body, {
    type: 'body',
    metatype: CreateUserLearningProfileRequestDto,
  }) as Promise<CreateUserLearningProfileRequestDto>;

const update = (body: Record<string, unknown>) =>
  pipe.transform(body, {
    type: 'body',
    metatype: UpdateUserLearningProfileDto,
  }) as Promise<UpdateUserLearningProfileDto>;

const base = { targetLanguage: LanguageCode.EN, themeSlugs: ['science-space'] };

describe('explanationLanguage on the wire', () => {
  it('reads the new name', async () => {
    const dto = await create({ ...base, explanationLanguage: 'FR' });
    expect(dto.explanationLanguage).toBe(LanguageCode.FR);
  });

  it('still accepts the old name from installed versions', async () => {
    const dto = await create({ ...base, interfaceLanguage: 'DE' });
    expect(dto.explanationLanguage).toBe(LanguageCode.DE);
  });

  it('prefers the new name when a client sends both', async () => {
    const dto = await create({
      ...base,
      explanationLanguage: 'ES',
      interfaceLanguage: 'FR',
    });
    expect(dto.explanationLanguage).toBe(LanguageCode.ES);
  });

  it('still requires one of them to create a profile', async () => {
    await expect(create(base)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown language under either name', async () => {
    await expect(
      create({ ...base, interfaceLanguage: 'XX' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('leaves the language alone on a patch that does not touch it', async () => {
    const dto = await update({ themeSlugs: ['art-creativity'] });
    expect(dto.explanationLanguage).toBeUndefined();
  });

  it('maps the old name on a patch too', async () => {
    const dto = await update({ interfaceLanguage: 'FR' });
    expect(dto.explanationLanguage).toBe(LanguageCode.FR);
  });
});

describe('withLegacyInterfaceLanguage', () => {
  it('echoes the old name on one profile and on a list', () => {
    const profile = { id: 'p1', explanationLanguage: 'FR' };
    expect(withLegacyInterfaceLanguage(profile)).toEqual({
      id: 'p1',
      explanationLanguage: 'FR',
      interfaceLanguage: 'FR',
    });
    expect(withLegacyInterfaceLanguage([profile])).toEqual([
      { id: 'p1', explanationLanguage: 'FR', interfaceLanguage: 'FR' },
    ]);
  });

  it('passes through results that carry no profile', () => {
    expect(withLegacyInterfaceLanguage({ success: true })).toEqual({
      success: true,
    });
  });
});
