'use client';

import { useEffect } from 'react';

export default function ExtensionSignUp() {
    useEffect(() => {
        // Load Clerk script dynamically
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@clerk/clerk-js@latest/dist/clerk.browser.js';
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

            // Mount sign-up component
            const signUpDiv = document.getElementById('clerk-sign-up');
            if (signUpDiv) {
                clerk.mountSignUp(signUpDiv, {
                    routing: 'virtual',
                    signInUrl: '/auth', // Navigate back to sign-in
                    afterSignUpUrl: window.location.href,
                    appearance: {
                        elements: {
                            rootBox: 'w-full flex justify-center',
                            card: 'w-full max-w-md'
                        }
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
                errorEl.textContent = 'Failed to initialize authentication.';
            }
        }
    };

    const handleSuccessfulAuth = async (clerk: any) => {
        try {
            // Get auth token
            const token = await clerk.session.getToken();

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
            const signUpEl = document.getElementById('clerk-sign-up');
            const successEl = document.getElementById('success');

            if (signUpEl) signUpEl.style.display = 'none';
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
                errorEl.textContent = 'Authentication succeeded but data sync failed.';
            }
        }
    };

    const checkPremiumStatus = async (token: string) => {
        try {
            console.log('🔍 Checking premium status for extension sync...');

            const response = await fetch('https://www.llmcheck.app/api/extension-subscription-status', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Premium status check result:', data);
                return data.isPremium || false;
            } else {
                console.warn('❌ Premium status check failed:', response.status);
                return false;
            }
        } catch (error) {
            console.warn('❌ Failed to check premium status:', error);
            return false;
        }
    };

    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            minHeight: '100vh',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            {/* Loading state - centered */}
            <div id="loading" style={{
                color: '#6b7280',
                textAlign: 'center',
                fontSize: '16px'
            }}>
                Loading authentication...
            </div>

            {/* Success state - centered */}
            <div id="success" style={{
                color: '#059669',
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
                    color: '#059669',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                }}>
                    ✅ LLM Check
                </div>
                <p>Account created successfully! You can close this window.</p>
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
                <p>Account creation failed. Please try again.</p>
            </div>

            {/* Clerk sign-up component - properly centered */}
            <div id="clerk-sign-up" style={{
                width: '100%',
                maxWidth: '400px',
                display: 'flex',
                justifyContent: 'center'
            }}></div>
        </div>
    );
}