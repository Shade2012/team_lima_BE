import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ValidationError } from 'class-validator';

@Catch() 
export class HttpExceptionFilter<T> implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'message' in res) {
        message = res['message'];
      } else {
        message = exception.message;
      }
    }
    
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT; // 409 Conflict
          const target = (exception.meta?.target as string[])?.join(', ');
          message = target
            ? `Unique constraint failed on field(s): ${target}`
            : 'A record with this unique value already exists';
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND; // 404 Not Found
          const cause = exception.meta?.cause as string;
          message = cause || 'Record to update or delete was not found';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST; 
          message = `Database error: ${exception.message}`;
          break;
        }
      }
    }
    
    if (exception instanceof ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
    }

    this.logger.error(exception);

    response.status(status).json({
      status_code: status,
      message: message,
    });
  }
}