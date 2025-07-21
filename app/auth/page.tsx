'use client';

import { useEffect } from 'react';

export default function ExtensionAuth() {
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
            const CLERK_PUBLISHABLE_KEY = 'pk_live_Y29tbXVuaWNhdGlvbi00NC05Mi5jbGVyay5hY2NvdW50cy5kZXYk';

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

            // Mount sign-in component
            const signInDiv = document.getElementById('clerk-sign-in');
            if (signInDiv) {
                clerk.mountSignIn(signInDiv, {
                    routing: 'virtual',
                    signUpUrl: '#sign-up',
                    afterSignInUrl: window.location.href,
                });
            }

            // Mount sign-up component  
            const signUpDiv = document.getElementById('clerk-sign-up');
            if (signUpDiv) {
                clerk.mountSignUp(signUpDiv, {
                    routing: 'virtual',
                    signInUrl: '#sign-in',
                    afterSignUpUrl: window.location.href,
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
                errorEl.textContent = 'Authentication succeeded but data sync failed.';
            }
        }
    };

    const checkPremiumStatus = async (token: string) => {
        try {
            const response = await fetch('https://www.llmcheck.app/api/subscription-status', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                return data.isPremium || false;
            }
            return false;
        } catch (error) {
            console.warn('Failed to check premium status:', error);
            return false;
        }
    };

    const handleRouting = () => {
        const hash = window.location.hash;
        const signInDiv = document.getElementById('clerk-sign-in');
        const signUpDiv = document.getElementById('clerk-sign-up');

        if (hash === '#sign-up') {
            if (signInDiv) signInDiv.style.display = 'none';
            if (signUpDiv) signUpDiv.style.display = 'block';
        } else {
            if (signInDiv) signInDiv.style.display = 'block';
            if (signUpDiv) signUpDiv.style.display = 'none';
        }
    };

    useEffect(() => {
        // Handle URL routing for sign-in/sign-up
        handleRouting();

        // Listen for hash changes
        const hashChangeHandler = () => handleRouting();
        window.addEventListener('hashchange', hashChangeHandler);

        return () => {
            window.removeEventListener('hashchange', hashChangeHandler);
        };
    }, []);

    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            maxWidth: '400px',
            margin: '50px auto',
            padding: '20px',
            textAlign: 'center',
            background: '#f8fafc'
        }}>
            <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    color: '#059669',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                }}>
                    LLM Check
                </div>
                <h2>Extension Authentication</h2>

                <div id="loading" style={{
                    color: '#6b7280',
                    margin: '20px 0'
                }}>
                    Loading authentication...
                </div>

                <div id="success" style={{
                    color: '#059669',
                    margin: '20px 0',
                    display: 'none'
                }}>
                    Authentication successful! You can close this window.
                </div>

                <div id="error" style={{
                    color: '#dc2626',
                    margin: '20px 0',
                    display: 'none'
                }}>
                    Authentication failed. Please try again.
                </div>

                {/* Clerk auth components will be mounted here */}
                <div id="clerk-sign-in" style={{ margin: '20px 0' }}></div>
                <div id="clerk-sign-up" style={{ margin: '20px 0' }}></div>

                <div id="signed-in-content" style={{ display: 'none' }}>
                    <p>Welcome! Syncing with extension...</p>
                </div>
            </div>
        </div>
    );
}