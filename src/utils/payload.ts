import { Role } from '@prisma/client';

export class Payload{
    sub!:string
    username!:string
    role!:Role

    constructor(sub:string,username:string,role:Role) {
        this.sub =sub;
        this.username =username;
        this.role =role
    }  

    toObject() {
      return {
        sub: this.sub,
        username: this.username,
        role: this.role,
      };
    }

    static toEntity(value:object): Payload{
      const sub = value['user']?.sub ?? -1
      const username = value['user']?.username ?? null
      const role =  value['user']?.role ?? null
      return new Payload(sub,username,role)
    }
}