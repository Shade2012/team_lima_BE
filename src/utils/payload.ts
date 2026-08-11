import { Role } from '@prisma/client';

export class Payload{
    sub!:string
    username!:string
    role!:Role
    iat!: number;
    exp!: number;

    constructor(sub:string,username:string,role:Role, iat: number, exp:number) {
        this.sub =sub;
        this.username =username;
        this.role =role
        this.iat = iat,
        this.exp = exp
    }  

    toObject() {
      return {
        sub: this.sub,
        username: this.username,
        role: this.role,
        exp: this.exp,
        iat: this.iat
      };
    }

    static toEntity(value:object): Payload{
      const sub = value['user']?.sub ?? -1
      const username = value['user']?.username ?? null
      const role =  value['user']?.role ?? null
      const exp = value['user']?.exp ?? null
      const iat = value['user']?.iat ?? null
      return new Payload(sub,username,role,iat,exp)
    }
}