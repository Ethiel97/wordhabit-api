import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    VocabularyModule,
    WaitlistModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
