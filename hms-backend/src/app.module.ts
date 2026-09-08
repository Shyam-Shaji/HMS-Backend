import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HealthModule } from './modules/health/health.module';
import { PatientsModule } from './modules/patients/patients.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { EmrModule } from './modules/emr/emr.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { WardsModule } from './modules/wards/wards.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { LabModule } from './modules/lab/lab.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({ uri: config.get('mongoUri') }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        { ttl: config.get<number>('throttle.ttl')! * 1000, limit: config.get<number>('throttle.limit')! },
      ],
      inject: [ConfigService],
    }),

    // Feature modules - every module from the original project plan is
    // now represented here.
    AuthModule,
    UserModule,
    HospitalsModule,
    AuditLogModule,
    HealthModule,
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    EmrModule,
    PrescriptionsModule,
    WardsModule,
    AdmissionsModule,
    PharmacyModule,
    LabModule,
    BillingModule,
    NotificationsModule,
  ],
  providers: [
    // Order matters: JwtAuthGuard runs first (auth), then TenantGuard
    // (tenant sanity check), then RolesGuard is applied per-controller.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Interceptor order: tenant context must be established before
    // anything downstream (including audit logging) runs.
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },

    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
