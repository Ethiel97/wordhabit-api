import {
  JoinWaitlistCommand,
  JoinWaitlistResult,
} from '../commands/join-waitlist.command';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import type { WaitlistRepository } from '../../domain/repositories/waitlist.repository';
import { WAITLIST_REPOSITORY } from '../../domain/repositories/waitlist.repository';
import { ConflictException, Inject } from '@nestjs/common';
import { WaitlistJoinedEvent } from '../../domain/events/waitlist-joined.event';

@CommandHandler(JoinWaitlistCommand)
export class JoinWaitlistHandler implements ICommandHandler<
  JoinWaitlistCommand,
  JoinWaitlistResult
> {
  constructor(
    @Inject(WAITLIST_REPOSITORY)
    private readonly waitlistRepository: WaitlistRepository,

    private readonly eventBus: EventBus,
  ) {}

  async execute(command: JoinWaitlistCommand): Promise<JoinWaitlistResult> {
    const normalizedEmail = command.email.toLowerCase().trim();

    const existingEntry =
      await this.waitlistRepository.findByEmail(normalizedEmail);

    if (existingEntry) {
      throw new ConflictException('This email already exists on the waitlist.');
    }

    const created = await this.waitlistRepository.create({
      email: normalizedEmail,
      source: command.source,
    });

    this.eventBus.publish(new WaitlistJoinedEvent(normalizedEmail));

    return {
      id: created.id,
      email: created.email,
      source: created.source,
      status: created.status,
      createdAt: created.createdAt,
    };
  }
}
