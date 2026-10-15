import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TestCatalog, TestCatalogDocument } from './schemas/test-catalog.schema';
import { LabOrder, LabOrderDocument, LabOrderStatus } from './schemas/lab-order.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CreateTestCatalogDto } from './dto/create-test-catalog.dto';
import { UpdateTestCatalogDto } from './dto/update-test-catalog.dto';
import { SearchTestCatalogDto } from './dto/search-test-catalog.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { EnterResultDto } from './dto/enter-result.dto';
import { UploadReportDto } from './dto/upload-report.dto';
import { CancelLabOrderDto } from './dto/cancel-lab-order.dto';
import { SearchLabOrderDto } from './dto/search-lab-order.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { AdmissionsService } from '../admissions/admissions.service';
import { getCurrentHospitalId } from '../../common/context/tenant-context';
import { containsInsensitive } from '../../common/utils/regex.util';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class LabService {
  constructor(
    @InjectModel(TestCatalog.name) private testCatalogModel: Model<TestCatalogDocument>,
    @InjectModel(LabOrder.name) private labOrderModel: Model<LabOrderDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private readonly appointmentsService: AppointmentsService,
    private readonly admissionsService: AdmissionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ---------- Test catalogue ----------

  createTest(dto: CreateTestCatalogDto) {
    return this.testCatalogModel.create(dto);
  }

  async searchTests(query: SearchTestCatalogDto) {
    const filter: any = { isActive: true };
    if (query.q) filter.name = containsInsensitive(query.q);
    return this.testCatalogModel.find(filter).sort({ name: 1 });
  }

  async findTestById(id: string): Promise<TestCatalogDocument> {
    const test = await this.testCatalogModel.findById(id);
    if (!test) throw new NotFoundException('Test not found in catalogue');
    return test;
  }

  async updateTest(id: string, dto: UpdateTestCatalogDto): Promise<TestCatalogDocument> {
    const test = await this.testCatalogModel.findByIdAndUpdate(id, dto, { new: true });
    if (!test) throw new NotFoundException('Test not found in catalogue');
    return test;
  }

  // ---------- Ordering (from an OPD visit or an IPD admission) ----------

  // Identity (patient/hospital) is always derived server-side from the
  // Appointment or Admission - same pattern as EMR/Prescriptions/pharmacy
  // dispensing - never trusted from the request body.
  private async orderTest(
    dto: CreateLabOrderDto,
    origin: { appointmentId?: string; admissionId?: string },
    doctorId: string,
  ): Promise<LabOrderDocument> {
    const test = await this.findTestById(dto.testId);

    let patientId: any;
    if (origin.appointmentId) {
      const appointment = await this.appointmentsService.findById(origin.appointmentId);
      patientId = appointment.patientId;
    } else if (origin.admissionId) {
      const admission = await this.admissionsService.findById(origin.admissionId);
      patientId = admission.patientId;
    } else {
      throw new BadRequestException('A lab order must originate from either an appointment or an admission');
    }

    const patient = await this.patientModel.findById(patientId);
    if (!patient) throw new NotFoundException('Patient record not found');

    return this.labOrderModel.create({
      appointmentId: origin.appointmentId ?? null,
      admissionId: origin.admissionId ?? null,
      patientId: patient._id,
      patientUserId: patient.userId ?? null,
      orderedBy: doctorId,
      testId: test._id,
      testNameSnapshot: test.name,
      priceSnapshot: test.price,
      priority: dto.priority,
      clinicalNotes: dto.clinicalNotes,
    });
  }

  orderFromAppointment(appointmentId: string, dto: CreateLabOrderDto, doctorId: string) {
    return this.orderTest(dto, { appointmentId }, doctorId);
  }

  orderFromAdmission(admissionId: string, dto: CreateLabOrderDto, doctorId: string) {
    return this.orderTest(dto, { admissionId }, doctorId);
  }

  // ---------- Reads ----------

  async search(query: SearchLabOrderDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    // .aggregate() does NOT cast strings to ObjectIds the way .find() does,
    // so every id in this $match must be converted by hand - a plain
    // string would silently match nothing.
    if (query.patientId) filter.patientId = new Types.ObjectId(query.patientId);
    if (query.orderedBy) filter.orderedBy = new Types.ObjectId(query.orderedBy);

    // IMPORTANT: applyTenantPlugin's auto-scoping works via Mongoose query
    // middleware (pre('find'), etc.), which .aggregate() does NOT go
    // through. Since this method uses aggregate() (for priority-rank
    // sorting, below), the hospital filter has to be added explicitly here
    // or a hospital admin's queue could leak another hospital's orders.
    const hospitalId = getCurrentHospitalId();
    if (hospitalId) filter.hospitalId = new Types.ObjectId(hospitalId);

    // STAT orders first, then urgent, then routine; oldest first within
    // each priority tier - this is the lab tech's actual work queue order.
    // Enum string values don't sort alphabetically into that order, so we
    // rank them explicitly via aggregation instead of a plain .sort().
    const priorityRank = {
      $switch: {
        branches: [
          { case: { $eq: ['$priority', 'stat'] }, then: 0 },
          { case: { $eq: ['$priority', 'urgent'] }, then: 1 },
          { case: { $eq: ['$priority', 'routine'] }, then: 2 },
        ],
        default: 3,
      },
    };

    const [result] = await this.labOrderModel.aggregate([
      { $match: filter },
      { $addFields: { priorityRank } },
      { $sort: { priorityRank: 1, orderedAt: 1 } },
      {
        $facet: {
          items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const total = result.totalCount[0]?.count ?? 0;
    const items = await this.labOrderModel.populate(result.items, [
      { path: 'patientId', select: 'name uhid phone' },
      { path: 'orderedBy', select: 'name department' },
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<LabOrderDocument> {
    const order = await this.labOrderModel
      .findById(id)
      .populate('patientId', 'name uhid phone dob gender')
      .populate('orderedBy', 'name department')
      .populate('testId', 'name category sampleType resultType parameters');
    if (!order) throw new NotFoundException('Lab order not found');
    return order;
  }

  getPatientHistory(patientId: string) {
    return this.labOrderModel
      .find({ patientId, status: LabOrderStatus.COMPLETED })
      .sort({ verifiedAt: -1 })
      .populate('orderedBy', 'name department');
  }

  findMyOrders(userId: string) {
    return this.labOrderModel
      .find({ patientUserId: userId, status: LabOrderStatus.COMPLETED })
      .sort({ verifiedAt: -1 })
      .populate('orderedBy', 'name department');
  }

  async findMyOrderById(userId: string, id: string): Promise<LabOrderDocument> {
    const order = await this.labOrderModel
      .findOne({
        _id: id,
        patientUserId: userId,
        status: LabOrderStatus.COMPLETED,
      })
      .populate('orderedBy', 'name department');
    if (!order) throw new NotFoundException('Report not found');
    return order;
  }

  // ---------- Status lifecycle ----------

  private async getActiveOrThrow(id: string): Promise<LabOrderDocument> {
    const order = await this.labOrderModel.findById(id);
    if (!order) throw new NotFoundException('Lab order not found');
    if (order.status === LabOrderStatus.CANCELLED) throw new BadRequestException('This order was cancelled');
    if (order.status === LabOrderStatus.COMPLETED) {
      throw new BadRequestException('This order is already completed and its result is locked');
    }
    return order;
  }

  async collectSample(id: string, collectedBy: string): Promise<LabOrderDocument> {
    const order = await this.getActiveOrThrow(id);
    if (order.status !== LabOrderStatus.ORDERED) {
      throw new BadRequestException(`Cannot collect a sample for an order with status "${order.status}"`);
    }
    order.status = LabOrderStatus.SAMPLE_COLLECTED;
    order.sampleCollectedAt = new Date();
    order.sampleCollectedBy = collectedBy as any;
    return order.save();
  }

  async startProcessing(id: string): Promise<LabOrderDocument> {
    const order = await this.getActiveOrThrow(id);
    if (order.status !== LabOrderStatus.SAMPLE_COLLECTED) {
      throw new BadRequestException('Sample must be collected before processing can start');
    }
    order.status = LabOrderStatus.IN_PROGRESS;
    return order.save();
  }

  async enterResult(id: string, dto: EnterResultDto): Promise<LabOrderDocument> {
    const order = await this.getActiveOrThrow(id);
    if (dto.resultParameters !== undefined) order.resultParameters = dto.resultParameters as any;
    if (dto.resultNotes !== undefined) order.resultNotes = dto.resultNotes;
    if (order.status === LabOrderStatus.SAMPLE_COLLECTED) order.status = LabOrderStatus.IN_PROGRESS;
    return order.save();
  }

  async uploadReport(id: string, dto: UploadReportDto): Promise<LabOrderDocument> {
    const order = await this.getActiveOrThrow(id);
    order.reportFileUrl = dto.reportFileUrl;
    if (order.status === LabOrderStatus.SAMPLE_COLLECTED) order.status = LabOrderStatus.IN_PROGRESS;
    return order.save();
  }

  // Finalizes and locks the result - the same immutability contract as
  // EMR.finalize(). Notifies both the ordering doctor and the patient
  // (if they have a portal account) that the report is ready.
  async verify(id: string, verifiedBy: string): Promise<LabOrderDocument> {
    const order = await this.getActiveOrThrow(id);
    if (order.resultParameters.length === 0 && !order.reportFileUrl) {
      throw new BadRequestException('Cannot verify an order with no result entered yet');
    }
    order.status = LabOrderStatus.COMPLETED;
    order.verifiedBy = verifiedBy as any;
    order.verifiedAt = new Date();
    await order.save();

    const recipients = [order.orderedBy.toString(), order.patientUserId?.toString()].filter(
      (id): id is string => Boolean(id),
    );
    for (const userId of recipients) {
      this.notificationsService
        .send({
          userId,
          type: NotificationType.LAB_REPORT_READY,
          title: 'Lab report ready',
          message: `The result for "${order.testNameSnapshot}" is now available.`,
          relatedEntityType: 'lab_order',
          relatedEntityId: (order._id as any).toString(),
        })
        .catch(() => undefined);
    }

    return order;
  }

  async cancel(id: string, dto: CancelLabOrderDto): Promise<LabOrderDocument> {
    const order = await this.labOrderModel.findById(id);
    if (!order) throw new NotFoundException('Lab order not found');
    if (order.status === LabOrderStatus.COMPLETED) {
      throw new BadRequestException('A completed, verified order cannot be cancelled');
    }
    order.status = LabOrderStatus.CANCELLED;
    order.cancelReason = dto.reason;
    return order.save();
  }
}
