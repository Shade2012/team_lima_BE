import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdmissionScansService {
    constructor(private readonly prisma : PrismaService) {}

    async createScan(
        tx: Prisma.TransactionClient,
        operator:User,
        ticketId:string){
        await tx.admissionScan.create({
            data:{
                gateId:operator.gateId!,
                gateOperatorId: operator.id,
                ticketId,
            }
        })
    }
}
