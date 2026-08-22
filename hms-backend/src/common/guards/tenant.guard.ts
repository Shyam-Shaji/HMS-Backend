import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Role, TENANT_SCOPED_ROLES } from "../enums/role.enums";

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