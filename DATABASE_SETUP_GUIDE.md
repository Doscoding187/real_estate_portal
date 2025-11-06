# Database Management Setup Guide

## 🎯 Quick Start: Docker + Database Management

### **Option 1: Docker Setup (Recommended - Easiest)**

#### Step 1: Install Docker Desktop
- Download Docker Desktop from https://www.docker.com/products/docker-desktop/
- Install and start Docker Desktop

#### Step 2: Start Database Services
```bash
# Start all services
docker-compose up -d

# Check if containers are running
docker-compose ps
```

#### Step 3: Access Database Management Tools

**Using Adminer (Recommended):**
- Open: http://localhost:8080
- System: MySQL
- Server: mysql
- Username: root
- Password: admin123
- Database: real_estate_portal

**Using PHPMyAdmin (Alternative):**
- Open: http://localhost:8081
- Username: root
- Password: admin123

**Using SQL Workbench:**
- Connection: MySQL
- Host: localhost
- Port: 3306
- Username: root
- Password: admin123
- Database: real_estate_portal

#### Step 4: Run Migrations
```bash
# Copy migration files to proper location
cp migrations/create-user-preferences-table.sql docker-entrypoint-initdb.d/

# Restart containers to run migrations
docker-compose restart mysql
```

---

### **Option 2: Local MySQL Installation**

If you prefer not to use Docker:

#### Windows Installation:
1. Download MySQL from https://dev.mysql.com/downloads/mysql/
2. Install with MySQL Workbench included
3. Start MySQL service
4. Connect using Workbench with:
   - Host: localhost
   - Port: 3306
   - User: root
   - Password: (your choice)

#### Linux/macOS:
```bash
# Ubuntu/Debian
sudo apt install mysql-server mysql-workbench

# macOS with Homebrew
brew install mysql mysql-workbench

# Start MySQL
sudo systemctl start mysql
```

---

### **Option 3: Database-as-a-Service (Cloud)**

#### PlanetScale (Free Tier):
1. Sign up at https://planetscale.com
2. Create database
3. Connect via Workbench or web interface
4. No local setup required!

#### MongoDB Atlas (for alternative):
1. Sign up at https://www.mongodb.com/atlas
2. Create cluster
3. Connect via connection string

---

## 🔧 Migration Management Workflow

### **Using SQL Workbench:**
1. Open SQL Workbench
2. Connect to your database
3. Open migration file (e.g., `create-user-preferences-table.sql`)
4. Execute the SQL statements
5. Verify table creation

### **Using Adminer/PHPMyAdmin:**
1. Open web interface
2. Click "SQL" tab
3. Paste migration SQL
4. Click "Execute"

### **Using Command Line (if MySQL CLI available):**
```bash
mysql -u root -p real_estate_portal < migrations/create-user-preferences-table.sql
```

---

## 🗂️ Recommended Folder Structure

```
real_estate_portal/
├── migrations/
│   ├── create-base-schema.sql
│   ├── create-user-preferences-table.sql
│   └── ...
├── docker-compose.yml
└── DATABASE_SETUP_GUIDE.md (this file)
```

---

## 🚀 Development Workflow

### **Daily Usage:**
1. Start database: `docker-compose up -d`
2. Open Adminer: http://localhost:8080
3. Run migrations as needed
4. Stop when done: `docker-compose down`

### **Team Development:**
1. Ensure all team members use same Docker setup
2. Share migration files in git
3. Document schema changes

---

## 🛠️ Troubleshooting

### **Docker Issues:**
```bash
# Reset containers
docker-compose down -v
docker-compose up -d

# Check logs
docker-compose logs mysql
```

### **MySQL Connection Issues:**
- Check if port 3306 is available
- Verify credentials
- Check firewall settings

### **Permission Issues:**
- Run with administrator privileges on Windows
- Check MySQL user permissions

---

## 📊 Database Management Best Practices

### **Naming Conventions:**
- Tables: snake_case (user_preferences)
- Columns: snake_case (preferred_price_min)
- Indexes: idx_table_column (idx_user_preferences_userId)

### **Migration Guidelines:**
1. Always backup before running migrations
2. Test migrations on development database first
3. Include rollback scripts when possible
4. Document changes in migration comments

### **Security:**
- Use strong passwords
- Limit database access to localhost in development
- Never commit credentials to git

---

## 🎉 Quick Commands Reference

```bash
# Start database services
docker-compose up -d

# Stop database services
docker-compose down

# View logs
docker-compose logs -f mysql

# Reset database (WARNING: Deletes all data)
docker-compose down -v
docker-compose up -d

# Backup database
docker-compose exec mysql mysqldump -u root -padmin123 real_estate_portal > backup.sql

# Restore database
docker-compose exec -T mysql -u root -padmin123 real_estate_portal < backup.sql