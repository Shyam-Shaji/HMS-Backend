import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type OtpDocument = Otp & Document;

@Schema({timestamps: true})
export class Otp {
    @Prop({required: true, index: true})
    identifier: string; // email or phone

    @Prop({required: true})
    codeHash: string;

    @Prop({required: true})
    expiresAt: Date;

    @Prop({default: 0})
    attempts: number;

    @Prop({default: false})
    consumed: boolean;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
// TTL index: Mongo auto-deletes expired OTP docs, no corn needed.
OtpSchema.index({expiresAt: 1},{expireAfterSeconds: 0});