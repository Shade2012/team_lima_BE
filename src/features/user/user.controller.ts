import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user-dto';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/decorators/public.decorator';
import { UserResponseDto } from './response/user.response';
import { ApiSuccessResponse, PrimitiveType } from 'src/decorators/api-success-response.decorator';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';

@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Create a user',
  })
  @ApiSuccessResponse(UserResponseDto,201)
  @ApiFailureResponse(400,'Invalid request')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login as user',
  })
  @ApiSuccessResponse(PrimitiveType.STRING,200)
  @ApiFailureResponse(400,'Invalid request')
  login(@Body() login: LoginUserDto) {
    return this.userService.login(login);
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiSuccessResponse(UserResponseDto)
  @ApiFailureResponse(401,'User not found')
  profile(
    @PayloadJWT() payload:Payload
  ){
    return this.userService.profile(payload.sub);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a user',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
