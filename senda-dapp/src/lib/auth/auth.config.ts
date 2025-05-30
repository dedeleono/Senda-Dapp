import { NextAuthConfig } from "next-auth";
import { NextURL } from "next/dist/server/web/next-url";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import type { User } from "next-auth";
import jwt from "jsonwebtoken";

// interface VerificationRequestEvent {
//     url: string;
//     provider: EmailConfig;
//     identifier: string;
// }

type AuthorizedCallback = {
    auth: {
        user?: {
            id?: string | null;
            name?: string | null;
            email?: string | null;
            sendaWalletPublicKey?: string | null;
            needs2FA?: boolean;
        } | null;
    } | null;
    request: {
        nextUrl: NextURL;
    };
};

export const authConfig: NextAuthConfig = {
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email.toLowerCase(),
                    image: profile.picture,
                    emailVerified: profile.email_verified,
                    sendaWalletPublicKey: profile.sendaWalletPublicKey,
                }
            }
        }),
        Credentials({
            id: "invitation",
            name: "Invitation",
            credentials: {
                token: { label: "Token", type: "text" }
            },
            async authorize(credentials): Promise<User | null> {
                console.log('Credentials provider called with:', credentials);
                
                if (!credentials?.token || typeof credentials.token !== 'string') {
                    console.log('No token provided');
                    return null;
                }

                try {
                    // First try to verify as JWT
                    const decoded = jwt.verify(credentials.token, process.env.AUTH_SECRET!) as { 
                        email: string, 
                        role: string,
                        token: string 
                    };

                    const verificationToken = await prisma.verificationToken.findUnique({
                        where: { token: decoded.token }
                    });

                    if (!verificationToken) {
                        console.log('No verification token found');
                        return null;
                    }

                    if (new Date() > verificationToken.expires) {
                        console.log('Token expired');
                        return null;
                    }

                    const user = await prisma.user.findUnique({
                        where: { email: verificationToken.identifier }
                    });

                    if (!user) {
                        console.log('No user found');
                        return null;
                    }

                    const userData = {
                        id: user.id,
                        email: user.email || '',
                        name: user.name || null,
                        image: user.image || null,
                        emailVerified: user.emailVerified || null,
                        sendaWalletPublicKey: user.sendaWalletPublicKey as string,
                    };

                    console.log('Returning user data:', userData);
                    return userData;
                } catch (error) {
                    console.log('Error verifying JWT:', error);
                    return null;
                }
            }
        })
    ],
    pages: {
        signIn: "/login",
        signOut: "/login",
        verifyRequest: "/verify-request",
        error: "/error",
    },
    callbacks: {
        async redirect({ url, baseUrl }) {
            // If coming from verify-invitation, go directly to home
            if (url.includes('/verify-invitation')) {
                return `${baseUrl}/home`;
            }

            console.log('Redirect callback called with:', { url, baseUrl });

            if (url.includes('/api/auth/callback/email')) {
                const urlObj = new URL(url);
                const callbackUrl = urlObj.searchParams.get('callbackUrl');
                const token = urlObj.searchParams.get('token');
                const email = urlObj.searchParams.get('email');

                console.log('Email callback URL params:', {
                    callbackUrl,
                    token,
                    email,
                    hasToken: !!token
                });

                return `${baseUrl}/home`;
            }

            // If URL is for 2FA verification
            if (url.includes('/2fa-verify')) {
                return url;
            }

            // Handle NextAuth default sign-in redirect (which would go to /sign-in)
            if (url.endsWith('/sign-in') || url.includes('/sign-in?')) {
                // Redirect to our home page
                return `${baseUrl}/`;
            }

            if (url.startsWith(baseUrl)) {
                return url;
            }

            return `${baseUrl}/home`;
        },
        authorized({ auth, request: { nextUrl } }: AuthorizedCallback) {
            console.log('[AUTH CONFIG] Authorized callback called for path:', nextUrl.pathname);
            console.log('[AUTH CONFIG] Auth object:', auth ? JSON.stringify({
                hasUser: !!auth.user,
                userId: auth?.user?.id || 'No ID',
                userEmail: auth?.user?.email || 'No email',
            }) : 'null');
            
            const isLogoutFlow = nextUrl.searchParams.get('from') === 'logout';
            
            if (isLogoutFlow) {
                console.log('[AUTH CONFIG] Logout flow detected, bypassing auth checks');
                return true;
            }
            
            if (nextUrl.pathname.startsWith('/api/') || 
                nextUrl.pathname.startsWith('/_next/')) {
                console.log('[AUTH CONFIG] Skipping auth check for API/asset path');
                return true;
            }

            const publicPaths = [
                '/login',
                '/verify-request',
                '/login/error',
                '/2fa-verify',
                '/about',
                '/contact',
                '/invitation',
                '/terms',
                '/privacy',
            ];
            
            const isPublicPath = publicPaths.some(path => 
                nextUrl.pathname === path || nextUrl.pathname.startsWith(`${path}/`)
            );
            
            const isLoggedIn = !!auth?.user;
            const is2FAVerification = nextUrl.pathname.includes('/2fa-verify');
            const needs2FA = auth?.user?.needs2FA;

            console.log('[AUTH CONFIG] Path info:', {
                path: nextUrl.pathname,
                isPublic: isPublicPath,
                isLoggedIn,
                needs2FA,
                is2FAVerification
            });
            
            // If user is logged in but needs 2FA verification, redirect to 2FA page
            if (isLoggedIn && needs2FA && !is2FAVerification) {
                console.log('[AUTH CONFIG] User needs 2FA verification, redirecting to 2FA page');
                return Response.redirect(new URL('/2fa-verify?callbackUrl=/home', nextUrl));
            }
            
            // Public routes are always accessible
            if (isPublicPath) {
                console.log('[AUTH CONFIG] Public path, allowing access');
                return true;
            }
            
            // For non-public routes, actually enforce authentication
            console.log('[AUTH CONFIG] Protected route, authentication required. Is logged in:', isLoggedIn);
            
            if (!isLoggedIn) {
                console.log('[AUTH CONFIG] Redirecting unauthenticated user to login');
                const callbackUrl = encodeURIComponent(nextUrl.pathname);
                return Response.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl.origin));
            }
            
            return isLoggedIn;
        }
    }
};