/**
 * Comprehensive Automated Test Suite for Sruthi Leave Management System
 */
const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   STARTING SRUTHI LEAVE MANAGEMENT SYSTEM TEST SUITE  ');
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

  try {
    // 1. Healthcheck
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'healthy', '1. System Healthcheck API');

    // 2. Employee Login
    const empLogin = await request('POST', '/api/auth/login', {
      identifier: 'EMP101',
      password: 'emp123',
      expectedRole: 'employee'
    });
    assert(empLogin.status === 200 && empLogin.data.success && empLogin.data.token, '2. Employee Login (EMP101)');
    const empToken = empLogin.data ? empLogin.data.token : null;

    // 3. Admin Login
    const adminLogin = await request('POST', '/api/auth/login', {
      identifier: 'ADM001',
      password: 'admin123',
      expectedRole: 'admin'
    });
    assert(adminLogin.status === 200 && adminLogin.data.success && adminLogin.data.token, '3. Admin Login (ADM001)');
    const adminToken = adminLogin.data ? adminLogin.data.token : null;

    // 4. Employee Registration
    const testEmpId = 'EMP' + Math.floor(1000 + Math.random() * 9000);
    const regRes = await request('POST', '/api/auth/register', {
      employee_id: testEmpId,
      name: 'Test Employee Automated',
      email: `${testEmpId.toLowerCase()}@sruthi.com`,
      password: 'testpassword123',
      department: 'Quality Assurance'
    });
    assert(regRes.status === 201 && regRes.data.success, `4. New Employee Registration (${testEmpId})`);

    // 5. Submit Leave Application (Casual)
    const applyRes = await request('POST', '/api/leaves/apply', {
      employee_id: 'EMP101',
      employee_name: 'Rahul Sharma',
      leave_type: 'Casual',
      number_of_days: 2,
      description: 'Automated test casual leave application'
    }, empToken);
    assert(applyRes.status === 201 && applyRes.data.success && applyRes.data.application, '5. Submit Leave Application (Casual, 2 days)');
    const newAppId = applyRes.data && applyRes.data.application ? applyRes.data.application.application_id : null;

    // 6. View My Leaves (Employee)
    const myLeaves = await request('GET', '/api/leaves/my', null, empToken);
    assert(myLeaves.status === 200 && Array.isArray(myLeaves.data.applications) && myLeaves.data.stats.total >= 1, '6. View Employee Leave History & Stats');

    // 7. View All Leaves (Admin)
    const allLeaves = await request('GET', '/api/leaves/all', null, adminToken);
    assert(allLeaves.status === 200 && Array.isArray(allLeaves.data.applications), '7. Admin View All Leave Applications');

    // 8. Search / Filter by Employee ID
    const searchRes = await request('GET', '/api/leaves/all?search=EMP101', null, adminToken);
    assert(searchRes.status === 200 && searchRes.data.applications.every(a => a.employee_id.includes('EMP101')), '8. Admin Search by Employee ID');

    // 9. Approve Leave Application
    if (newAppId) {
      const approveRes = await request('PUT', `/api/leaves/${newAppId}/status`, { status: 'Approved' }, adminToken);
      assert(approveRes.status === 200 && approveRes.data.success && approveRes.data.application.status === 'Approved', `9. Admin Approve Application #${newAppId}`);

      // 10. Reject Leave Application
      const rejectRes = await request('PUT', `/api/leaves/${newAppId}/status`, { status: 'Rejected' }, adminToken);
      assert(rejectRes.status === 200 && rejectRes.data.success && rejectRes.data.application.status === 'Rejected', `10. Admin Reject Application #${newAppId}`);

      // 11. Delete Leave Application
      const deleteRes = await request('DELETE', `/api/leaves/${newAppId}`, null, adminToken);
      assert(deleteRes.status === 200 && deleteRes.data.success, `11. Admin Delete Application #${newAppId}`);
    }

    console.log('\n======================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

// Allow server to be already running or auto-started
const server = http.get(BASE_URL + '/api/health', (res) => {
  runTests();
}).on('error', () => {
  console.log('Server not currently running on port ' + PORT + ', starting server for test run...');
  const appModule = require('./server');
  setTimeout(runTests, 1000);
});
