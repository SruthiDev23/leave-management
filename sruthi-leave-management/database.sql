-- ====================================================================
-- Sruthi Leave Management System - MySQL Database Setup Script
-- Database Name: sruthi_leave_management
--
-- Instructions:
-- 1. Open MySQL Workbench.
-- 2. Connect to your Local MySQL Server instance.
-- 3. Open this file (File -> Open SQL Script...) or copy-paste its content.
-- 4. Click the Execute button (Lightning bolt icon) to run the script.
-- ====================================================================

-- Step 1: Create Database
CREATE DATABASE IF NOT EXISTS sruthi_leave_management;
USE sruthi_leave_management;

-- Step 2: Drop existing tables if re-initializing (Order matters for Foreign Keys)
DROP TABLE IF EXISTS leave_applications;
DROP TABLE IF EXISTS users;

-- Step 3: Create Users Table (for Admin and Employee authentication)
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

-- Step 4: Create Leave Applications Table
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

-- Step 5: Insert Initial Users with Seed Credentials
-- Default passwords:
-- Admin:    admin123  (Username/EmpID: ADM001, Email: admin@sruthi.com)
-- Employee: emp123    (Username/EmpID: EMP101, Email: rahul@sruthi.com)
-- Employee: emp123    (Username/EmpID: EMP102, Email: priya@sruthi.com)
-- Employee: emp123    (Username/EmpID: EMP103, Email: suresh@sruthi.com)

INSERT INTO users (employee_id, name, email, password, role, department) VALUES
('ADM001', 'Admin Sruthi', 'admin@sruthi.com', 'pbkdf2$sha512$100000$d56ee4848a86d63fcfdeebc10210aef7$32d6d1234fb478007200eab23ed79be91a2b777051b4ed6d8d5a3666e7408543fc5f07db98404e5d71c52fc5d2bbf6def6e33c7cc54395889f519f267ba729fa', 'admin', 'Administration'),
('EMP101', 'Rahul Sharma', 'rahul@sruthi.com', 'pbkdf2$sha512$100000$ce906c0ce841260e3cf1d2a57ba17d67$31e00741f857f5d056ee59233471aaa1dad7cc0fb5cac8357a2aa34bd105d71e996d07a8bc5949e63fbe760e0b2928f8f3b7f7157b0a81fe79c545ca24f586c8', 'employee', 'Engineering'),
('EMP102', 'Priya Patel', 'priya@sruthi.com', 'pbkdf2$sha512$100000$ce906c0ce841260e3cf1d2a57ba17d67$31e00741f857f5d056ee59233471aaa1dad7cc0fb5cac8357a2aa34bd105d71e996d07a8bc5949e63fbe760e0b2928f8f3b7f7157b0a81fe79c545ca24f586c8', 'employee', 'Design'),
('EMP103', 'Suresh Kumar', 'suresh@sruthi.com', 'pbkdf2$sha512$100000$ce906c0ce841260e3cf1d2a57ba17d67$31e00741f857f5d056ee59233471aaa1dad7cc0fb5cac8357a2aa34bd105d71e996d07a8bc5949e63fbe760e0b2928f8f3b7f7157b0a81fe79c545ca24f586c8', 'employee', 'Marketing')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Step 6: Insert Sample Leave Applications for Initial Testing
INSERT INTO leave_applications (employee_id, employee_name, leave_type, number_of_days, description, application_date, status) VALUES
('EMP101', 'Rahul Sharma', 'Casual', 2, 'Attending family wedding ceremony in hometown.', '2026-11-01', 'Approved'),
('EMP102', 'Priya Patel', 'Professional', 3, 'Attending Node.js and Modern Web Architecture Conference.', '2026-11-04', 'Pending'),
('EMP103', 'Suresh Kumar', 'Casual', 1, 'Urgent personal banking and documentation work.', '2026-11-05', 'Rejected'),
('EMP101', 'Rahul Sharma', 'Professional', 4, 'Attending Cloud DevOps certification training workshop.', '2026-11-06', 'Pending');

-- Step 7: Verify Tables and Data
SELECT 'Users Table:' AS Result;
SELECT id, employee_id, name, email, role, department, created_at FROM users;

SELECT 'Leave Applications Table:' AS Result;
SELECT * FROM leave_applications;
