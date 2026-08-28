import { PickType } from "@nestjs/swagger";
import { CreatePatientDto } from "./create-patient.dto";

// A patient updating their OWN record via the portal can only touch
// contact/administrative fields - not clinical fields like bloodGroup,
// allergies, or chronicConditions, which should be doctor/nurse-confirmed.
export class UpdateMyPatientDto extends PickType(CreatePatientDto,[
    'phone',
    'email',
    'address',
    'emergencyContact',
    'insurance',
] as const) {}