import 'dotenv/config';
import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt'
import { UserSchema } from '../src/modules/user/schemas/user.schema';
import { Role } from '../src/common/enums/role.enums';

async function run(){
    const mongoUri = process.env.MONGO_URI!;
    const email = process.env.SUPER_ADMIN_EMAIL!;
    const password = process.env.SUPER_ADMIN_PASSWORD!;

    await mongoose.connect(mongoUri);
    const UserModel = mongoose.model('User', UserSchema);

    const existing = await UserModel.findOne({email});
    if(existing){
        console.log(`Super admin already exists: ${email}`);
        await mongoose.disconnect();
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await UserModel.create({
        name: 'Platform Super Admin',
        email,
        passwordHash,
        role: Role.SUPER_ADMIN,
        hospitalId: null,
        isActive: true,
    });

    console.log(`Super admin create: ${email} / ${password}`);
    console.log(`IMPORTANT: change this password immediately after first login.`);
    await mongoose.disconnect();
}

run().catch((err)=>{
    console.error(err);
    process.exit(1);
})