export class ApiSuccessResponse<T> {
  constructor(
    public readonly data: T,
    public readonly success: true,
  ) {}

  static of<T>(data: T): ApiSuccessResponse<T> {
    return new ApiSuccessResponse(data, true);
  }
}
