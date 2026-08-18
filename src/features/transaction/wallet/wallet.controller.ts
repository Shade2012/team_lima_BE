import { Body, Controller, Get, Post } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { TopUpWalletDto } from './dto/topup-wallet.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { ApiSuccessResponse } from 'src/decorators/api-success-response.decorator';
import { WalletResponseDto, WalletTransactionResponseDto } from './response/wallet.response';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';

@ApiTags('Wallet (VelocePay)')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get current wallet balance' })
  @ApiSuccessResponse(WalletResponseDto, 200, 'Wallet balance retrieved successfully')
  async getWallet(@PayloadJWT() payload: Payload) {
    return this.walletService.getWallet(payload.sub);
  }

  @Post('topup')
  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({ summary: 'Top up wallet balance' })
  @ApiSuccessResponse(WalletResponseDto, 201, 'Wallet topped up successfully')
  @ApiFailureResponse(400, 'Top up failed. Maximum balance exceeded')
  async topUp(@PayloadJWT() payload: Payload, @Body() dto: TopUpWalletDto) {
    return this.walletService.topUp(payload.sub, dto.amount);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiSuccessResponse(WalletTransactionResponseDto, 200, 'Transactions retrieved successfully', true)
  async getTransactions(@PayloadJWT() payload: Payload) {
    return this.walletService.getTransactions(payload.sub);
  }
}
