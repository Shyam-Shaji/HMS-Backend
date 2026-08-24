import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { tap } from "rxjs";
import { AuditLogService } from "../../modules/audit-log/audit-log.service";

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Fire-and-forget audit trail for every write operation, per the
// "Auditability" non-functional requirement in the project plan.
// Read (GET) requests are not logged here to keep volume manageable -
// sensitive EMR *reads* should get their own explicit logging in that
// module once it's built, since "who viewed this record" matters clinically.
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, user } = req;

    return next.handle().pipe(
      tap(() => {
        if (!WRITE_METHODS.includes(method)) return;
        this.auditLogService
          .record({
            userId: user?.userId,
            hospitalId: user?.hospitalId ?? null,
            action: `${method} ${originalUrl}`,
            entityType: originalUrl.split('/')[3] || 'unknown',
            ipAddress: req.ip,
          })
          .catch(() => undefined); // never let audit logging break the request
      }),
    );
  }
}