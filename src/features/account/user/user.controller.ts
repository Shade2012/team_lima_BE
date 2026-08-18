import { Controller, Get, Post, Body, Patch, Param, Delete, ParseArrayPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user-dto';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserResponseDto } from './response/user.response';
import { ApiSuccessResponse, PrimitiveType } from 'src/decorators/api-success-response.decorator';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { Public } from 'src/decorators/public.decorator';
import { JwtAccessToken } from 'src/decorators/jwt.-access-token.decorator';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { CreateGateOperatorDto } from './dto/create-gate-operator.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UserRoleExt(Role.ORGANIZER)
  @Post('register/gate-operator')
  @ApiOperation({
    summary: 'Create a gate operator',
  })
  @ApiBody({
    type:[CreateGateOperatorDto]
  })
  @ApiSuccessResponse(UserResponseDto,201)
  @ApiFailureResponse(400,'Invalid request')
  @ApiFailureResponse(403,'Forbidden Resources')
  @ApiFailureResponse(429, 'Too many requests. Rate limit exceeded')
  @Throttle({
    default:{
      limit: 5,
      ttl: 60_000
    }
  })
  createGateOperator(
    @Body(
      new ParseArrayPipe({
        items:CreateGateOperatorDto
      })
    ) createGateOperator: CreateGateOperatorDto[]) {
    return this.userService.createGateOperator(createGateOperator[0]);
  }


  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Create a user',
  })
  @Throttle({
    default:{
      limit: 5,
      ttl: 60_000
    }
  })
  @ApiSuccessResponse(UserResponseDto,201)
  @ApiFailureResponse(400,'Invalid request')
  @ApiFailureResponse(429, 'Too many requests. Rate limit exceeded')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login as user',
  })
  @Throttle({
    default:{
      limit: 5,
      ttl: 60_000
    }
  })
  @ApiSuccessResponse(PrimitiveType.STRING,200)
  @ApiFailureResponse(400,'Invalid request')
  @ApiFailureResponse(429, 'Too many requests. Rate limit exceeded')
  login(@Body() login: LoginUserDto) {
    return this.userService.login(login);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:'Get profile user'
  })
  @ApiSuccessResponse(UserResponseDto)
  @ApiFailureResponse(401,'User not found')
  @Get('profile')
  profile(
    @PayloadJWT() payload:Payload
  ){
    return this.userService.profile(payload.sub);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:'Logout user'
  })
  @ApiSuccessResponse(PrimitiveType.BOOLEAN,200)
  @ApiFailureResponse(401,'User not found')
  @Post('logout')
  logout(
    @JwtAccessToken() token:string,
    @PayloadJWT() payload:Payload
  ){
    return this.userService.logout(token,payload.exp * 1000);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a user',
  })
  @ApiSuccessResponse(UserResponseDto,200,'User updated successfully')
  @ApiFailureResponse(400,'Invalid request')
  @Patch('profile')
  update(
    @PayloadJWT() payload:Payload,
    @Body() update: UpdateUserDto
  ) {
    return this.userService.update(payload.sub,update);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a user',
  })
  @ApiSuccessResponse(PrimitiveType.BOOLEAN,200,'User deleted successfully')
  @ApiFailureResponse(400,'Invalid request')
  @Delete()
  remove(
    @PayloadJWT() payload:Payload
  ) {
    return this.userService.remove(payload.sub);
  }
}
