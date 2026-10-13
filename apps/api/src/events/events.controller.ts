import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { CreatePreLoginEventDto } from './dto/create-pre-login-event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.record(dto);
  }

  // Único endpoint de eventos SEM JWT. Mitigação de abuso: lista fechada de
  // 2 tipos + payload de forma fixa (EventsService) + rate limit por IP
  // (30/min - uma visita normal emite poucos eventos). Ver "Eventos
  // pré-login" em docs/ai/modules/backend.md.
  @Post('pre-login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  createPreLogin(@Body() dto: CreatePreLoginEventDto) {
    return this.eventsService.recordPreLoginEvent(dto);
  }
}
