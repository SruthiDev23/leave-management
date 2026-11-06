# Sruthi Leave Management System

A modern, responsive, and secure **Leave Management System** built with **HTML5, CSS3, JavaScript**, **Node.js & Express.js**, and **MySQL** (managed using MySQL Workbench).

---

## 📋 Features

### 🎨 1. Modern Design & User Interface
- **Theme:** White & Light Blue color palette (`#f0f7ff`, `#e0f2fe`, `#0284c7`) with dark corporate blue headings (`#0f2744`).
- **Responsive Layout:** Optimized for desktops, laptops, tablets, and smartphones.
- **Visual Feedback:** Interactive stat cards, status badges, toast notifications, animated alerts, and confirmation modals.

### 🔐 2. Role-Based Login & Security
- **Employee Login:** Portal for staff to apply for leaves and view application histories.
- **Admin Login:** Dedicated console for HR and team leads to approve, reject, or delete leave requests.
- **Registration:** New employees can sign up directly.
- **Security:** Password encryption (PBKDF2 / Bcrypt) and JWT session tokens.

### 👨‍💼 3. Employee Dashboard
- **Live Summary Cards:** Total Applications, Pending Applications, Approved Applications, and Rejected Applications.
- **Standard Leave Application Form:**
  1. **Employee ID** (auto-detected from session)
  2. **Employee Name** (auto-detected from session)
  3. **Leave Type** (Dropdown: *Casual*, *Professional*)
  4. **Number of Days**
  5. **Description (Reason for leave)**
- **Submit Leave Button:** Validates input, saves record to MySQL, and displays an instant success alert.
- **Application History Table:** Real-time view with filter pills (*All, Pending, Approved, Rejected*).

### 🛡️ 4. Administrator Dashboard
- **All Applications Table:** Complete view of company-wide leave requests.
- **Search:** Search applications instantly using **Employee ID**, Name, or Reason.
- **Status Filters:** View Pending, Approved, or Rejected applications.
- **One-Click Actions:**
  - ✅ **Approve:** Updates application status to *Approved*.
  - ❌ **Reject:** Updates application status to *Rejected*.
  - 🗑️ **Delete:** Permanently removes records after confirmation.
- **Admin Statistics:** Live count of Total, Pending, Approved, and Rejected requests.

---

## 🗂️ Project Folder Structure

```
sruthi-leave-management/
├── .env                       # Database credentials & port configuration
├── .env.example               # Template environment variables
├── package.json               # Node.js dependencies & scripts
├── database.sql               # MySQL database script for MySQL Workbench
├── server.js                  # Main Express server entry point
├── config/
│   └── db.js                  # MySQL2 database connection pool & queries
├── routes/
│   ├── authRoutes.js          # Authentication API (login, register, status)
│   └── leaveRoutes.js         # Leave management API (apply, list, update, delete)
├── middleware/
│   └── authMiddleware.js      # JWT authentication & role-protection middleware
├── utils/
│   └── security.js            # Password hashing & JWT token generator
├── public/
│   ├── index.html             # Landing page / Portal selector
│   ├── employee-login.html    # Employee Login portal
│   ├── admin-login.html       # Administrator Login portal
│   ├── register.html          # New Employee registration
│   ├── employee-dashboard.html# Employee dashboard & application form
│   ├── admin-dashboard.html   # Admin console with approvals & search
│   ├── css/
│   │   └── style.css          # White & Light Blue styling & animations
│   └── js/
│       ├── auth.js            # Authentication & session utilities
│       ├── employee.js        # Form validation, submission & employee stats
│       └── admin.js           # Admin search, filter, approve/reject/delete logic
└── test_in_process.js         # Automated test script
```

---

## 🔑 Initial Demo Credentials

| Role | Employee ID | Email | Password | Access Portal |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `ADM001` | `admin@sruthi.com` | `admin123` | `/admin-login.html` |
| **Employee** | `EMP101` | `rahul@sruthi.com` | `emp123` | `/employee-login.html` |
| **Employee** | `EMP102` | `priya@sruthi.com` | `emp123` | `/employee-login.html` |
| **Employee** | `EMP103` | `suresh@sruthi.com` | `emp123` | `/employee-login.html` |

*(You can also use the **"Autofill"** button on the login pages for quick 1-click testing!)*

---

## ⚙️ Step-by-Step Execution Guide (in VS Code)

### Step 1: Open the Project in Visual Studio Code
1. Launch **Visual Studio Code**.
2. Click **File** ➔ **Open Folder...**
3. Select the folder:
   `C:\Users\P.Sruthi\.gemini\antigravity\scratch\sruthi-leave-management`

---

### Step 2: Set up the MySQL Database in MySQL Workbench
1. Open **MySQL Workbench**.
2. Connect to your local MySQL instance (usually `localhost:3306` with user `root`).
3. Click **File** ➔ **Open SQL Script...**
4. Select `database.sql` from the project folder.
5. Click the ⚡ **Execute** (lightning bolt) icon to run the entire script.
6. Refresh the schemas list in MySQL Workbench; you will see the database:
   - **`sruthi_leave_management`**
     - Table: `users`
     - Table: `leave_applications`

---

### Step 3: Configure Database Credentials in `.env`
Open the `.env` file in VS Code and verify your MySQL password:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=sruthi_leave_management
JWT_SECRET=sruthi_leave_management_secret_key_2026
```
*(If your MySQL Workbench root user password is `root` or `admin`, update `DB_PASSWORD` accordingly).*

---

### Step 4: Run the Application
1. In VS Code, open an integrated terminal:
   Press <kbd>Ctrl</kbd> + <kbd>`</kbd> (or go to **Terminal** ➔ **New Terminal**).
2. Start the server:
   ```bash
   node server.js
   ```
   *(Or run `npm start`)*
3. You will see:
   ```
   =============================================================
      SRUTHI LEAVE MANAGEMENT SYSTEM - SERVER STARTED
   =============================================================
    > Application URL:     http://localhost:3000
    > Employee Login:      http://localhost:3000/employee-login.html
    > Admin Login:         http://localhost:3000/admin-login.html
    > Employee Register:   http://localhost:3000/register.html
    > Database Target:     MySQL ("sruthi_leave_management")
   =============================================================
   ```

---

### Step 5: Test the System in your Browser
- Open `http://localhost:3000` to access the portal home page.
- Log in as **Employee** (`EMP101` / `emp123`) to submit a **Casual** or **Professional** leave application.
- Log in as **Admin** (`ADM001` / `admin123`) to view all requests, search by Employee ID, and **Approve**, **Reject**, or **Delete** applications.
