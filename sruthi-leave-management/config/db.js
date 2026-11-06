require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const security = require('../utils/security');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'leave_applications.json');

// Ensure data folder and fallback seed files exist
function initFallbackStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    const seedUsers = [
      {
        id: 1,
        employee_id: 'ADM001',
        name: 'Admin Sruthi',
        email: 'admin@sruthi.com',
        password: security.hashPassword('admin123'),
        role: 'admin',
        department: 'Administration',
        created_at: new Date('2026-10-01').toISOString()
      },
      {
        id: 2,
        employee_id: 'EMP101',
        name: 'Rahul Sharma',
        email: 'rahul@sruthi.com',
        password: security.hashPassword('emp123'),
        role: 'employee',
        department: 'Engineering',
        created_at: new Date('2026-10-05').toISOString()
      },
      {
        id: 3,
        employee_id: 'EMP102',
        name: 'Priya Patel',
        email: 'priya@sruthi.com',
        password: security.hashPassword('emp123'),
        role: 'employee',
        department: 'Design',
        created_at: new Date('2026-10-10').toISOString()
      },
      {
        id: 4,
        employee_id: 'EMP103',
        name: 'Suresh Kumar',
        email: 'suresh@sruthi.com',
        password: security.hashPassword('emp123'),
        role: 'employee',
        department: 'Marketing',
        created_at: new Date('2026-10-15').toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(seedUsers, null, 2), 'utf-8');
  }

  if (!fs.existsSync(APPLICATIONS_FILE)) {
    const seedApplications = [
      {
        application_id: 1,
        employee_id: 'EMP101',
        employee_name: 'Rahul Sharma',
        leave_type: 'Casual',
        number_of_days: 2,
        description: 'Attending family wedding ceremony in hometown.',
        application_date: '2026-11-01',
        status: 'Approved',
        created_at: new Date('2026-11-01T09:30:00Z').toISOString()
      },
      {
        application_id: 2,
        employee_id: 'EMP102',
        employee_name: 'Priya Patel',
        leave_type: 'Professional',
        number_of_days: 3,
        description: 'Attending Node.js and Modern Web Architecture Conference.',
        application_date: '2026-11-04',
        status: 'Pending',
        created_at: new Date('2026-11-04T11:15:00Z').toISOString()
      },
      {
        application_id: 3,
        employee_id: 'EMP103',
        employee_name: 'Suresh Kumar',
        leave_type: 'Casual',
        number_of_days: 1,
        description: 'Urgent personal banking and documentation work.',
        application_date: '2026-11-05',
        status: 'Rejected',
        created_at: new Date('2026-11-05T14:00:00Z').toISOString()
      },
      {
        application_id: 4,
        employee_id: 'EMP101',
        employee_name: 'Rahul Sharma',
        leave_type: 'Professional',
        number_of_days: 4,
        description: 'Attending Cloud DevOps certification training workshop.',
        application_date: '2026-11-06',
        status: 'Pending',
        created_at: new Date('2026-11-06T10:00:00Z').toISOString()
      }
    ];
    fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(seedApplications, null, 2), 'utf-8');
  }
}

initFallbackStorage();

let pool = null;
let isConnected = false;
let dbErrorMsg = '';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'sruthi_leave_management',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Try connecting to MySQL
async function initDatabase() {
  try {
    // 1. First test connection without database to see if MySQL is alive
    const tempConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      port: DB_CONFIG.port
    });

    // Create database if it does not exist
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\``);
    await tempConn.end();

    // 2. Now establish connection pool with the database
    pool = mysql.createPool(DB_CONFIG);

    // Verify pool
    const conn = await pool.getConnection();
    await conn.ping();

    // 3. Ensure tables exist
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('employee', 'admin') NOT NULL DEFAULT 'employee',
        department VARCHAR(50) DEFAULT 'General',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS leave_applications (
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        employee_name VARCHAR(100) NOT NULL,
        leave_type ENUM('Casual', 'Professional') NOT NULL,
        number_of_days INT NOT NULL,
        description TEXT NOT NULL,
        application_date DATE NOT NULL,
        status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) 
          REFERENCES users(employee_id) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Check if default admin exists; if not, seed default admin & sample users
    const [existingUsers] = await conn.query('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0].count === 0) {
      console.log('[DB] Seeding initial users into MySQL...');
      const adminPass = security.hashPassword('admin123');
      const empPass = security.hashPassword('emp123');

      await conn.query(`
        INSERT INTO users (employee_id, name, email, password, role, department) VALUES
        ('ADM001', 'Admin Sruthi', 'admin@sruthi.com', ?, 'admin', 'Administration'),
        ('EMP101', 'Rahul Sharma', 'rahul@sruthi.com', ?, 'employee', 'Engineering'),
        ('EMP102', 'Priya Patel', 'priya@sruthi.com', ?, 'employee', 'Design'),
        ('EMP103', 'Suresh Kumar', 'suresh@sruthi.com', ?, 'employee', 'Marketing')
      `, [adminPass, empPass, empPass, empPass]);

      await conn.query(`
        INSERT INTO leave_applications (employee_id, employee_name, leave_type, number_of_days, description, application_date, status) VALUES
        ('EMP101', 'Rahul Sharma', 'Casual', 2, 'Attending family wedding ceremony in hometown.', '2026-11-01', 'Approved'),
        ('EMP102', 'Priya Patel', 'Professional', 3, 'Attending Node.js and Modern Web Architecture Conference.', '2026-11-04', 'Pending'),
        ('EMP103', 'Suresh Kumar', 'Casual', 1, 'Urgent personal banking and documentation work.', '2026-11-05', 'Rejected'),
        ('EMP101', 'Rahul Sharma', 'Professional', 4, 'Attending Cloud DevOps certification training workshop.', '2026-11-06', 'Pending')
      `);
      console.log('[DB] Seed data successfully populated in MySQL!');
    }

    conn.release();
    isConnected = true;
    dbErrorMsg = '';
    console.log(`[DB] SUCCESS: Connected to MySQL database "${DB_CONFIG.database}" on ${DB_CONFIG.host}:${DB_CONFIG.port}`);
  } catch (err) {
    isConnected = false;
    dbErrorMsg = err.message;
    console.warn(`[DB] MySQL Notice: Could not connect to MySQL Server (${err.message})`);
    console.warn('[DB] Using local JSON fallback storage. Run database.sql in MySQL Workbench and check .env to use MySQL.');
  }
}

// Initial connection attempt
initDatabase();

// JSON Storage helpers
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// Database Abstraction API
const db = {
  getStatus: () => ({
    connected: isConnected,
    type: isConnected ? 'MySQL Database' : 'Local Fallback Storage',
    database: DB_CONFIG.database,
    host: DB_CONFIG.host,
    user: DB_CONFIG.user,
    port: DB_CONFIG.port,
    message: isConnected ? 'Connected to MySQL Workbench successfully' : dbErrorMsg
  }),

  // Re-check MySQL connection
  reconnect: async () => {
    await initDatabase();
    return db.getStatus();
  },

  // Find user by employee_id or email
  findUserByIdentifier: async (identifier) => {
    if (isConnected) {
      try {
        const [rows] = await pool.query(
          'SELECT * FROM users WHERE employee_id = ? OR email = ? LIMIT 1',
          [identifier, identifier]
        );
        return rows[0] || null;
      } catch (err) {
        console.error('MySQL findUser error, using fallback:', err.message);
      }
    }
    const users = readJson(USERS_FILE);
    const idLower = String(identifier).toLowerCase().trim();
    return users.find(u => 
      u.employee_id.toLowerCase() === idLower || 
      u.email.toLowerCase() === idLower
    ) || null;
  },

  // Create new user (Registration)
  createUser: async (userData) => {
    const { employee_id, name, email, password, role = 'employee', department = 'General' } = userData;
    const hashedPassword = security.hashPassword(password);

    if (isConnected) {
      try {
        const [result] = await pool.query(
          'INSERT INTO users (employee_id, name, email, password, role, department) VALUES (?, ?, ?, ?, ?, ?)',
          [employee_id, name, email, hashedPassword, role, department]
        );
        return {
          id: result.insertId,
          employee_id,
          name,
          email,
          role,
          department
        };
      } catch (err) {
        console.error('MySQL createUser error:', err.message);
        throw err;
      }
    }

    const users = readJson(USERS_FILE);
    // Check duplicates
    if (users.some(u => u.employee_id.toLowerCase() === employee_id.toLowerCase())) {
      const err = new Error('Employee ID already registered');
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      const err = new Error('Email already registered');
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }

    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id || 0)) + 1 : 1,
      employee_id,
      name,
      email,
      password: hashedPassword,
      role,
      department,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    writeJson(USERS_FILE, users);
    return {
      id: newUser.id,
      employee_id: newUser.employee_id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department
    };
  },

  // Get all applications with optional filters (for Admin or Employee)
  getApplications: async ({ employee_id, status, search } = {}) => {
    if (isConnected) {
      try {
        let query = 'SELECT * FROM leave_applications WHERE 1=1';
        const params = [];

        if (employee_id) {
          query += ' AND employee_id = ?';
          params.push(employee_id);
        }

        if (status && status !== 'All') {
          query += ' AND status = ?';
          params.push(status);
        }

        if (search) {
          query += ' AND (employee_id LIKE ? OR employee_name LIKE ? OR leave_type LIKE ? OR description LIKE ?)';
          const term = `%${search}%`;
          params.push(term, term, term, term);
        }

        query += ' ORDER BY application_id DESC';
        const [rows] = await pool.query(query, params);
        return rows;
      } catch (err) {
        console.error('MySQL getApplications error, using fallback:', err.message);
      }
    }

    let apps = readJson(APPLICATIONS_FILE);
    if (employee_id) {
      apps = apps.filter(a => a.employee_id.toLowerCase() === employee_id.toLowerCase());
    }
    if (status && status !== 'All') {
      apps = apps.filter(a => a.status.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const s = search.toLowerCase();
      apps = apps.filter(a => 
        (a.employee_id && a.employee_id.toLowerCase().includes(s)) ||
        (a.employee_name && a.employee_name.toLowerCase().includes(s)) ||
        (a.leave_type && a.leave_type.toLowerCase().includes(s)) ||
        (a.description && a.description.toLowerCase().includes(s))
      );
    }
    return apps.sort((a, b) => b.application_id - a.application_id);
  },

  // Create new leave application
  createApplication: async (appData) => {
    const {
      employee_id,
      employee_name,
      leave_type,
      number_of_days,
      description,
      application_date
    } = appData;

    const formattedDate = application_date || new Date().toISOString().split('T')[0];

    if (isConnected) {
      try {
        const [result] = await pool.query(
          `INSERT INTO leave_applications 
           (employee_id, employee_name, leave_type, number_of_days, description, application_date, status) 
           VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
          [employee_id, employee_name, leave_type, number_of_days, description, formattedDate]
        );
        const [rows] = await pool.query('SELECT * FROM leave_applications WHERE application_id = ?', [result.insertId]);
        return rows[0];
      } catch (err) {
        console.error('MySQL createApplication error, using fallback:', err.message);
      }
    }

    const apps = readJson(APPLICATIONS_FILE);
    const newId = apps.length > 0 ? Math.max(...apps.map(a => a.application_id || 0)) + 1 : 1;
    const newApp = {
      application_id: newId,
      employee_id,
      employee_name,
      leave_type,
      number_of_days: parseInt(number_of_days, 10),
      description,
      application_date: formattedDate,
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    apps.unshift(newApp);
    writeJson(APPLICATIONS_FILE, apps);
    return newApp;
  },

  // Update application status (Approve / Reject)
  updateStatus: async (application_id, status) => {
    if (isConnected) {
      try {
        await pool.query(
          'UPDATE leave_applications SET status = ? WHERE application_id = ?',
          [status, application_id]
        );
        const [rows] = await pool.query(
          'SELECT * FROM leave_applications WHERE application_id = ?',
          [application_id]
        );
        return rows[0] || null;
      } catch (err) {
        console.error('MySQL updateStatus error, using fallback:', err.message);
      }
    }

    const apps = readJson(APPLICATIONS_FILE);
    const app = apps.find(a => a.application_id == application_id);
    if (app) {
      app.status = status;
      app.updated_at = new Date().toISOString();
      writeJson(APPLICATIONS_FILE, apps);
    }
    return app || null;
  },

  // Delete leave application
  deleteApplication: async (application_id) => {
    if (isConnected) {
      try {
        const [result] = await pool.query(
          'DELETE FROM leave_applications WHERE application_id = ?',
          [application_id]
        );
        return result.affectedRows > 0;
      } catch (err) {
        console.error('MySQL deleteApplication error, using fallback:', err.message);
      }
    }

    const apps = readJson(APPLICATIONS_FILE);
    const initialLen = apps.length;
    const filtered = apps.filter(a => a.application_id != application_id);
    writeJson(APPLICATIONS_FILE, filtered);
    return filtered.length < initialLen;
  },

  // Calculate Dashboard Statistics
  getStats: async (employee_id = null) => {
    if (isConnected) {
      try {
        let sql = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected
          FROM leave_applications
        `;
        const params = [];
        if (employee_id) {
          sql += ' WHERE employee_id = ?';
          params.push(employee_id);
        }
        const [rows] = await pool.query(sql, params);
        return {
          total: Number(rows[0].total) || 0,
          pending: Number(rows[0].pending) || 0,
          approved: Number(rows[0].approved) || 0,
          rejected: Number(rows[0].rejected) || 0
        };
      } catch (err) {
        console.error('MySQL getStats error, using fallback:', err.message);
      }
    }

    let apps = readJson(APPLICATIONS_FILE);
    if (employee_id) {
      apps = apps.filter(a => a.employee_id.toLowerCase() === employee_id.toLowerCase());
    }

    return {
      total: apps.length,
      pending: apps.filter(a => a.status === 'Pending').length,
      approved: apps.filter(a => a.status === 'Approved').length,
      rejected: apps.filter(a => a.status === 'Rejected').length
    };
  }
};

module.exports = db;
