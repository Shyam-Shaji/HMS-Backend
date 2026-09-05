import { Controller, Body, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { AddBatchDto } from './dto/add-batch.dto';
import { SearchMedicineDto } from './dto/search-medicine.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const PHARMACY_MANAGE_ROLES = [Role.PHARMACIST, Role.HOSPITAL_ADMIN];
const PHARMACY_READ_ROLES = [Role.PHARMACIST, Role.HOSPITAL_ADMIN, Role.DOCTOR, Role.NURSE];

@ApiTags('pharmacy')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('pharmacy')
export class PharmacyController {
    constructor(private readonly pharmacyService: PharmacyService) {}

    // ---- Medicine catalog ----

    @Post('medicines')
    @Roles(...PHARMACY_MANAGE_ROLES)
    createMedicine(@Body() dto: CreateMedicineDto) {
    return this.pharmacyService.createMedicine(dto);
    }

    @Get('medicines')
  @Roles(...PHARMACY_READ_ROLES)
  searchMedicines(@Query() query: SearchMedicineDto) {
    return this.pharmacyService.searchMedicines(query);
  }

  @Get('medicines/low-stock')
  @Roles(...PHARMACY_MANAGE_ROLES)
  getLowStock() {
    return this.pharmacyService.getLowStockMedicines();
  }

  @Get('medicines/expiring')
  @Roles(...PHARMACY_MANAGE_ROLES)
  getExpiring(@Query('days') days?: string) {
    return this.pharmacyService.getExpiringBatches(days ? Number(days) : undefined);
  }

  @Get('medicines/:id')
  @Roles(...PHARMACY_READ_ROLES)
  findMedicine(@Param('id') id: string) {
    return this.pharmacyService.findMedicineById(id);
  }

  @Patch('medicines/:id')
  @Roles(...PHARMACY_MANAGE_ROLES)
  updateMedicine(@Param('id') id: string, @Body() dto: UpdateMedicineDto) {
    return this.pharmacyService.updateMedicine(id, dto);
  }

  @Post('medicines/:id/batches')
  @Roles(...PHARMACY_MANAGE_ROLES)
  addBatch(@Param('id') id: string, @Body() dto: AddBatchDto) {
    return this.pharmacyService.addBatch(id, dto);
  }

  @Get('medicines/:id/batches')
  @Roles(...PHARMACY_READ_ROLES)
  getBatches(@Param('id') id: string) {
    return this.pharmacyService.getBatchesForMedicine(id);
  }

  // ---- Suppliers ----

  @Post('suppliers')
  @Roles(...PHARMACY_MANAGE_ROLES)
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.pharmacyService.createSupplier(dto);
  }

  @Get('suppliers')
  @Roles(...PHARMACY_MANAGE_ROLES)
  findAllSuppliers() {
    return this.pharmacyService.findAllSuppliers();
  }

  // ---- Purchase orders ----

  @Post('purchase-orders')
  @Roles(...PHARMACY_MANAGE_ROLES)
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pharmacyService.createPurchaseOrder(dto, user.userId);
  }

  @Get('purchase-orders')
  @Roles(...PHARMACY_MANAGE_ROLES)
  findAllPurchaseOrders() {
    return this.pharmacyService.findAllPurchaseOrders();
  }

  @Get('purchase-orders/:id')
  @Roles(...PHARMACY_MANAGE_ROLES)
  findPurchaseOrder(@Param('id') id: string) {
    return this.pharmacyService.findPurchaseOrderById(id);
  }

  @Patch('purchase-orders/:id/receive')
  @Roles(...PHARMACY_MANAGE_ROLES)
  receivePurchaseOrder(@Param('id') id: string, @Body() dto: ReceivePurchaseOrderDto) {
    return this.pharmacyService.receivePurchaseOrder(id, dto);
  }

  @Patch('purchase-orders/:id/cancel')
  @Roles(...PHARMACY_MANAGE_ROLES)
  cancelPurchaseOrder(@Param('id') id: string) {
    return this.pharmacyService.cancelPurchaseOrder(id);
  }

  // ---- Dispensing ----

  @Get('dispense-queue')
  @Roles(...PHARMACY_MANAGE_ROLES)
  getDispenseQueue() {
    return this.pharmacyService.getDispenseQueue();
  }

  @Post('prescriptions/:prescriptionId/dispense')
  @Roles(Role.PHARMACIST)
  dispense(
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: DispensePrescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pharmacyService.dispense(prescriptionId, dto, user.userId);
  }

  @Get('prescriptions/:prescriptionId/dispense-history')
  @Roles(...PHARMACY_READ_ROLES)
  getDispenseHistoryForPrescription(@Param('prescriptionId') prescriptionId: string) {
    return this.pharmacyService.getDispenseHistoryForPrescription(prescriptionId);
  }

  @Get('patients/:patientId/dispense-history')
  @Roles(...PHARMACY_READ_ROLES)
  getDispenseHistoryForPatient(@Param('patientId') patientId: string) {
    return this.pharmacyService.getDispenseHistoryForPatient(patientId);
  }
}
