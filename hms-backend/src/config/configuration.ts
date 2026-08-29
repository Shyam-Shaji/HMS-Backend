export default () => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4000',10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN || '*', //frontned 3000
    mongoUri: process.env.MONGO_URI,
    jwt:{
        accessSecret: process.env.JWT_ACCESS_SECRET,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    },
    otp:{
        expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5',10),
        length: parseInt(process.env.OTP_LENGTH || '6',10),
    },
    throttle: {
        ttl: parseInt(process.env.THROTTLE_TTL || '60',10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    },
});