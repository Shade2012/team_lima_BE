import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { Payload } from 'src/utils/payload';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class AuthService {
  private readonly TOKEN_EXPIRATION_SECONDS = 24 * 60 * 60;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async compare(password:string, hash:string){
    return await bcrypt.compare(password,hash)
  }

  async setBlacklist(token: string, ttlMillieSeconds:number): Promise<void> {
    await this.cacheManager.set(`blacklist:${token}`,'revoked',ttlMillieSeconds - Date.now())
  }

  async validateToken(token:string): Promise<boolean>{
    const isBlacklisted = await this.cacheManager.get(`blacklist:${token}`);
    return !isBlacklisted;
  }

  async createToken(payload:Payload): Promise<string> {
    return await this.jwtService.signAsync(payload.toObject())
  }

  async verifyToken(token:string){
    const isBlacklisted = await this.cacheManager.get(`blacklist:${token}`);
    if(isBlacklisted){
        throw new UnauthorizedException('Token has been revoked or logged out');
    }
    return this.jwtService.verifyAsync(token)
  }

  async hashPassword(password: string) : Promise<string> {
    const saltRound = Number(process.env.SALT)
    return await bcrypt.hash(password, saltRound);
  }

  createPayload(user: { id: string; username: string; role: Role }) {
    const currentTimeMs = Date.now();
    const currentTimeSec = Math.floor(currentTimeMs / 1000);
    const tokenExpiration = currentTimeSec + this.TOKEN_EXPIRATION_SECONDS;
    return new Payload(user.id, user.username, user.role,currentTimeSec, tokenExpiration);
  }
}
