import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Role, TENANT_SCOPED_ROLES } from "../enums/role.enums";

// Defence-in-depth: even though the Mongoose tenant plugin auto-scopes
// queries by hospitalId from the async context, this guard rejects any
// tenant-scoped staff user whose token somehow carries no hospitalId
// (e.g. a bug elsewhere, or a tampered/stale token) before the request
// ever reaches a service. Super admins and patients (platform-level) skip it.
@Injectable()
export class TenantGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const {user} = context.switchToHttp().getRequest();
        if(!user) return true; // let JwtAuthGuard handle missing auth

        if(TENANT_SCOPED_ROLES.includes(user.role as Role) && !user.hospitalId){
            throw new ForbiddenException('Missing hospital context for this account');
        }
        return true;
    }
}
