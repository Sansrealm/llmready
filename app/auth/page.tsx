'use client';

import { useEffect } from 'react';

export default function ExtensionAuth() {
    useEffect(() => {
        // Load Clerk script dynamically
        const script = document.createElement('script');
        script.src = 'https://clerk.llmcheck.app/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
        script.onload = initializeClerk;
        document.head.appendChild(script);

        return () => {
            // Cleanup script on unmount
            const existingScript = document.querySelector('script[src*="clerk-js"]');
            if (existingScript) {
                document.head.removeChild(existingScript);
            }
        };
    }, []);

    const checkPremiumStatus = async (token: string) => {
        try {
            const response = await fetch('/api/extension-subscription-status', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn('Premium status check failed:', response.status);
                return false;
            }

            const data = await response.json();
            return data.isPremium || false;
        } catch (error) {
            console.error('Premium status check error:', error);
            return false;
        }
    };

    const initializeClerk = async () => {
        try {
            const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

            // Initialize Clerk
            const clerk = (window as any).Clerk;
            await clerk.load({
                publishableKey: CLERK_PUBLISHABLE_KEY,
            });

            // Check if user is already signed in
            if (clerk.user) {
                await handleSuccessfulAuth(clerk);
                return;
            }

            // Mount sign-in component with updated props (no deprecated ones)
            const signInDiv = document.getElementById('clerk-sign-in');
            if (signInDiv) {
                clerk.mountSignIn(signInDiv, {
                    routing: 'virtual',
                    // Use new redirect props instead of deprecated ones
                    fallbackRedirectUrl: window.location.href,
                    signUpUrl: '/sign-up', // This is still valid for navigation
                    appearance: {
                        elements: {
                            rootBox: 'w-full flex justify-center',
                            card: 'w-full max-w-md'
                        }
                    },
                    // Ensure OTP flows work properly
                    experimental: {
                        useCachedCredentials: false
                    }
                });
            }

            // Listen for authentication events
            clerk.addListener((event: any) => {
                if (event.type === 'user:loaded' && clerk.user) {
                    handleSuccessfulAuth(clerk);
                }
            });

            const loadingEl = document.getElementById('loading');
            if (loadingEl) loadingEl.style.display = 'none';

        } catch (error) {
            console.error('Clerk initialization failed:', error);
            const loadingEl = document.getElementById('loading');
            const errorEl = document.getElementById('error');
            if (loadingEl) loadingEl.style.display = 'none';
            if (errorEl) {
                errorEl.style.display = 'block';
                errorEl.textContent = 'Failed to initialize authentication. Please refresh and try again.';
            }
        }
    };

    const handleSuccessfulAuth = async (clerk: any) => {
        try {
            // Get token with extension-auth template
            console.log('🔐 Getting session token with extension-auth template...');

            const token = await clerk.session.getToken({
                template: 'extension-auth'
            });

            if (!token) {
                throw new Error('Failed to get session token with extension-auth template');
            }

            console.log('✅ Session token obtained with extension-auth template');

            // Parse token to verify it has proper expiry
            try {
                const tokenParts = token.split('.');
                const tokenPayload = JSON.parse(atob(tokenParts[1]));
                const now = Math.floor(Date.now() / 1000);
                const lifetime = tokenPayload.exp - tokenPayload.iat;

                console.log('🔍 Token details:', {
                    issuedAt: new Date(tokenPayload.iat * 1000).toISOString(),
                    expiresAt: new Date(tokenPayload.exp * 1000).toISOString(),
                    lifetimeSeconds: lifetime,
                    lifetimeMinutes: lifetime / 60,
                    template: 'extension-auth'
                });

                // Verify we got the 1-hour token (3600 seconds)
                if (lifetime !== 3600) {
                    console.warn('⚠️ Token lifetime unexpected:', lifetime, 'seconds (expected 3600)');
                } else {
                    console.log('✅ Token has correct 1-hour lifetime');
                }
            } catch (parseError) {
                console.warn('Could not parse token for verification:', parseError);
            }

            // Get user info
            const user = clerk.user;
            const isPremium = await checkPremiumStatus(token);

            // Prepare data to send to extension
            const authData = {
                token,
                user: {
                    id: user.id,
                    email: user.emailAddresses[0]?.emailAddress,
                    firstName: user.firstName,
                    lastName: user.lastName,
                },
                isPremium,
                sessionId: clerk.session.id,
            };

            // Hide auth components and show success
            const signInEl = document.getElementById('clerk-sign-in');
            const signUpEl = document.getElementById('clerk-sign-up');
            const signedInEl = document.getElementById('signed-in-content');
            const successEl = document.getElementById('success');

            if (signInEl) signInEl.style.display = 'none';
            if (signUpEl) signUpEl.style.display = 'none';
            if (signedInEl) signedInEl.style.display = 'block';
            if (successEl) successEl.style.display = 'block';

            // Send data to parent window (Chrome extension popup)
            if (window.opener) {
                window.opener.postMessage({
                    type: 'CLERK_AUTH_SUCCESS',
                    data: authData
                }, '*');
            } else {
                // For tab-based auth, store in localStorage temporarily
                localStorage.setItem('extension_auth_data', JSON.stringify(authData));
                localStorage.setItem('extension_auth_timestamp', Date.now().toString());
            }

            // Close window after a brief delay
            setTimeout(() => {
                window.close();
            }, 2000);

        } catch (error) {
            console.error('Auth success handling failed:', error);
            const errorEl = document.getElementById('error');
            if (errorEl) {
                errorEl.style.display = 'block';
                errorEl.textContent = 'Authentication succeeded but data sync failed. Please try refreshing.';
            }
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '20px'
        }}>
            {/* Loading state - centered */}
            <div id="loading" style={{
                color: 'white',
                textAlign: 'center',
                fontSize: '18px',
                fontWeight: '500'
            }}>
                <div style={{
                    color: 'white',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    marginBottom: '20px'
                }}>
                    🔍 LLM Check
                </div>
                Initializing secure authentication...
            </div>

            {/* Success state - centered */}
            <div id="success" style={{
                color: '#10b981',
                textAlign: 'center',
                padding: '20px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                display: 'none',
                maxWidth: '400px',
                width: '100%'
            }}>
                <div style={{
                    color: '#10b981',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                }}>
                    ✅ LLM Check
                </div>
                <p>Successfully authenticated!</p>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    You can close this window.
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>
                    Session valid for 1 hour with extension-auth template
                </p>
            </div>

            {/* Error state - centered */}
            <div id="error" style={{
                color: '#dc2626',
                textAlign: 'center',
                padding: '20px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                display: 'none',
                maxWidth: '400px',
                width: '100%'
            }}>
                <div style={{
                    color: '#dc2626',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                }}>
                    ❌ LLM Check
                </div>
                <p>Authentication failed. Please try again.</p>
            </div>

            {/* Clerk auth component - properly centered */}
            <div id="clerk-sign-in" style={{
                width: '100%',
                maxWidth: '400px',
                display: 'flex',
                justifyContent: 'center'
            }}></div>

            <div id="signed-in-content" style={{
                display: 'none',
                textAlign: 'center',
                padding: '20px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                maxWidth: '400px',
                width: '100%'
            }}>
                <p>Welcome! Syncing with extension...</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                    Using secure 1-hour session tokens
                </p>
            </div>
        </div>
    );
}