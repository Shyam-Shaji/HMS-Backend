import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ward, WardSchema } from './schemas/ward.schema';
import { Bed, BedSchema } from './schemas/bed.schema';
import { WardsService } from './wards.service';
import { WardsController } from './wards.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ward.name, schema: WardSchema },
      { name: Bed.name, schema: BedSchema },
    ]),
  ],
  controllers: [WardsController],
  providers: [WardsService],
  exports: [WardsService],
})
export class WardsModule {}
