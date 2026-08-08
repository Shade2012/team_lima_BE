import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Payload } from 'src/utils/payload';
export const PAYLOAD_KEY = "payload";
export const PayloadJWT = createParamDecorator((_:unknown, ctx:ExecutionContext) =>{
        const request = ctx.switchToHttp().getRequest()
        const payload = Payload.toEntity(request)
        return payload
    }
)
