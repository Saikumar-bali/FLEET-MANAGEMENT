const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== FULL DB CLEANUP ===\n');

  // 1. Delete driver_settlement_history (no children, safe first)
  const histCount = await p.$executeRawUnsafe('DELETE FROM driver_settlement_history');
  console.log(`1. Deleted ${histCount} driver_settlement_history rows`);

  // 2. Delete driver_settlement_lines (no children)
  const linesCount = await p.$executeRawUnsafe('DELETE FROM driver_settlement_lines');
  console.log(`2. Deleted ${linesCount} driver_settlement_lines rows`);

  // 3. Delete driver_settlements
  const settleCount = await p.$executeRawUnsafe('DELETE FROM driver_settlements');
  console.log(`3. Deleted ${settleCount} driver_settlements rows`);

  // 4. Delete driver_advances
  const advanceCount = await p.$executeRawUnsafe('DELETE FROM driver_advances');
  console.log(`4. Deleted ${advanceCount} driver_advances rows`);

  // 5. Delete all fuel entries
  const fuelCount = await p.$executeRawUnsafe('DELETE FROM fuel_entries');
  console.log(`5. Deleted ${fuelCount} fuel_entries rows`);

  // 6. Delete all expenses
  const expenseCount = await p.$executeRawUnsafe('DELETE FROM expenses');
  console.log(`6. Deleted ${expenseCount} expenses rows`);

  // 7. Nullify document fuel_entry references (already SET NULL by FK, but be explicit)
  await p.$executeRawUnsafe('UPDATE documents SET fuel_entry_id = NULL WHERE fuel_entry_id IS NOT NULL');
  console.log('7. Nullified document fuel_entry_id references');

  // 8. Delete orphan drivers (not linked to any user via user_profile_links)
  const orphanDrivers = await p.$queryRawUnsafe(`
    SELECT d.id, d.name, d.mobile 
    FROM drivers d 
    WHERE NOT EXISTS (
      SELECT 1 FROM user_profile_links upl 
      WHERE upl.profile_type = 'DRIVER' AND upl.profile_id = d.id AND upl.status = 'ACTIVE'
    )
  `);
  console.log(`\n8. Found ${orphanDrivers.length} orphan drivers (not linked to any user):`);
  for (const d of orphanDrivers) {
    console.log(`   - ${d.name} (${d.mobile}) [${d.id}]`);
    // Delete the orphan driver (FK SET NULL on fuel_entries/expenses etc already cleared above)
    await p.$executeRawUnsafe('DELETE FROM drivers WHERE id = $1', d.id);
  }
  if (orphanDrivers.length === 0) console.log('   None found.');

  // 9. Clean up fuel/expenses related notifications
  const notifCount = await p.$executeRawUnsafe("DELETE FROM notifications WHERE category IN ('FUEL', 'EXPENSE')");
  console.log(`\n9. Deleted ${notifCount} FUEL/EXPENSE notifications`);

  // 10. Delete test user created by integration tests (driver_adv_settlement_test_driver)
  const testUsers = await p.$queryRawUnsafe("SELECT id, username FROM users WHERE username LIKE '%test%' OR username LIKE '%SET%'");
  for (const u of testUsers) {
    console.log(`10. Deleting test user: ${u.username} [${u.id}]`);
    await p.$executeRawUnsafe('DELETE FROM users WHERE id = $1', u.id);
  }
  if (testUsers.length === 0) console.log('10. No test users found.');

  // Summary
  console.log('\n=== SUMMARY ===');
  const vehicles = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM vehicles');
  const drivers = await p.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS count FROM drivers d 
    WHERE EXISTS (
      SELECT 1 FROM user_profile_links upl 
      WHERE upl.profile_type = 'DRIVER' AND upl.profile_id = d.id AND upl.status = 'ACTIVE'
    )
  `);
  const users = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM users');
  const fuel = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM fuel_entries');
  const expenses = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM expenses');
  const advances = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM driver_advances');
  const settlements = await p.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM driver_settlements');

  console.log(`Vehicles: ${vehicles[0].count}`);
  console.log(`Linked drivers: ${drivers[0].count}`);
  console.log(`Users: ${users[0].count}`);
  console.log(`Fuel entries: ${fuel[0].count}`);
  console.log(`Expenses: ${expenses[0].count}`);
  console.log(`Driver advances: ${advances[0].count}`);
  console.log(`Driver settlements: ${settlements[0].count}`);

  await p.$disconnect();
  console.log('\n=== CLEANUP COMPLETE ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
