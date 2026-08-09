import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { LoginUserDto } from './dto/login-user-dto';
import { Payload } from 'src/utils/payload';
import { log } from 'console';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const result = await this.prisma.$queryRaw`
  SELECT
    current_database(),
    current_schema(),
    inet_server_addr(),
    inet_server_port()
`;

log(result)
    const model = this.prisma.user;
    const hash = await this.hashPassword(dto.password)
    return model.create({
      data:{
        email:dto.email,
        username:dto.username,
        role:dto.role,
        password:hash
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

    const isMatch = await bcrypt.compare(login.password, user.password);

    if(!isMatch){
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = new Payload(user.id,user.username,user.role);
    return await this.jwtService.signAsync(payload.toObject());
  }

  async profile(id: string): Promise<User>{
    const user = await this.prisma.user.findUnique({
      where:{
        id
      }
    })
    if(!user){
      throw new UnauthorizedException('Invalid token');
    }
    return user
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
  private async hashPassword(password: string) : Promise<string> {
    const saltRound = Number(process.env.SALT)
    return await bcrypt.hash(password, saltRound);
  }
}
