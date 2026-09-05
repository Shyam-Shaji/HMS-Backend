import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Medicine, MedicineDocument } from './schemas/medicine.schema';
import { MedicineBatch, MedicineBatchDocument } from './schemas/medicine-batch.schema';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { PurchaseOrder, PurchaseOrderDocument, PurchaseOrderStatus } from './schemas/purchase-order.schema';
import { DispenseRecord, DispenseRecordDocument } from './schemas/dispense-record.schema';
import { Prescription, PrescriptionDocument, PrescriptionStatus, DispenseStatus } from '../prescriptions/schemas/prescription.schema';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { AddBatchDto } from './dto/add-batch.dto';
import { SearchMedicineDto } from './dto/search-medicine.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto';

@Injectable()
export class PharmacyService {
    constructor(
    @InjectModel(Medicine.name) private medicineModel: Model<MedicineDocument>,
    @InjectModel(MedicineBatch.name) private batchModel: Model<MedicineBatchDocument>,
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(PurchaseOrder.name) private purchaseOrderModel: Model<PurchaseOrderDocument>,
    @InjectModel(DispenseRecord.name) private dispenseRecordModel: Model<DispenseRecordDocument>,
    @InjectModel(Prescription.name) private prescriptionModel: Model<PrescriptionDocument>,
  ) {}

  // ---------- Medicine catalog ----------

  createMedicine(dto: CreateMedicineDto) {
    return this.medicineModel.create(dto);
  }

  async searchMedicines(query: SearchMedicineDto) {
    const filter: any = { isActive: true };
    if (query.q) {
      const regex = new RegExp(query.q, 'i');
      filter.$or = [{ name: regex }, { genericName: regex }];
    }
    return this.medicineModel.find(filter).sort({ name: 1 });
  }

  async findMedicineById(id: string): Promise<MedicineDocument> {
    const medicine = await this.medicineModel.findById(id);
    if (!medicine) throw new NotFoundException('Medicine not found');
    return medicine;
  }

  async updateMedicine(id: string, dto: UpdateMedicineDto): Promise<MedicineDocument> {
    const medicine = await this.medicineModel.findByIdAndUpdate(id, dto, { new: true });
    if (!medicine) throw new NotFoundException('Medicine not found');
    return medicine;
  }

  // ---------- Batches / stock ----------

  async addBatch(medicineId: string, dto: AddBatchDto): Promise<MedicineBatchDocument> {
    await this.findMedicineById(medicineId);
    return this.batchModel.create({
      medicineId,
      batchNumber: dto.batchNumber,
      expiryDate: dto.expiryDate,
      quantityReceived: dto.quantityReceived,
      quantityAvailable: dto.quantityReceived,
      pricePerUnit: dto.pricePerUnit,
      supplier: dto.supplier,
    });
  }

  getBatchesForMedicine(medicineId: string) {
    return this.batchModel.find({ medicineId }).sort({ expiryDate: 1 });
  }

  // Total stock on hand per medicine <= its reorder level.
  async getLowStockMedicines() {
    const totals = await this.batchModel.aggregate([
      { $group: { _id: '$medicineId', totalAvailable: { $sum: '$quantityAvailable' } } },
    ]);
    const totalsMap = new Map(totals.map((t) => [t._id.toString(), t.totalAvailable]));

    const medicines = await this.medicineModel.find({ isActive: true });
    return medicines
      .map((m) => ({ medicine: m, totalAvailable: totalsMap.get((m._id as any).toString()) ?? 0 }))
      .filter((m) => m.totalAvailable <= m.medicine.reorderLevel);
  }

  // Batches with stock left, expiring within `days` - the near-expiry
  // alert on the pharmacy dashboard.
  async getExpiringBatches(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return this.batchModel
      .find({ expiryDate: { $lte: cutoff }, quantityAvailable: { $gt: 0 } })
      .sort({ expiryDate: 1 })
      .populate('medicineId', 'name unit');
  }

  // ---------- Suppliers ----------

  createSupplier(dto: CreateSupplierDto) {
    return this.supplierModel.create(dto);
  }

  findAllSuppliers() {
    return this.supplierModel.find({ isActive: true });
  }

  // ---------- Purchase orders ----------

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, orderedBy: string): Promise<PurchaseOrderDocument> {
    const supplier = await this.supplierModel.findById(dto.supplierId);
    if (!supplier) throw new NotFoundException('Supplier not found');
    return this.purchaseOrderModel.create({ ...dto, orderedBy });
  }

  findAllPurchaseOrders() {
    return this.purchaseOrderModel
      .find()
      .sort({ createdAt: -1 })
      .populate('supplierId', 'name')
      .populate('items.medicineId', 'name unit');
  }

  async findPurchaseOrderById(id: string): Promise<PurchaseOrderDocument> {
    const po = await this.purchaseOrderModel.findById(id).populate('supplierId', 'name').populate('items.medicineId', 'name unit');
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  // Receiving is what actually creates stock - batch numbers/expiry are
  // only known once goods physically arrive, not when the PO was placed.
  async receivePurchaseOrder(id: string, dto: ReceivePurchaseOrderDto): Promise<PurchaseOrderDocument> {
    const po = await this.purchaseOrderModel.findById(id);
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException(`Cannot receive a purchase order with status "${po.status}"`);
    }

    for (const item of dto.items) {
      await this.batchModel.create({
        medicineId: item.medicineId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        quantityReceived: item.quantityReceived,
        quantityAvailable: item.quantityReceived,
        pricePerUnit: item.pricePerUnit,
      });
    }

    po.status = PurchaseOrderStatus.RECEIVED;
    po.receivedDate = new Date();
    return po.save();
  }

  async cancelPurchaseOrder(id: string): Promise<PurchaseOrderDocument> {
    const po = await this.purchaseOrderModel.findById(id);
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('Only a pending purchase order can be cancelled');
    }
    po.status = PurchaseOrderStatus.CANCELLED;
    return po.save();
  }

  // ---------- Dispensing against prescriptions ----------

  // Consumes stock across batches for one medicine, oldest-expiry first
  // (FEFO), returning exactly which batches/quantities were drawn from.
  // Each batch decrement is its own atomic, condition-checked update
  // (`quantityAvailable >= amount`), so two pharmacists dispensing the
  // same batch simultaneously can't oversell it.
  private async consumeFefo(
    medicineId: string,
    quantityNeeded: number,
  ): Promise<Array<{ batch: MedicineBatchDocument; quantity: number }>> {
    const batches = await this.batchModel
      .find({ medicineId, quantityAvailable: { $gt: 0 } })
      .sort({ expiryDate: 1 });

    const consumed: Array<{ batch: MedicineBatchDocument; quantity: number }> = [];
    let remaining = quantityNeeded;

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, batch.quantityAvailable);

      const updated = await this.batchModel.findOneAndUpdate(
        { _id: batch._id, quantityAvailable: { $gte: take } },
        { $inc: { quantityAvailable: -take } },
        { new: true },
      );
      if (!updated) continue; // lost the race for this batch - move to the next one

      consumed.push({ batch: updated, quantity: take });
      remaining -= take;
    }

    if (remaining > 0) {
      // Roll back everything we just took - can't partially fill a single
      // dispense line, the pharmacist needs an all-or-nothing answer for
      // "can I dispense this much right now".
      for (const c of consumed) {
        await this.batchModel.findByIdAndUpdate(c.batch._id, { $inc: { quantityAvailable: c.quantity } });
      }
      throw new ConflictException('Insufficient stock to fulfil this quantity');
    }

    return consumed;
  }

  async dispense(prescriptionId: string, dto: DispensePrescriptionDto, dispensedBy: string): Promise<DispenseRecordDocument> {
    const prescription = await this.prescriptionModel.findById(prescriptionId);
    if (!prescription) throw new NotFoundException('Prescription not found');
    if (prescription.status !== PrescriptionStatus.ACTIVE) {
      throw new BadRequestException(`Cannot dispense against a "${prescription.status}" prescription`);
    }

    const dispensedLines: any[] = [];
    let totalAmount = 0;

    for (const item of dto.items) {
      const line = prescription.medicines.find((m: any) => m.lineId === item.prescriptionLineId);
      if (!line) throw new BadRequestException(`Prescription line ${item.prescriptionLineId} not found`);

      if (line.quantity != null) {
        const remaining = line.quantity - line.quantityDispensed;
        if (item.quantity > remaining) {
          throw new BadRequestException(
            `Cannot dispense ${item.quantity} of "${line.name}" - only ${remaining} remain on this prescription`,
          );
        }
      }

      const medicine = await this.medicineModel.findById(item.medicineId);
      if (!medicine) throw new NotFoundException('Medicine not found in catalog');

      const consumedBatches = await this.consumeFefo(item.medicineId, item.quantity);

      for (const { batch, quantity } of consumedBatches) {
        const lineTotal = quantity * batch.pricePerUnit;
        totalAmount += lineTotal;
        dispensedLines.push({
          prescriptionLineId: item.prescriptionLineId,
          medicineId: medicine._id,
          medicineName: medicine.name,
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          quantity,
          unitPrice: batch.pricePerUnit,
          lineTotal,
        });
      }

      // Atomic, targeted update of just this line's dispensed count -
      // uses arrayFilters so concurrent dispenses against different lines
      // of the same prescription don't clobber each other.
      await this.prescriptionModel.updateOne(
        { _id: prescriptionId, 'medicines.lineId': item.prescriptionLineId },
        { $inc: { 'medicines.$.quantityDispensed': item.quantity } },
      );
    }

    const refreshed = await this.prescriptionModel.findById(prescriptionId);
    if (refreshed) {
      const allSatisfied = refreshed.medicines.every((m: any) =>
        m.quantity != null ? m.quantityDispensed >= m.quantity : m.quantityDispensed > 0,
      );
      const anyDispensed = refreshed.medicines.some((m: any) => m.quantityDispensed > 0);
      refreshed.dispenseStatus = allSatisfied
        ? DispenseStatus.FULLY_DISPENSED
        : anyDispensed
          ? DispenseStatus.PARTIALLY_DISPENSED
          : DispenseStatus.NOT_DISPENSED;
      await refreshed.save();
    }

    return this.dispenseRecordModel.create({
      prescriptionId,
      patientId: prescription.patientId,
      dispensedBy,
      items: dispensedLines,
      totalAmount,
    });
  }

  getDispenseHistoryForPrescription(prescriptionId: string) {
    return this.dispenseRecordModel.find({ prescriptionId }).sort({ createdAt: -1 });
  }

  getDispenseHistoryForPatient(patientId: string) {
    return this.dispenseRecordModel.find({ patientId }).sort({ createdAt: -1 });
  }

  // Pharmacy's incoming work queue: active prescriptions not yet fully
  // dispensed - the Prescription Queue screen.
  getDispenseQueue() {
    return this.prescriptionModel
      .find({ status: PrescriptionStatus.ACTIVE, dispenseStatus: { $ne: DispenseStatus.FULLY_DISPENSED } })
      .sort({ createdAt: 1 })
      .populate('patientId', 'name uhid phone')
      .populate('doctorId', 'name department');
  }
}
