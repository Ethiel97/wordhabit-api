export interface ApiErrorPayload {
  code: string;
  message: string;
  details: unknown;
}

export class ApiErrorResponse {
  constructor(
    public readonly error: ApiErrorPayload,
    public readonly success: false,
  ) {}

  static of(error: ApiErrorPayload): ApiErrorResponse {
    return new ApiErrorResponse(error, false);
  }
}
