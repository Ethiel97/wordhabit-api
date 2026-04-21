type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'HTTP_ERROR'
  | 'INTERNAL_SERVER_ERROR';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiErrorResponse } from './api-error-response';

import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message = 'An unexpected error occurred.';
      let cause: unknown;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObject = exceptionResponse as Record<string, unknown>;

        if (typeof responseObject.message === 'string') {
          message = responseObject.message;
        } else if (Array.isArray(responseObject.message)) {
          message = 'Validation failed.';
          cause = responseObject.message; // only validation errors, not full payload
        }
      }

      response.status(status).json(
        ApiErrorResponse.of({
          code: this.mapHttpStatusToCode(status),
          message,
          details: {
            path: request.url,
            ...(cause !== undefined ? { cause } : {}),
          },
        }),
      );

      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      ApiErrorResponse.of({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred.',
        details: {
          path: request.url,
        },
      }),
    );
  }

  private mapHttpStatusToCode(status: HttpStatus): ApiErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'HTTP_ERROR';
    }
  }
}
