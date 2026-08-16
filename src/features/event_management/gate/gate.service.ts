import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateGateDto } from './dto/create-gate.dto';
import { UpdateGateDto } from './dto/update-gate.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventService } from 'src/features/event_management/event/event.service';
import { Payload } from 'src/utils/payload';
import { Gate, TicketStatus } from '@prisma/client';
import { ScanDto } from './dto/scans-dto';
import { TicketService } from 'src/features/transaction/ticket/ticket.service';
import { AdmissionScansService } from '../admission-scans/admission-scans.service';

@Injectable()
export class GateService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private admissionScanService: AdmissionScansService,
    private ticketService: TicketService,
  ) {}

  async create(dto: CreateGateDto, payload: Payload): Promise<Gate> {
    const event = await this.eventService.findOne(dto.eventId);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to add gates to this event');
    }

    return this.prisma.gate.create({
      data: {
        eventId: dto.eventId,
        name: dto.name,
      },
    });
  }

  async findByEvent(eventId: string): Promise<Gate[]> {
    await this.eventService.findOne(eventId);

    return this.prisma.gate.findMany({
      where: { eventId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Gate | any> {
    const gate = await this.prisma.gate.findUnique({
      where: { id },
      include: {
        operators: {
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            createdAt: true,
          }
        }
      }
    });
    if (!gate) {
      throw new NotFoundException(`Gate with id ${id} not found`);
    }
    return gate;
  }

  async update(id: string, dto: UpdateGateDto, payload: Payload): Promise<Gate> {
    const gate = await this.findOne(id);
    const event = await this.eventService.findOne(gate.eventId);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to update this gate');
    }

    return this.prisma.gate.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: string, payload: Payload): Promise<Gate> {
    const gate = await this.findOne(id);
    const event = await this.eventService.findOne(gate.eventId);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to delete this gate');
    }

    const existingScansCount = await this.prisma.admissionScan.count({
      where: { gateId: id },
    });

    if (existingScansCount > 0) {
      throw new BadRequestException(
        `Cannot delete gate because it has ${existingScansCount} admission scan(s) recorded. Please delete the scans first.`,
      );
    }

    return this.prisma.gate.delete({
      where: { id },
    });
  }

  async scan(payload:Payload, dto: ScanDto){
    const operator = await this.prisma.user.findUnique({
      where:{
        id:payload.sub
      },
    })

    if(!operator){
      throw new NotFoundException("Operator not found");
    }

    if(!operator.gateId){
      throw new NotFoundException("Gate id has not been assigned to this operator yet");
    }

    await this.prisma.$transaction(async (tx) => {
      await this.admissionScanService.createScan(tx, operator, dto.ticketId)
      await this.ticketService.updateStatus(tx,TicketStatus.SEATED, dto.ticketId, operator.id)
    })
    return 'Success scans'
  }
}
