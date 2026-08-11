import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const JWT_KEY = "jwt";
export const JwtAccessToken = createParamDecorator((_:unknown, ctx:ExecutionContext) =>{
        const request = ctx.switchToHttp().getRequest()
        return request['token']
    }
)

