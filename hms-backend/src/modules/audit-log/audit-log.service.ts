import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

@Injectable()
export class AuditLogService {
  constructor(@InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>) {}

  record(entry: {
    userId?: string;
    hospitalId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    ipAddress?: string;
  }) {
    return this.auditLogModel.create(entry);
  }

  findForHospital(hospitalId: string, limit = 100) {
    return this.auditLogModel.find({ hospitalId }).sort({ createdAt: -1 }).limit(limit);
  }
}
