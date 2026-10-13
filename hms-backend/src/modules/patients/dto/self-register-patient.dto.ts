import { PickType } from "@nestjs/swagger";
import { IsMongoId } from "class-validator";
import { CreatePatientDto } from "./create-patient.dto";

// Same demographic field as staff-created registration, minus `userId`
// (always the caller themselves) and plus a required `hospitalId` (since
// a patient's own JWT carries none - see PatientsService.selfRegister).
export class SelfRegisterPatientDto extends PickType(CreatePatientDto, [
  'name',
  'dob',
  'gender',
  'bloodGroup',
  'phone',
  'email',
  'address',
  'emergencyContact',
  'allergies',
  'chronicConditions',
  'insurance',
] as const) {
  @IsMongoId()
  hospitalId: string;
}
