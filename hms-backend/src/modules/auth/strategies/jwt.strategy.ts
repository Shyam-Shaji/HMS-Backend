import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";

export interface JwtPayload{
    sub: string; // userId
    role: string;
    hospitalId: string | null;
    email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt'){
    constructor(config: ConfigService){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>('jwt.accessSecret'),
        });
    }
    
    // Whatever is returned here becomes req.user
    async validate(payload: JwtPayload){
        return{
            userId: payload.sub,
            role: payload.role,
            hospitalId: payload.hospitalId,
            email: payload.email,
        }
    }
}

