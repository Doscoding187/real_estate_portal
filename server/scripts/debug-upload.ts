import 'dotenv/config';
import { uploadRouter } from '../uploadRouter';

async function main() {
  console.log('--- UPLOAD DEBUG SCRIPT START ---');

  // Mock Context - Mimic an authenticated user
  const mockCtx = {
    user: {
      id: 'debug_user_123',
      name: 'Debug User',
      email: 'debug@example.com',
      role: 'property_developer',
      openId: 'debug_open_id',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      emailVerified: 1,
      loginMethod: 'email',
      isSubaccount: 0,
    },
    // Mock req/res if needed, though usually not for just the router logic unless it uses them
    req: {} as any,
    res: {} as any,
  };

  try {
    console.log('Creating Caller...');
    const caller = uploadRouter.createCaller(mockCtx as any);

    console.log('Invoking upload.presign...');
    const result = await caller.presign({
      filename: 'debug-test.jpg',
      contentType: 'image/jpeg',
    });

    console.log('✅ SUCCESS:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('❌ ERROR CAUGHT:');
    console.error(err);
    if (err.cause) {
      console.error('Cause:', err.cause);
    }
    if (err.stack) {
      console.error('Stack:', err.stack);
    }
  }

  console.log('--- UPLOAD DEBUG SCRIPT END ---');
}

main().catch(console.error);
