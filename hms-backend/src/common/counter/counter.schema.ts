import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type CounterDocument = Counter & Document;

// Generic atomic sequence generator, used for anything needing a
// human-readable running number per hospital (UHID today; invoice
// numbers, admission numbers etc. in later modules can reuse this).
@Schema()
export class Counter{
    @Prop({required: true, unique: true})
    key: string; // e.g 'uhid:<hospitalId>'

    @Prop({default: 0})
    seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);