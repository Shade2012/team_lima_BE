import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketStatus, User } from '@prisma/client';
import { TicketService } from 'src/features/transaction/ticket/ticket.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Payload } from 'src/utils/payload';
import { ScanDto } from './dto/scans-dto';

@Injectable()
export class AdmissionScansService {
    constructor(
        private readonly prisma : PrismaService,
        private ticketService: TicketService,
    ) {}

  async getScans(payload:Payload){
    const operator = await this.validateOperator(payload.sub)
    const[total, scanned] = await Promise.all([
        this.ticketService.getTotalTicketByGateId(operator.gateId!),
        this.getTotalScanned(payload.sub)
    ])
    return {
        "scanned":scanned,
        "total":total
    }
  }
    
  async scan(payload:Payload, dto: ScanDto){
    const operator = await this.validateOperator(payload.sub)
    await this.ticketService.validateTicketScans(dto.ticketId)
    await this.prisma.$transaction(async (tx) => {
      await this.createScan(tx, operator, dto.ticketId)
      await this.ticketService.updateStatus(tx,TicketStatus.SEATED, dto.ticketId, operator.id)
     })
    return 'Success scans'
   }

   private async createScan(
    tx: Prisma.TransactionClient,
    operator:User,
    ticketId:string)
    {
        await tx.admissionScan.create({
            data:{
                gateId:operator.gateId!,
                gateOperatorId: operator.id,
                ticketId,
            }
        })
    }

   private async validateOperator(id: string){
    const operator = await this.prisma.user.findUnique({
      where:{
        id
      },
    })

    if(!operator){
      throw new NotFoundException("Operator not found");
    }

    if(!operator.gateId){
      throw new NotFoundException("Gate id has not been assigned to this operator yet");
    }
    return operator
   }

   private async getTotalScanned(id: string){
    return await this.prisma.admissionScan.count({
        where:{
            gateOperatorId:id
        }
    })
   }
}
