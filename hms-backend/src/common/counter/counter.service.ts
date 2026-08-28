import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from './counter.schema';

@Injectable()
export class CounterService {
    constructor(@InjectModel(Counter.name) private counterModel: Model<CounterDocument>){}

    // Atomic find-and-increment - safe under concurrent requests, which a
  // busy reception desk registering multiple walk-ins definitely produces.
  async next(key: string): Promise<number> {
    const doc = await this.counterModel.findOneAndUpdate(
        {key},
        {$inc: {seq: 1}},
        {new: true, upsert: true},
    );
    return doc.seq;
  }
}
