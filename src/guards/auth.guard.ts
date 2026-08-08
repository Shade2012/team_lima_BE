import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PUBLIC_KEY } from 'src/decorators/public.decorator';
import { UserRole } from 'src/utils/user_role';
import { USER_ROLE_EXT_DECORATOR_KEY } from 'src/decorators/user_role_ext.decorator';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private reflector:Reflector){}
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean>{
    try {
      const ctx = context.switchToHttp()
      const isPublic = this.reflector.getAllAndOverride<Boolean>(PUBLIC_KEY,[
        context.getHandler(),
        context.getClass()
      ])

      const roles = this.reflector.getAllAndOverride<Array<UserRole>>(USER_ROLE_EXT_DECORATOR_KEY,[
        context.getHandler(),
        context.getClass()
      ])

      const request: Request = ctx.getRequest();
      const token =  this.extractFromHeader(request);
      let payloadVerify:any | undefined = undefined

      if(token){
        payloadVerify = await this.jwtService.verifyAsync(token)
        request['user'] = payloadVerify;
      }

      if(isPublic){
        return true
      }

      if(!token){
        throw new UnauthorizedException("Token is not provided");
      }

      if(roles != null && roles.includes(payloadVerify.role)){
        return true
      }if(roles == null){
        return true
      } else {
        return false
      }
    } catch (error) {
      throw new UnauthorizedException();
    }
  }

  private extractFromHeader(request:Request){
    const bearer = request.headers['authorization']
    if(!bearer){
      return null
    }else{
      const token = bearer.slice(7,bearer.length)
      return token
    }
  }
}    