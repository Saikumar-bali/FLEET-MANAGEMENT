const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const driverUser = await p.user.findFirst({where:{username:'aanand'},include:{dataScopes:true}});
  console.log('Driver user:', driverUser.id, driverUser.name);
  console.log('Data scopes:', JSON.stringify(driverUser.dataScopes));
  
  const driver = await p.driver.findFirst({where:{userId:driverUser.id}});
  console.log('Driver record:', driver ? driver.id : 'NOT FOUND');
  
  if (driver) {
    const assignments = await p.vehicleAssignment.findMany({where:{driverId:driver.id}});
    console.log('Vehicle assignments:', assignments.length);
    for (const a of assignments) {
      console.log('  vehicle:', a.vehicleId, 'driver:', a.driverId, 'status:', a.status);
    }
    
    // Check current vehicle on driver
    const vehicles = await p.vehicle.findMany({where:{currentDriverId: driver.id}});
    console.log('Current vehicles:', vehicles.length);
    for (const v of vehicles) {
      console.log('  vehicle:', v.id, v.vehicleNumber, v.status);
    }
  }
  
  await p.$disconnect();
}
main().catch(console.error);
