import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantContextStorage } from '../context/tenant-context';

// Runs AFTER JwtAuthGuard has populated req.user (guards run before
// interceptors in Nest's pipeline... actually interceptors wrap guards too,
// but this interceptor is registered globally and reads req.user which is
// only present on protected routes - public routes simply get an empty ctx).
// Everything downstream (controllers, services, Mongoose tenant plugin)
// can read the current hospitalId via getCurrentHospitalId() without it
// being passed explicitly through every function call.
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    return new Observable((subscriber) => {
      tenantContextStorage.run(
        {
          userId: user?.userId,
          role: user?.role,
          hospitalId: user?.hospitalId ?? null,
        },
        () => {
          next.handle().subscribe(subscriber);
        },
      );
    });
  }
}
