/**
 * In-process unit & integration tester for Sruthi Leave Management
 */
const db = require('./config/db');
const security = require('./utils/security');

async function testAll() {
  console.log('\n======================================================');
  console.log('   VERIFYING SYSTEM FUNCTIONALITY (IN-PROCESS)        ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // 1. Password hashing & verification
  const testPass = 'admin123';
  const hashed = security.hashPassword(testPass);
  assert(security.comparePassword(testPass, hashed), '1. Password Hashing and Comparison');

  // 2. Token Generation & Verification
  const token = security.generateToken({ id: 1, employee_id: 'ADM001', role: 'admin' });
  const decoded = security.verifyToken(token);
  assert(decoded && decoded.employee_id === 'ADM001' && decoded.role === 'admin', '2. Token Generation & Verification');

  // 3. User lookup (Employee)
  const emp = await db.findUserByIdentifier('EMP101');
  assert(emp && emp.name === 'Rahul Sharma', '3. Find User by Employee ID (EMP101)');

  // 4. User lookup (Admin)
  const adm = await db.findUserByIdentifier('admin@sruthi.com');
  assert(adm && adm.role === 'admin', '4. Find User by Admin Email');

  // 5. Password verification against seed user
  assert(security.comparePassword('admin123', adm.password), '5. Admin Credentials Verification (admin123)');
  assert(security.comparePassword('emp123', emp.password), '6. Employee Credentials Verification (emp123)');

  // 7. Create Leave Application
  const newLeave = await db.createApplication({
    employee_id: 'EMP101',
    employee_name: 'Rahul Sharma',
    leave_type: 'Casual',
    number_of_days: 2,
    description: 'Visiting family for annual function',
    application_date: '2026-11-06'
  });
  assert(newLeave && newLeave.application_id && newLeave.status === 'Pending', '7. Submit Leave Application (Casual)');

  // 8. Get Applications for Employee
  const empLeaves = await db.getApplications({ employee_id: 'EMP101' });
  assert(empLeaves.length >= 1 && empLeaves.some(l => l.application_id === newLeave.application_id), '8. Retrieve Employee Leave History');

  // 9. Get Dashboard Statistics
  const stats = await db.getStats('EMP101');
  assert(stats.total >= 1 && stats.pending >= 1, '9. Calculate Dashboard Statistics for Employee');

  // 10. Admin Search by Employee ID
  const searchResults = await db.getApplications({ search: 'EMP101' });
  assert(searchResults.length >= 1, '10. Search Applications by Employee ID');

  // 11. Approve Leave Application
  const approved = await db.updateStatus(newLeave.application_id, 'Approved');
  assert(approved && approved.status === 'Approved', `11. Approve Application #${newLeave.application_id}`);

  // 12. Reject Leave Application
  const rejected = await db.updateStatus(newLeave.application_id, 'Rejected');
  assert(rejected && rejected.status === 'Rejected', `12. Reject Application #${newLeave.application_id}`);

  // 13. Delete Leave Application
  const deleted = await db.deleteApplication(newLeave.application_id);
  assert(deleted === true, `13. Delete Application #${newLeave.application_id}`);

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');
}

testAll();
