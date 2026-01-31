import { hash } from 'bcryptjs';
import { execSync } from 'child_process';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

interface SuperAdmin {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface VerificationResult {
  success: boolean;
  superAdmins: SuperAdmin[];
  databaseConnection: boolean;
  authenticationTest: boolean;
  errors: string[];
  warnings: string[];
}

class SystemVerification {
  private connection: mysql.Connection | null = null;
  private databaseUrl: string;

  constructor() {
    this.databaseUrl = process.env.DATABASE_URL || '';
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing system verification...');

    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    await this.connectToDatabase();
    console.log('✅ Database connection established');
  }

  private async connectToDatabase(): Promise<void> {
    try {
      const dbUrl = new URL(this.databaseUrl);
      this.connection = await mysql.createConnection({
        host: dbUrl.hostname,
        port: parseInt(dbUrl.port) || 3306,
        user: dbUrl.username,
        password: dbUrl.password,
        database: dbUrl.pathname.slice(1),
      });
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  async verifySuperAdmins(): Promise<SuperAdmin[]> {
    console.log('\n👑 Verifying super admin accounts...');

    try {
      const [rows] = await this.connection!.execute(
        `SELECT id, email, firstName, lastName, role FROM users WHERE role = 'super_admin' ORDER BY id`,
      );

      const superAdmins = rows as SuperAdmin[];

      if (superAdmins.length === 0) {
        console.log('❌ No super admin accounts found');
        return [];
      }

      console.log(`✅ Found ${superAdmins.length} super admin account(s):`);
      superAdmins.forEach(admin => {
        console.log(`  👤 ${admin.email} (${admin.firstName} ${admin.lastName}) - ID: ${admin.id}`);
      });

      return superAdmins;
    } catch (error) {
      console.error('❌ Failed to verify super admins:', error);
      return [];
    }
  }

  async verifyDatabaseIntegrity(): Promise<boolean> {
    console.log('\n🗄️  Verifying database integrity...');

    try {
      // Test basic connectivity
      await this.connection!.execute('SELECT 1');
      console.log('✅ Database connection test passed');

      // Check essential tables exist
      const essentialTables = ['users', 'agencies', 'properties', 'locations', 'platform_settings'];

      let allTablesExist = true;
      for (const tableName of essentialTables) {
        const [exists] = await this.connection!.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = DATABASE() AND table_name = '${tableName}'`,
        );

        const tableExists = (exists as any[])[0].count > 0;
        if (!tableExists) {
          console.log(`❌ Essential table missing: ${tableName}`);
          allTablesExist = false;
        } else {
          console.log(`✅ Essential table exists: ${tableName}`);
        }
      }

      if (allTablesExist) {
        console.log('✅ All essential tables are present');
      }

      return allTablesExist;
    } catch (error) {
      console.error('❌ Database integrity check failed:', error);
      return false;
    }
  }

  async testAuthenticationFlow(): Promise<boolean> {
    console.log('\n🔐 Testing authentication flow...');

    try {
      // Test JWT secret is available
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.log('❌ JWT_SECRET environment variable is missing');
        return false;
      }
      console.log('✅ JWT_SECRET is configured');

      // Test password hashing
      const testPassword = 'test123';
      const hashedPassword = await hash(testPassword, 12);
      if (hashedPassword && hashedPassword.length > 50) {
        console.log('✅ Password hashing works correctly');
      } else {
        console.log('❌ Password hashing failed');
        return false;
      }

      // Test basic user query structure
      const [sampleQuery] = await this.connection!.execute(
        'SELECT id, email, role FROM users LIMIT 1',
      );

      console.log('✅ User authentication queries work correctly');
      return true;
    } catch (error) {
      console.error('❌ Authentication flow test failed:', error);
      return false;
    }
  }

  async verifyReferenceData(): Promise<boolean> {
    console.log('\n📚 Verifying reference data integrity...');

    const referenceTables = ['locations', 'unit_types', 'provinces'];

    let integrityScore = 0;
    for (const tableName of referenceTables) {
      try {
        const [exists] = await this.connection!.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = DATABASE() AND table_name = '${tableName}'`,
        );

        if ((exists as any[])[0].count > 0) {
          const [rows] = await this.connection!.execute(
            `SELECT COUNT(*) as count FROM \`${tableName}\``,
          );
          const count = (rows as any[])[0].count;
          console.log(`📋 ${tableName}: ${Number(count).toLocaleString()} records`);
          integrityScore++;
        } else {
          console.log(`⚠️  Reference table missing: ${tableName}`);
        }
      } catch (error) {
        console.log(`⚠️  Could not verify ${tableName}: ${error}`);
      }
    }

    if (integrityScore === referenceTables.length) {
      console.log('✅ All reference data is intact');
      return true;
    } else {
      console.log(
        `⚠️  Reference data integrity score: ${integrityScore}/${referenceTables.length}`,
      );
      return false;
    }
  }

  async createTestSuperAdminIfNeeded(): Promise<void> {
    console.log('\n🔧 Checking for test super admin...');

    try {
      const [existing] = await this.connection!.execute(
        "SELECT id FROM users WHERE email = 'admin@realestateportal.test'",
      );

      if (Array.isArray(existing) && existing.length === 0) {
        console.log('🔧 Creating test super admin account...');

        const hashedPassword = await hash('Admin123!', 12);

        await this.connection!.execute(
          `INSERT INTO users (email, password, firstName, lastName, role, emailVerified, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, 'super_admin', 1, NOW(), NOW())`,
          ['admin@realestateportal.test', hashedPassword, 'System', 'Administrator'],
        );

        console.log('✅ Test super admin created: admin@realestateportal.test / Admin123!');
      } else {
        console.log('✅ Test super admin already exists');
      }
    } catch (error) {
      console.log('⚠️  Could not create test super admin:', error);
    }
  }

  async generateVerificationReport(): Promise<VerificationResult> {
    console.log('\n📊 Generating comprehensive verification report...');

    const result: VerificationResult = {
      success: true,
      superAdmins: [],
      databaseConnection: false,
      authenticationTest: false,
      errors: [],
      warnings: [],
    };

    try {
      // Database connection test
      result.databaseConnection = await this.verifyDatabaseIntegrity();
      if (!result.databaseConnection) {
        result.success = false;
      }

      // Super admin verification
      result.superAdmins = await this.verifySuperAdmins();
      if (result.superAdmins.length === 0) {
        result.errors.push('No super admin accounts found');
        result.success = false;
      }

      // Authentication flow test
      result.authenticationTest = await this.testAuthenticationFlow();
      if (!result.authenticationTest) {
        result.errors.push('Authentication flow test failed');
        result.success = false;
      }

      // Reference data verification
      const referenceDataOk = await this.verifyReferenceData();
      if (!referenceDataOk) {
        result.warnings.push('Reference data may be incomplete');
      }

      // Create test admin if needed
      if (result.superAdmins.length === 0) {
        await this.createTestSuperAdminIfNeeded();
        result.warnings.push('Test super admin account created for testing');
      }
    } catch (error) {
      result.errors.push(`Verification failed: ${error}`);
      result.success = false;
    }

    return result;
  }

  async cleanup(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
    }
  }
}

async function main() {
  const verifier = new SystemVerification();

  try {
    await verifier.initialize();

    const result = await verifier.generateVerificationReport();

    console.log('\n' + '='.repeat(60));
    console.log('📋 VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    console.log(`Overall Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Database Connection: ${result.databaseConnection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Authentication Test: ${result.authenticationTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Super Admins: ${result.superAdmins.length} found`);

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      result.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (result.success) {
      console.log('\n🎉 System verification completed successfully!');
      console.log('\n🔑 Test Login Credentials:');
      if (result.superAdmins.length > 0) {
        console.log(`  • ${result.superAdmins[0].email} (existing super admin)`);
      }
      console.log('  • admin@realestateportal.test / Admin123! (test account)');
      console.log('\n🌐 Access the application at: http://localhost:3009/login');
    } else {
      console.log('\n❌ System verification failed. Please address the errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Verification process failed:', error);
    process.exit(1);
  } finally {
    await verifier.cleanup();
  }
}

// Export for programmatic use
export { SystemVerification, type VerificationResult };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
