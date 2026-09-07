import { Controller, Body, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { GenerateFromAppointmentDto } from './dto/generate-from-appointment.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ConfirmOnlinePaymentDto } from './dto/confirm-online-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { SubmitInsuranceClaimDto } from './dto/submit-insurance-claim.dto';
import { UpdateInsuranceClaimDto } from './dto/update-insurance-claim.dto';
import { SearchInvoiceDto } from './dto/search-invoice.dto';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const BILLING_STAFF_ROLES = [Role.BILLING_STAFF, Role.HOSPITAL_ADMIN, Role.RECEPTIONIST];
const BILLING_READ_ROLES = [Role.BILLING_STAFF, Role.HOSPITAL_ADMIN, Role.RECEPTIONIST, Role.DOCTOR];

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('billing')
export class BillingController {
    constructor(private readonly billingService: BillingService) {}

    // ---- Patient self-service ----

    @Get('me')
  @Roles(Role.PATIENT)
  findMyInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.findMyInvoices(user.userId);
  }

  @Get('me/:id')
  @Roles(Role.PATIENT)
  findMyInvoiceById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.findMyInvoiceById(user.userId, id);
  }

  @Post('me/invoices/:id/pay/initiate')
  @Roles(Role.PATIENT)
  patientInitiatePayment(@Param('id') id: string, @Body('amount') amount: number) {
    return this.billingService.initiateOnlinePayment(id, amount);
  }

  @Post('payments/:paymentId/confirm')
  // No role restriction beyond "authenticated" - both a patient completing
  // checkout and a gateway-triggered server callback need to hit this.
  // A real gateway integration would instead expose a dedicated, signature-
  // verified webhook route (bypassing user auth entirely) for the server-
  // to-server callback; left as a follow-up alongside the real SDK swap-in.
  confirmOnlinePayment(@Param('paymentId') paymentId: string, @Body() dto: ConfirmOnlinePaymentDto) {
    return this.billingService.confirmOnlinePayment(paymentId, dto);
  }

  // ---- Invoice creation ----

  @Post('invoices')
  @Roles(...BILLING_STAFF_ROLES)
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.create(dto, user.userId);
  }

  @Post('invoices/generate-from-appointment/:appointmentId')
  @Roles(...BILLING_STAFF_ROLES)
  generateFromAppointment(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: GenerateFromAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.generateFromAppointment(appointmentId, dto, user.userId);
  }

  @Post('invoices/generate-from-admission/:admissionId')
  @Roles(...BILLING_STAFF_ROLES)
  generateFromAdmission(@Param('admissionId') admissionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.generateFromAdmission(admissionId, user.userId);
  }

  // ---- Reads ----

  @Get('invoices')
  @Roles(...BILLING_READ_ROLES)
  search(@Query() query: SearchInvoiceDto) {
    return this.billingService.search(query);
  }

  @Get('invoices/:id')
  @Roles(...BILLING_READ_ROLES)
  findOne(@Param('id') id: string) {
    return this.billingService.findById(id);
  }

  @Get('invoices/:id/payments')
  @Roles(...BILLING_READ_ROLES)
  getPayments(@Param('id') id: string) {
    return this.billingService.getPaymentsForInvoice(id);
  }

  // ---- Edit / issue / cancel ----

  @Patch('invoices/:id')
  @Roles(...BILLING_STAFF_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.billingService.update(id, dto);
  }

  @Patch('invoices/:id/issue')
  @Roles(...BILLING_STAFF_ROLES)
  issue(@Param('id') id: string) {
    return this.billingService.issue(id);
  }

  @Patch('invoices/:id/cancel')
  @Roles(...BILLING_STAFF_ROLES)
  cancel(@Param('id') id: string) {
    return this.billingService.cancel(id);
  }

  // ---- In-person payments ----

  @Post('invoices/:id/payments')
  @Roles(...BILLING_STAFF_ROLES)
  recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.recordPayment(id, dto, user.userId);
  }

  @Patch('payments/:paymentId/refund')
  @Roles(Role.BILLING_STAFF, Role.HOSPITAL_ADMIN)
  refund(@Param('paymentId') paymentId: string, @Body() dto: RefundPaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.refundPayment(paymentId, dto, user.userId);
  }

  // ---- Insurance claims ----

  @Patch('invoices/:id/insurance-claim')
  @Roles(...BILLING_STAFF_ROLES)
  submitClaim(@Param('id') id: string, @Body() dto: SubmitInsuranceClaimDto) {
    return this.billingService.submitInsuranceClaim(id, dto);
  }

  @Patch('invoices/:id/insurance-claim/status')
  @Roles(...BILLING_STAFF_ROLES)
  updateClaim(@Param('id') id: string, @Body() dto: UpdateInsuranceClaimDto) {
    return this.billingService.updateInsuranceClaim(id, dto);
  }
}
