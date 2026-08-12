import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma, Role, User } from '@prisma/client';
import { LoginUserDto } from './dto/login-user-dto';
import { Payload } from 'src/utils/payload';
import { AuthService } from '../auth/auth.service';
import { CreateGateOperatorDto } from './dto/create-gate-operator.dto';
import { EventService } from 'src/features/event/event.service';

@Injectable()
export class UserService {
  constructor(
    private readonly authService: AuthService,
    private prisma: PrismaService,
    private readonly eventService: EventService
  ) {}

  async createGateOperator(dto: CreateGateOperatorDto){
    await this.eventService.findOne(dto.eventId)
    return this.create(
      {
        email: dto.email,
        username: dto.username,
        password:dto.password,
        role: Role.GATE_OPERATOR,
      },
      dto.eventId,
    );
  }

  async create(dto: CreateUserDto, eventId?: string) {
    const model = this.prisma.user;
    const hash = await this.authService.hashPassword(dto.password)
    return model.create({
      data:{
        email:dto.email,
        username:dto.username,
        role:dto.role,
        password:hash,
        ...(eventId && {
          events:{
            connect:{
              id: eventId
            }
          },
        }),
      },
      omit:{
        password:true
      }
    });
  }

  async login(login: LoginUserDto) : Promise<string>{
    const user = await this.prisma.user.findUnique({
      where:{
        email: login.email
      }
    })

    if (!user){
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await this.authService.compare(login.password,user.password)

    if(!isMatch){
      throw new UnauthorizedException('Invalid email or password');
    }
    const payload = this.authService.createPayload(user);
    return await this.authService.createToken(payload)
  }

  async profile(id: string){
    const user = await this.prisma.user.findUnique({
      where:{
        id
      },
      omit:{
        password:true
      }
    })
    if(!user){
      throw new UnauthorizedException('Invalid token');
    }
    return user
  }

  async logout(jwtId: string, ttlMillieSeconds:number):Promise<boolean>{
    await this.authService.setBlacklist(jwtId,ttlMillieSeconds)
    return true
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return await this.prisma.user.update({
      where: { id },
      omit:{
        password:true
      },
      data: updateUserDto,
    });
  }

  async remove(id: string): Promise<boolean> {
    await this.prisma.user.delete({
      where: { id },
    });
    return true;
  }
}
