import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type RefreshTokenDocument = RefreshToken & Document;

// Stored so refresh tokens can be revoked (logout, password change,
// suspected compromised) instead of trusting a stateless JWT until expiry.

@Schema({timestamps: true})
export class RefreshToken{
    @Prop({type: Types.ObjectId, ref: 'User', required: true, index: true})
    userId: Types.ObjectId;

    @Prop({required: true})
    tokenHash: string;

    @Prop({required: true})
    expiresAt: Date;

    @Prop({default: false})
    revoked: boolean;

    @Prop()
    userAgent?: string;

    @Prop()
    ipAddress?: string;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});