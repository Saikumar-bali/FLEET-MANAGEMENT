const { PrismaClient } = require('@prisma/client');
async function main() {
  const p = new PrismaClient();
  try {
    const r = await p.$queryRawUnsafe("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'driver_advances' AND column_name = 'payment_mode'");
    console.log('payment_mode column:', JSON.stringify(r, null, 2));
    
    const r2 = await p.$queryRawUnsafe("SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'PaymentMode' ORDER BY e.enumsortorder");
    console.log('PaymentMode enum values:', JSON.stringify(r2, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
}
main();
