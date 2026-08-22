import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { Role } from "../../../common/enums/role.enum";

export type UserDocument = User & Document;

@Schema({timestamps: true})
export class User {
    @Prop({required: true, trim: true})
    name: string;

    @Prop({trim: true, lowercase: true, sparse: true, unique: true})
    email?: string;

    @Prop({trim: true, sparse: true, unique: true})
    phone?: string;

    // Optional: OTP-only patients may never set a password
    @Prop({select: false})
    passwordHash?: string;

    @Prop({required: true, enum: Role, index: true})
    role: Role;

    // null for SUPER_ADMIN and platform-level PATIENT account.
    // required (enforced in service layer) for all staff roles.
    @Prop({type: Types.ObjectId, ref: 'Hospital', default: null, index: true})
    hospitalId: Types.ObjectId | null;

    @Prop()
    department?: string;

    @Prop({default: true})
    isActive: boolean;

    @Prop({select: false})
    refreshTokenHash?: string;

    @Prop({default: false})
    isEmailVerified: boolean;

    @Prop({default: false})
    isPhoneVerified: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);