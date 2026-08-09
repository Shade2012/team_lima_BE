import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message:any = 'Internal server error';

    if (exception instanceof HttpException){
      status = exception.getStatus();
      const response = exception.getResponse()
      if(typeof response === 'object' && response != null && "message" in response){
        message = response['message'] as string
      } else {
        message = exception.message;
      }
    }
    response.status(status).send({
      status_code: status,
      message : message,
    });
  }
}
