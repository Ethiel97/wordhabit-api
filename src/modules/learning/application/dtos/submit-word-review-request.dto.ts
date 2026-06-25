import { IsBoolean } from 'class-validator';

export class SubmitWordReviewRequestDto {
  @IsBoolean()
  correct!: boolean;
}
