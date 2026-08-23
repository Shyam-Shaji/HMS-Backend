import { BadRequestException,Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt'
import { randomInt } from 'crypto';

import { UserService } from '../user/user.service';
import { Role } from '../../common/enums/role.enums';
import { Otp, OtpDocument } from '../otp/schemas/otp.schema';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
        @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    ){}

    // ---------- Patient self-registration ----------
    async register(dto: RegisterDto){
        const user = await this.userService.create({
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            password: dto.password,
            role: Role.PATIENT,
        });
        return this.issueTokens(user._id.toString(), user.role, null, user.email);
    }

    // ---------- Password login (staff mainly) ----------
    async login(dto: LoginDto){
        const user = await this.userService.findByEmailOrPhone(dto.identifier);
        if(!user || !user.passwordHash){
            throw new UnauthorizedException('Invalid credentials');
        }
        if(!user.isActive){
            throw new UnauthorizedException('Account is deactivated. Contact your hospital admin.');
        }
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if(!valid) throw new UnauthorizedException('Invalid credentials');

        return this.issueTokens(user._id.toString(), user.role, user.hospitalId?.toString() ?? null, user.email);
    }

    // ---------- OTP flow ----------
    async requestOtp(dto: RequestOtpDto){
        const length = Number(this.configService.get('OTP_LENGTH') ?? 6);
        const expiryMinutes = Number(this.configService.get('OTP_EXPIRY_MINUTES') ?? 5);

        const code = Array.from({length}, () => randomInt(0,10)).join('');
        const codeHash = await bcrypt.hash(code, 10);

        await this.otpModel.create({
            identifier: dto.identifier,
            codeHash,
            expiresAt: new Date(Date.now()  + expiryMinutes * 60 * 1000),
        });

        // TODO (Phase - Notification module): send via Twilio/SendGrid.
        // Logged here for local/dev use only - never log OTPs in production.
        if(this.configService.get('NODE_ENV') !== 'production'){
            console.log(`[DEV ONLY] OTP for ${dto.identifier}: ${code}`);
        }

        return {message: 'OTP sent', expireInMinutes: expiryMinutes};
    }

    async verifyOtp(dto: VerifyOtpDto){
        const otp = await this.otpModel
        .findOne({identifier: dto.identifier, consumed: false})
        .sort({createdAt: -1});

        if(!otp || otp.expiresAt < new Date()){
            throw new BadRequestException('OTP expired or not found. Please request a new one.');
        }
        if(otp.attempts >= 5){
            throw new BadRequestException('Too many attemptes. Please request a new OTP.');
        }

        const valid = await bcrypt.compare(dto.code, otp.codeHash);
        if(!valid){
            otp.attempts += 1;
            await otp.save();
            throw new BadRequestException('Invalid OTP');
        }

        otp.consumed = true
        await otp.save();

        // Find-or-create patient account against this identifier (typical
        // "login/signup with phone OTP" UX - no separate signup step needed).
        const existing = await this.userService.findByEmailOrPhone(dto.identifier);
        const user =
           existing ?? 
           (await this.userService.create({
            name: 'New Patient',
            email: dto.identifier.includes('@') ? dto.identifier: undefined,
            phone: dto.identifier.includes('@') ? undefined : dto.identifier,
            role: Role.PATIENT,
           }));

           if(!user.isActive){
            throw new UnauthorizedException('Account is deactivated.');
           }

           return this.issueTokens(user._id.toString(), user.role, user.hospitalId?.toString() ?? null, user.email);
    }

    // ---------- Token issuance / refresh / logout ----------
    private async issueTokens(userId: string, role: string, hospitalId: string | null, email?:string){
        const payload:JwtPayload={sub:userId, role, hospitalId, email};

        const accessToken = this.jwtService.sign(payload,{
            secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
            expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') as any,
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') as any,
        });

        const tokenHash = await bcrypt.hash(refreshToken, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // matches deafult refresh TTL: fine as a stored-record fallback

        await this.refreshTokenModel.create({userId, tokenHash, expiresAt});

        return{
            accessToken,
            refreshToken,
            user:{id: userId, role, hospitalId},
        }
    }

    async refresh(refreshToken: string){
        let payload: JwtPayload;
        try {
            payload = this.jwtService.verify(refreshToken,{
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Verify it matches a non-revoked, stored hash (allows server-side revocation).
        const candidates = await this.refreshTokenModel.find({userId: payload.sub, revoked: false});
        let matched: RefreshTokenDocument | null = null;
        for(const candidate of candidates){
            if(await bcrypt.compare(refreshToken, candidate.tokenHash)){
                matched = candidate;
                break;
            }
        }
        if(!matched) throw new UnauthorizedException('Refresh token not recognized or revoked');

        matched.revoked = true; // rotate: old refresh token is single-use
        await matched.save();

        return this.issueTokens(payload.sub, payload.role, payload.hospitalId, payload.email);
    }

    async logout(userId: string){
        await this.refreshTokenModel.updateMany({userId, revoked: false}, {revoked: true});
        return {message: 'Logged out successfully'};
    }
}
