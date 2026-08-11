import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsIn, IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';
const AllowedRoles = [Role.CUSTOMER,Role. ORGANIZER]
export class CreateUserDto {
  @ApiProperty({
    description: 'Unique username for the user',
    example: 'john_doe',
  })
  @IsNotEmpty()
  @IsString()
  username!: string;

  @ApiProperty({
    description: 'Unique user email address',
    example: 'john@example.com',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'mysecret123',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 0,
    minUppercase: 0,
    minNumbers: 0,
    minSymbols: 0,
  })
  password!: string;

  @ApiProperty({
    description: 'User role',
    enum: AllowedRoles,
    enumName: 'Role',
    example: Role.CUSTOMER,
  })
  @IsIn(AllowedRoles, {
    message: `Role must be one of: ${Object.values(AllowedRoles).join(', ')}`,
  })
  role!: Role;
}

