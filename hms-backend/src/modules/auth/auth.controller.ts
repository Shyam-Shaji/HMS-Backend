import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import { Public } from '../../common/decorators/public.decorator';
import { type AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService){}

    @Public()
    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Public()
    @Throttle({default: {limit: 5, ttl: 60_000}}) //brute-force protection on login
    @Post('login')
    login(@Body() dto: LoginDto){
        return this.authService.login(dto);
    }

    @Public()
    @Throttle({default: {limit: 3, ttl: 60_000}}) // prevent OTP spam/abuse
    @Post('otp/request')
    requestOtp(@Body() dto: RequestOtpDto){
        return this.authService.requestOtp(dto);
    }

    @Public()
    @Throttle({default: {limit: 5, ttl: 60_000}})
    @Post('otp/verify')
    verifyOtp(@Body() dto: VerifyOtpDto){
        return this.authService.verifyOtp(dto);
    }

    @Public()
    @Post('refresh')
    refresh(@Body() dto: RefreshTokenDto){
        return this.authService.refresh(dto.refreshToken);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('logout')
    logout(@CurrentUser() user: AuthenticatedUser){
        return this.authService.logout(user.userId);
    }
    
}
