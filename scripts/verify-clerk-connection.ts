/**
 * Clerk Connection Verification Script
 *
 * Validates that our TypeScript type definitions match actual Clerk user data.
 * Run with: npx tsx scripts/verify-clerk-connection.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { clerkClient } from '@clerk/nextjs/server';
import { UserSubscription, UserLookupResult } from '../lib/types';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface ValidationResult {
  field: string;
  expected: string;
  actual: string;
  valid: boolean;
  message?: string;
}

interface UserValidation {
  userId: string;
  email: string;
  hasMetadata: boolean;
  metadataFields: string[];
  validations: ValidationResult[];
  allValid: boolean;
}

/**
 * Validates a user's publicMetadata against our UserSubscription type
 */
function validateUserMetadata(
  userId: string,
  email: string,
  metadata: Record<string, unknown>
): UserValidation {
  const validations: ValidationResult[] = [];
  const metadataFields = Object.keys(metadata);

  // Check isPremium (should be boolean if present)
  if ('premiumUser' in metadata) {
    const valid = typeof metadata.premiumUser === 'boolean';
    validations.push({
      field: 'premiumUser',
      expected: 'boolean',
      actual: typeof metadata.premiumUser,
      valid,
      message: valid ? undefined : `Value: ${JSON.stringify(metadata.premiumUser)}`,
    });
  } else {
    validations.push({
      field: 'premiumUser',
      expected: 'boolean',
      actual: 'missing',
      valid: true, // OK if missing, it's optional
      message: 'Field not set (OK for free users)',
    });
  }

  // Check analysisCount (should be number if present)
  if ('analysisCount' in metadata) {
    const valid = typeof metadata.analysisCount === 'number';
    validations.push({
      field: 'analysisCount',
      expected: 'number',
      actual: typeof metadata.analysisCount,
      valid,
      message: valid ? `Current count: ${metadata.analysisCount}` : `Value: ${JSON.stringify(metadata.analysisCount)}`,
    });
  } else {
    validations.push({
      field: 'analysisCount',
      expected: 'number',
      actual: 'missing',
      valid: true, // OK if missing (defaults to 0)
      message: 'Field not set (defaults to 0)',
    });
  }

  // Check subscriptionStatus (should be string if present)
  if ('subscriptionStatus' in metadata) {
    const valid = typeof metadata.subscriptionStatus === 'string';
    validations.push({
      field: 'subscriptionStatus',
      expected: 'string',
      actual: typeof metadata.subscriptionStatus,
      valid,
      message: valid ? `Status: "${metadata.subscriptionStatus}"` : `Value: ${JSON.stringify(metadata.subscriptionStatus)}`,
    });
  }

  // Check subscriptionId (should be string if present)
  if ('subscriptionId' in metadata) {
    const valid = typeof metadata.subscriptionId === 'string';
    validations.push({
      field: 'subscriptionId',
      expected: 'string',
      actual: typeof metadata.subscriptionId,
      valid,
      message: valid ? `ID: ${String(metadata.subscriptionId).substring(0, 20)}...` : `Value: ${JSON.stringify(metadata.subscriptionId)}`,
    });
  }

  // Check customerId (should be string if present)
  if ('customerId' in metadata) {
    const valid = typeof metadata.customerId === 'string';
    validations.push({
      field: 'customerId',
      expected: 'string',
      actual: typeof metadata.customerId,
      valid,
      message: valid ? `ID: ${String(metadata.customerId).substring(0, 20)}...` : `Value: ${JSON.stringify(metadata.customerId)}`,
    });
  }

  // Check for unexpected fields not in our type definition
  const expectedFields = ['premiumUser', 'analysisCount', 'subscriptionStatus', 'subscriptionId', 'customerId', 'updatedAt', 'lastAnalysisReset'];
  const unexpectedFields = metadataFields.filter(f => !expectedFields.includes(f));

  if (unexpectedFields.length > 0) {
    validations.push({
      field: '⚠️  UNEXPECTED FIELDS',
      expected: 'none',
      actual: unexpectedFields.join(', '),
      valid: false,
      message: 'These fields are not in our UserSubscription type definition',
    });
  }

  const allValid = validations.every(v => v.valid);

  return {
    userId,
    email,
    hasMetadata: metadataFields.length > 0,
    metadataFields,
    validations,
    allValid,
  };
}

/**
 * Prints validation results with colored output
 */
function printValidationResults(validation: UserValidation) {
  const statusIcon = validation.allValid ? '✅' : '❌';
  const statusColor = validation.allValid ? colors.green : colors.red;

  console.log(`\n${colors.bright}${statusColor}${statusIcon} User: ${validation.email}${colors.reset}`);
  console.log(`${colors.cyan}   User ID: ${validation.userId}${colors.reset}`);
  console.log(`   Metadata Fields: ${validation.metadataFields.length > 0 ? validation.metadataFields.join(', ') : '(none)'}`);

  if (validation.validations.length > 0) {
    console.log('\n   Field Validations:');
    validation.validations.forEach(v => {
      const icon = v.valid ? '✓' : '✗';
      const color = v.valid ? colors.green : colors.red;
      const status = v.actual === 'missing' ? colors.yellow + v.actual + colors.reset : v.actual;

      console.log(`   ${color}${icon}${colors.reset} ${v.field}`);
      console.log(`      Expected: ${v.expected} | Actual: ${status}`);
      if (v.message) {
        console.log(`      ${colors.cyan}${v.message}${colors.reset}`);
      }
    });
  }
}

/**
 * Main verification function
 */
async function verifyClerkConnection() {
  console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════╗
║   Clerk Connection & Type Definition Verification         ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Debug: Check if environment variables are loaded
  const hasSecretKey = !!process.env.CLERK_SECRET_KEY;
  const hasPublishableKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  console.log(`${colors.cyan}🔧 Environment Check:${colors.reset}`);
  console.log(`   CLERK_SECRET_KEY: ${hasSecretKey ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Missing' + colors.reset}`);
  console.log(`   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${hasPublishableKey ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Missing' + colors.reset}`);

  if (!hasSecretKey) {
    console.log(`${colors.red}❌ CLERK_SECRET_KEY is not set. Check your .env.local file.${colors.reset}`);
    process.exit(1);
  }

  try {
    // Initialize Clerk client
    console.log(`${colors.cyan}📡 Connecting to Clerk...${colors.reset}`);
    const client = await clerkClient();

    // Fetch users
    console.log(`${colors.cyan}👥 Fetching users...${colors.reset}`);
    const response = await client.users.getUserList({
      limit: 10,
    });

    if (!response.data || response.data.length === 0) {
      console.log(`${colors.yellow}⚠️  No users found in Clerk. This might be a new installation.${colors.reset}`);
      console.log(`${colors.yellow}   Create a test user and run this script again.${colors.reset}`);
      return;
    }

    console.log(`${colors.green}✅ Found ${response.data.length} users${colors.reset}`);

    // Validate each user's metadata
    const validations: UserValidation[] = [];

    for (const user of response.data) {
      const email = user.emailAddresses[0]?.emailAddress || 'no-email';
      const metadata = (user.publicMetadata as Record<string, unknown>) || {};

      const validation = validateUserMetadata(user.id, email, metadata);
      validations.push(validation);
      printValidationResults(validation);
    }

    // Summary
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  Total Users: ${validations.length}`);
    console.log(`  Users with Metadata: ${validations.filter(v => v.hasMetadata).length}`);
    console.log(`  Users with Valid Metadata: ${colors.green}${validations.filter(v => v.allValid).length}${colors.reset}`);
    console.log(`  Users with Invalid Metadata: ${colors.red}${validations.filter(v => !v.allValid && v.hasMetadata).length}${colors.reset}`);

    // Check for type mismatches
    const invalidUsers = validations.filter(v => !v.allValid && v.hasMetadata);
    if (invalidUsers.length > 0) {
      console.log(`\n${colors.red}${colors.bright}⚠️  TYPE MISMATCHES DETECTED!${colors.reset}`);
      console.log(`${colors.red}   ${invalidUsers.length} user(s) have metadata that doesn't match our type definitions.${colors.reset}`);
      console.log(`${colors.yellow}   Review the validation details above and update lib/types.ts if needed.${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}${colors.bright}✅ All user metadata matches our type definitions!${colors.reset}`);
      console.log(`${colors.green}   The UserSubscription interface in lib/types.ts is accurate.${colors.reset}`);
    }

    // Show example of how to use the types
    if (validations.length > 0) {
      const exampleUser = response.data[0];
      const exampleMetadata = exampleUser.publicMetadata as Partial<UserSubscription>;

      console.log(`\n${colors.cyan}${colors.bright}📚 Type Usage Example:${colors.reset}`);
      console.log(`${colors.cyan}
import { UserSubscription } from '@/lib/types';

const metadata = user.publicMetadata as Partial<UserSubscription>;
const isPremium = metadata.premiumUser === true;
const analysisCount = metadata.analysisCount || 0;
const hasActiveSubscription = metadata.subscriptionStatus === 'active';
${colors.reset}`);

      console.log(`${colors.cyan}Example values from ${exampleUser.emailAddresses[0]?.emailAddress}:${colors.reset}`);
      console.log(`  isPremium: ${exampleMetadata.premiumUser || false}`);
      console.log(`  analysisCount: ${exampleMetadata.analysisCount || 0}`);
      console.log(`  subscriptionStatus: ${exampleMetadata.subscriptionStatus || 'none'}`);
    }

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}❌ Error during verification:${colors.reset}`);
    if (error instanceof Error) {
      console.error(`${colors.red}   ${error.message}${colors.reset}`);

      if (error.message.includes('Missing publishableKey') || error.message.includes('CLERK')) {
        console.error(`\n${colors.yellow}   Make sure you have set the following environment variables:${colors.reset}`);
        console.error(`${colors.yellow}   - CLERK_SECRET_KEY${colors.reset}`);
        console.error(`${colors.yellow}   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY${colors.reset}`);
      }
    } else {
      console.error(`${colors.red}   ${String(error)}${colors.reset}`);
    }
    process.exit(1);
  }
}

// Run the verification
verifyClerkConnection()
  .then(() => {
    console.log(`\n${colors.green}✅ Verification complete!${colors.reset}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n${colors.red}❌ Verification failed:${colors.reset}`, error);
    process.exit(1);
  });
