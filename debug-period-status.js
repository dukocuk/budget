// Debug script to check budget period status
// Open browser console (F12) and paste this script

(async () => {
  console.log('🔍 Checking budget period status...');

  // Get PGlite instance
  const db = window.__pglite__;
  if (!db) {
    console.error('❌ PGlite instance not found. Make sure app is loaded.');
    return;
  }

  // Check all budget periods
  const periods = await db.query('SELECT id, year, status, user_id FROM budget_periods ORDER BY year DESC');

  console.log('📊 Budget Periods:', periods.rows);

  if (periods.rows.length === 0) {
    console.warn('⚠️ No budget periods found!');
    return;
  }

  // Show status of each period
  periods.rows.forEach((p, i) => {
    console.log(`Period ${i + 1}: Year ${p.year} - Status: ${p.status} (ID: ${p.id})`);
  });

  // Find 2025 period
  const period2025 = periods.rows.find(p => p.year === 2025);

  if (period2025) {
    console.log('\n📅 2025 Period Details:');
    console.log('  Status:', period2025.status);
    console.log('  ID:', period2025.id);

    if (period2025.status === 'archived') {
      console.log('\n🔓 TO FIX: Run this command to unarchive:');
      console.log(`await db.query("UPDATE budget_periods SET status = 'active' WHERE id = '${period2025.id}'"); location.reload();`);
    } else {
      console.log('\n✅ Period is already active!');
      console.log('⚠️ Issue might be elsewhere. Check React DevTools for activePeriod state.');
    }
  } else {
    console.log('\n⚠️ No 2025 period found. Creating one...');
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO budget_periods (id, user_id, year, monthly_payment, previous_balance, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [newId, periods.rows[0]?.user_id || 'default-user', 2025, 5700, 0, 'active', now, now]
    );

    console.log('✅ Created 2025 period with active status!');
    console.log('🔄 Reloading page...');
    location.reload();
  }
})();
