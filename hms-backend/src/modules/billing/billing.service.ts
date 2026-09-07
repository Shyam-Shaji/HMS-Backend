import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus, InsuranceClaimStatus, LineItemCategory } from './schemas/invoice.schema';
import { Payment, PaymentDocument, PaymentMethod, PaymentStatus } from './schemas/payment.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ConfirmOnlinePaymentDto } from './dto/confirm-online-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { SubmitInsuranceClaimDto } from './dto/submit-insurance-claim.dto';
import { UpdateInsuranceClaimDto } from './dto/update-insurance-claim.dto';
import { SearchInvoiceDto } from './dto/search-invoice.dto';
import { GenerateFromAppointmentDto } from './dto/generate-from-appointment.dto';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CounterService } from '../../common/counter/counter.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AdmissionsService } from '../admissions/admissions.service';
// import { PharmacyService } from '../pharmacy/pharmacy.service';
import { LabService } from '../lab/lab.service';
import { Prescription, PrescriptionDocument } from '../prescriptions/schemas/prescription.schema';
import { DispenseRecord, DispenseRecordDocument } from '../pharmacy/schemas/dispense-record.schema';
import { Ward, WardDocument } from '../wards/schemas/ward.schema';
import { getCurrentHospitalId } from '../../common/context/tenant-context';

@Injectable()
export class BillingService {
    constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    @InjectModel(Prescription.name) private prescriptionModel: Model<PrescriptionDocument>,
    @InjectModel(DispenseRecord.name) private dispenseRecordModel: Model<DispenseRecordDocument>,
    @InjectModel(Ward.name) private wardModel: Model<WardDocument>,
    private readonly counterService: CounterService,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly appointmentsService: AppointmentsService,
    private readonly admissionsService: AdmissionsService,
    private readonly labService: LabService,
  ) {}

  // ---------- Helpers ----------

  private computeTotals(
    lineItems: { quantity: number; unitPrice: number }[],
    discount = 0,
    tax = 0,
  ) {
    const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
    const totalAmount = Math.max(0, subtotal - discount + tax);
    return { subtotal, totalAmount };
  }

  private async nextInvoiceNumber(): Promise<string> {
    const hospitalId = getCurrentHospitalId();
    const seq = await this.counterService.next(`invoice:${hospitalId}`);
    return `INV${new Date().getFullYear()}${String(seq).padStart(6, '0')}`;
  }

  // ---------- Manual invoice creation ----------

  async create(dto: CreateInvoiceDto, createdBy: string): Promise<InvoiceDocument> {
    const patient = await this.patientModel.findById(dto.patientId);
    if (!patient) throw new NotFoundException('Patient record not found');

    const lineItems = dto.lineItems.map((li) => ({ ...li, amount: li.quantity * li.unitPrice }));
    const { subtotal, totalAmount } = this.computeTotals(lineItems, dto.discount, dto.tax);

    return this.invoiceModel.create({
      invoiceNumber: await this.nextInvoiceNumber(),
      patientId: patient._id,
      patientUserId: patient.userId ?? null,
      appointmentId: dto.appointmentId ?? null,
      admissionId: dto.admissionId ?? null,
      lineItems,
      subtotal,
      discount: dto.discount ?? 0,
      tax: dto.tax ?? 0,
      totalAmount,
      balanceDue: totalAmount,
      createdBy,
    });
  }

  // ---------- Auto-generation ----------

  // Pulls in pharmacy + lab charges already linked to this OPD visit, plus
  // a manually-supplied consultation fee (see GenerateFromAppointmentDto
  // for why that's not looked up automatically). Produced as a DRAFT so
  // billing staff can review/adjust before issuing.
  async generateFromAppointment(
    appointmentId: string,
    dto: GenerateFromAppointmentDto,
    createdBy: string,
  ): Promise<InvoiceDocument> {
    const appointment = await this.appointmentsService.findById(appointmentId);
    const patient = await this.patientModel.findById(appointment.patientId);
    if (!patient) throw new NotFoundException('Patient record not found');

    const lineItems: any[] = [];

    if (dto.consultationFee) {
      lineItems.push({
        description: 'Consultation fee',
        category: LineItemCategory.CONSULTATION,
        referenceId: appointmentId,
        quantity: 1,
        unitPrice: dto.consultationFee,
        amount: dto.consultationFee,
      });
    }

    const prescriptions = await this.prescriptionModel.find({ appointmentId });
    const prescriptionIds = prescriptions.map((p) => p._id);
    const dispenseRecords = await this.dispenseRecordModel.find({ prescriptionId: { $in: prescriptionIds } });
    for (const record of dispenseRecords) {
      for (const item of record.items) {
        lineItems.push({
          description: `${item.medicineName} (batch ${item.batchNumber})`,
          category: LineItemCategory.PHARMACY,
          referenceId: (record._id as any).toString(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.lineTotal,
        });
      }
    }

    const labOrders = await this.labService.getPatientHistory(appointment.patientId.toString());
    for (const order of labOrders.filter((o: any) => o.appointmentId?.toString() === appointmentId)) {
      lineItems.push({
        description: order.testNameSnapshot,
        category: LineItemCategory.LAB,
        referenceId: (order._id as any).toString(),
        quantity: 1,
        unitPrice: order.priceSnapshot,
        amount: order.priceSnapshot,
      });
    }

    if (lineItems.length === 0) {
      throw new BadRequestException('Nothing to bill for this appointment yet');
    }

    const { subtotal, totalAmount } = this.computeTotals(lineItems);
    return this.invoiceModel.create({
      invoiceNumber: await this.nextInvoiceNumber(),
      patientId: patient._id,
      patientUserId: patient.userId ?? null,
      appointmentId,
      lineItems,
      subtotal,
      totalAmount,
      balanceDue: totalAmount,
      createdBy,
    });
  }

  // Ward stay charges are computed per-segment across any transfers (each
  // ward may have a different daily rate), plus lab charges linked to this
  // admission. NOTE: IPD medication (AdmissionMedicationOrder) has no
  // pricing in the current data model, so it isn't auto-included here -
  // billing staff adds those manually until a future phase prices them.
  async generateFromAdmission(admissionId: string, createdBy: string): Promise<InvoiceDocument> {
    const admission = await this.admissionsService.findById(admissionId);
    const patient = await this.patientModel.findById(admission.patientId);
    if (!patient) throw new NotFoundException('Patient record not found');

    const lineItems: any[] = [];

    // Reconstruct ward-stay segments from admission + transfer history.
    const events = [...admission.transferHistory].sort(
      (a, b) => new Date(a.transferredAt).getTime() - new Date(b.transferredAt).getTime(),
    );
    let currentWardId = events.length > 0 ? events[0].fromWardId : (admission.wardId as any);
    let segmentStart = admission.admissionDate;
    const segments: { wardId: any; from: Date; to: Date }[] = [];
    for (const ev of events) {
      segments.push({ wardId: currentWardId, from: segmentStart, to: ev.transferredAt as any });
      currentWardId = ev.toWardId;
      segmentStart = ev.transferredAt as any;
    }
    segments.push({ wardId: currentWardId, from: segmentStart, to: admission.dischargeDate ?? new Date() });

    for (const segment of segments) {
      const ward = await this.wardModel.findById(segment.wardId);
      if (!ward) continue;
      const ms = new Date(segment.to).getTime() - new Date(segment.from).getTime();
      const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
      lineItems.push({
        description: `${ward.name} stay (${days} day${days > 1 ? 's' : ''})`,
        category: LineItemCategory.ADMISSION,
        referenceId: admissionId,
        quantity: days,
        unitPrice: ward.chargesPerDay,
        amount: days * ward.chargesPerDay,
      });
    }

    const labOrders = await this.labService.getPatientHistory(admission.patientId.toString());
    for (const order of labOrders.filter((o: any) => o.admissionId?.toString() === admissionId)) {
      lineItems.push({
        description: order.testNameSnapshot,
        category: LineItemCategory.LAB,
        referenceId: (order._id as any).toString(),
        quantity: 1,
        unitPrice: order.priceSnapshot,
        amount: order.priceSnapshot,
      });
    }

    const { subtotal, totalAmount } = this.computeTotals(lineItems);
    return this.invoiceModel.create({
      invoiceNumber: await this.nextInvoiceNumber(),
      patientId: patient._id,
      patientUserId: patient.userId ?? null,
      admissionId,
      lineItems,
      subtotal,
      totalAmount,
      balanceDue: totalAmount,
      createdBy,
    });
  }

  // ---------- Reads ----------

  async search(query: SearchInvoiceDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.patientId) filter.patientId = query.patientId;

    const [items, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('patientId', 'name uhid phone'),
      this.invoiceModel.countDocuments(filter),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(id).populate('patientId', 'name uhid phone');
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  findMyInvoices(userId: string) {
    return this.invoiceModel.find({ patientUserId: userId }).sort({ createdAt: -1 });
  }

  async findMyInvoiceById(userId: string, id: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findOne({ _id: id, patientUserId: userId });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  getPaymentsForInvoice(invoiceId: string) {
    return this.paymentModel.find({ invoiceId }).sort({ createdAt: -1 });
  }

  // ---------- Edit / issue / cancel ----------

  private assertDraft(invoice: InvoiceDocument) {
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only a draft invoice can be edited - issue a credit note instead of editing an issued one');
    }
  }

  async update(id: string, dto: UpdateInvoiceDto): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    this.assertDraft(invoice);

    if (dto.lineItems) {
      invoice.lineItems = dto.lineItems.map((li) => ({ ...li, amount: li.quantity * li.unitPrice })) as any;
    }
    if (dto.discount !== undefined) invoice.discount = dto.discount;
    if (dto.tax !== undefined) invoice.tax = dto.tax;

    const { subtotal, totalAmount } = this.computeTotals(invoice.lineItems, invoice.discount, invoice.tax);
    invoice.subtotal = subtotal;
    invoice.totalAmount = totalAmount;
    invoice.balanceDue = totalAmount - invoice.amountPaid;
    return invoice.save();
  }

  async issue(id: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    this.assertDraft(invoice);
    invoice.status = InvoiceStatus.ISSUED;
    invoice.issuedAt = new Date();
    return invoice.save();
  }

  async cancel(id: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.amountPaid > 0) {
      throw new BadRequestException('Cannot cancel an invoice that already has payments - refund them first');
    }
    invoice.status = InvoiceStatus.CANCELLED;
    return invoice.save();
  }

  // ---------- Payments (in-person) ----------

  private applyPaymentToInvoice(invoice: InvoiceDocument, amount: number) {
    invoice.amountPaid += amount;
    invoice.balanceDue = Math.max(0, invoice.totalAmount - invoice.amountPaid);
    invoice.status = invoice.balanceDue === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
  }

  async recordPayment(invoiceId: string, dto: RecordPaymentDto, collectedBy: string): Promise<PaymentDocument> {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === InvoiceStatus.CANCELLED) throw new BadRequestException('This invoice is cancelled');
    if (dto.amount > invoice.balanceDue) {
      throw new BadRequestException(`Payment of ${dto.amount} exceeds the outstanding balance of ${invoice.balanceDue}`);
    }

    const payment = await this.paymentModel.create({
      invoiceId,
      amount: dto.amount,
      method: dto.method,
      status: PaymentStatus.COMPLETED,
      transactionRef: dto.transactionRef,
      collectedBy,
    });

    this.applyPaymentToInvoice(invoice, dto.amount);
    await invoice.save();
    return payment;
  }

  // ---------- Payments (online gateway) ----------

  async initiateOnlinePayment(invoiceId: string, amount: number): Promise<{ payment: PaymentDocument; gatewayOrderId: string }> {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (amount > invoice.balanceDue) {
      throw new BadRequestException(`Amount exceeds the outstanding balance of ${invoice.balanceDue}`);
    }

    const order = await this.paymentGateway.createOrder(amount);
    const payment = await this.paymentModel.create({
      invoiceId,
      amount,
      method: PaymentMethod.ONLINE_GATEWAY,
      status: PaymentStatus.PENDING,
      transactionRef: order.gatewayOrderId,
    });

    return { payment, gatewayOrderId: order.gatewayOrderId };
  }

  async confirmOnlinePayment(paymentId: string, dto: ConfirmOnlinePaymentDto): Promise<PaymentDocument> {
    // Idempotent by construction: the status filter means a second webhook
    // delivery for the same payment (gateways routinely retry webhooks)
    // simply won't match and no-ops instead of double-crediting the invoice.
    const payment = await this.paymentModel.findOneAndUpdate(
      { _id: paymentId, status: PaymentStatus.PENDING },
      { status: PaymentStatus.COMPLETED, gatewayPaymentId: dto.gatewayPaymentId },
      { new: true },
    );
    if (!payment) throw new NotFoundException('Pending payment not found (already confirmed, or invalid id)');

    const verified = await this.paymentGateway.verifyPayment(payment.transactionRef!, dto.gatewayPaymentId, dto.signature);
    if (!verified) {
      payment.status = PaymentStatus.FAILED;
      await payment.save();
      throw new BadRequestException('Payment verification failed');
    }

    const invoice = await this.invoiceModel.findById(payment.invoiceId);
    if (invoice) {
      this.applyPaymentToInvoice(invoice, payment.amount);
      await invoice.save();
    }
    return payment;
  }

  // ---------- Refunds ----------

  async refundPayment(paymentId: string, dto: RefundPaymentDto, refundedBy: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.COMPLETED && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new BadRequestException(`Cannot refund a payment with status "${payment.status}"`);
    }
    const alreadyRefunded = payment.refund?.refundedAmount ?? 0;
    if (dto.amount > payment.amount - alreadyRefunded) {
      throw new BadRequestException('Refund amount exceeds what remains refundable on this payment');
    }

    const newRefundedTotal = alreadyRefunded + dto.amount;
    payment.refund = {
      refundedAmount: newRefundedTotal,
      refundedAt: new Date(),
      refundedBy: refundedBy as any,
      reason: dto.reason,
    } as any;
    payment.status = newRefundedTotal >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
    await payment.save();

    const invoice = await this.invoiceModel.findById(payment.invoiceId);
    if (invoice) {
      invoice.amountPaid = Math.max(0, invoice.amountPaid - dto.amount);
      invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;
      invoice.status = invoice.balanceDue === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
      await invoice.save();
    }

    return payment;
  }

  // ---------- Insurance claims ----------

  async submitInsuranceClaim(invoiceId: string, dto: SubmitInsuranceClaimDto): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    invoice.insuranceClaim = {
      provider: dto.provider,
      policyNumber: dto.policyNumber,
      claimedAmount: dto.claimedAmount,
      approvedAmount: 0,
      status: InsuranceClaimStatus.SUBMITTED,
      submittedAt: new Date(),
    } as any;
    return invoice.save();
  }

  async updateInsuranceClaim(invoiceId: string, dto: UpdateInsuranceClaimDto): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.insuranceClaim || invoice.insuranceClaim.status === InsuranceClaimStatus.NOT_APPLICABLE) {
      throw new BadRequestException('No claim has been submitted for this invoice yet');
    }
    invoice.insuranceClaim.status = dto.status;
    if (dto.approvedAmount !== undefined) invoice.insuranceClaim.approvedAmount = dto.approvedAmount;
    if (dto.notes !== undefined) invoice.insuranceClaim.notes = dto.notes;
    if (dto.status === InsuranceClaimStatus.SETTLED) invoice.insuranceClaim.settledAt = new Date();
    return invoice.save();
  }
}
