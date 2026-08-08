import { UserRole } from "./user_role";

export class Payload{
    sub!:number
    email!:string
    userRoleId!:number
    role!:UserRole

    constructor(sub:number,email:string,userRoleId:number,role:UserRole) {
        this.sub =sub;
        this.userRoleId = userRoleId
        this.email =email;
        this.role =role
    }  

    toObject() {
      return {
        sub: this.sub,
        email: this.email,
        userRoleId: this.userRoleId,
        role: this.role,
      };
    }

    static toEntity(value:object): Payload{
      const sub = value['user']?.sub ?? -1
      const email = value['user']?.email ?? null
      const role =  value['user']?.role ?? null
      const userRoleId =  value['user']?.userRoleId ?? null
      return new Payload(sub,email,userRoleId,role)
    }
}