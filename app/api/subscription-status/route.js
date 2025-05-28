import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// Usage limits for different user types
const MAX_FREE_ANALYSES = 10;
const MAX_PREMIUM_ANALYSES = 100;

// Premium plan ID
const PREMIUM_PLAN_ID = 'llm_check_premium';

/**
 * Check if monthly usage should be reset
 * @param {string} lastResetDate - ISO date string of last reset
 * @returns {boolean} - Whether usage count should be reset
 */
function shouldResetUsageCount(lastResetDate) {
  if (!lastResetDate) return true;
  
  const lastReset = new Date(lastResetDate);
  const currentDate = new Date();
  
  // Reset if the current month is different from the last reset month
  return lastReset.getMonth() !== currentDate.getMonth() || 
         lastReset.getFullYear() !== currentDate.getFullYear();
}

export async function GET() {
  try {
    // Get authentication status from Clerk
    const { userId } = auth();
    
    // Return early if not authenticated
    if (!userId) {
      return NextResponse.json({ 
        isPremium: false,
        isAuthenticated: false,
        debug: { message: 'User not authenticated' }
      });
    }

    // Get user data from Clerk
    const user = await clerkClient.users.getUser(userId);
    
    // Check if user is premium by checking active subscriptions
    const subscriptions = user.privateMetadata?.subscriptions || [];
    const isPremium = subscriptions.some(sub => 
      sub.planId === PREMIUM_PLAN_ID && 
      sub.status === 'active'
    );
    
    // Set monthly limit based on user type
    const monthlyLimit = isPremium ? MAX_PREMIUM_ANALYSES : MAX_FREE_ANALYSES;
    
    // Get or initialize usage metadata
    let usageMetadata = user.privateMetadata?.analysisCount || {
      current: 0,
      lastReset: new Date().toISOString()
    };
    
    // Check if we need to reset the monthly counter
    if (shouldResetUsageCount(usageMetadata.lastReset)) {
      usageMetadata = {
        current: 0,
        lastReset: new Date().toISOString()
      };
      
      // Update user metadata with reset count
      await clerkClient.users.updateUser(userId, {
        privateMetadata: {
          ...user.privateMetadata,
          analysisCount: usageMetadata
        }
      });
    }
    
    // Get current analysis count
    const analysisCount = usageMetadata.current || 0;
    const remainingAnalyses = Math.max(0, monthlyLimit - analysisCount);
    
    // Prepare usage info
    const usageInfo = {
      isPremium,
      analysisCount,
      monthlyLimit,
      remainingAnalyses,
      lastReset: usageMetadata.lastReset
    };

    return NextResponse.json({
      isPremium,
      isAuthenticated: true,
      usageInfo,
      debug: {
        userId,
        email: user.emailAddresses?.[0]?.emailAddress,
        subscriptions,
        privateMetadata: user.privateMetadata,
        publicMetadata: user.publicMetadata
      }
    });
  } catch (error) {
    console.error('🔥 Subscription status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check subscription status',
        message: error.message,
        isPremium: false,
        isAuthenticated: false
      },
      { status: 500 }
    );
  }
}
