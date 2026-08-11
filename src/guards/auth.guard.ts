import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PUBLIC_KEY } from 'src/decorators/public.decorator';
import { Role } from '@prisma/client';
import { USER_ROLE_EXT_DECORATOR_KEY } from 'src/decorators/user_role_ext.decorator';
import { Request } from 'express';
import { AuthService } from 'src/features/account/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private reflector:Reflector
  ){}
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean>{
    try {
      const ctx = context.switchToHttp()
      const isPublic = this.reflector.getAllAndOverride<Boolean>(PUBLIC_KEY,[
        context.getHandler(),
        context.getClass()
      ])

      const roles = this.reflector.getAllAndOverride<Array<Role>>(USER_ROLE_EXT_DECORATOR_KEY,[
        context.getHandler(),
        context.getClass()
      ])

      const request: Request = ctx.getRequest();
      const token =  this.extractFromHeader(request);
      let payloadVerify:any | undefined = undefined

      if(token){
        payloadVerify = await this.authService.verifyToken(token)
        request['user'] = payloadVerify;
        request['token'] = token
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