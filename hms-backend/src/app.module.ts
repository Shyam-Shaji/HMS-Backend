import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { PatientsModule } from './modules/patients/patients.module';
import { CounterModule } from './common/counter/counter.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UserModule,
    AuthModule,
    HealthModule,
    AuditLogModule,
    HospitalsModule,
    PatientsModule,
    CounterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

