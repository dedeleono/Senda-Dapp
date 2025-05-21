import { router, protectedProcedure, publicProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Keypair } from "@solana/web3.js";
import { encryptPrivateKey } from "@/lib/utils/crypto";
import { TRPCError } from "@trpc/server";
import { createTransport } from 'nodemailer';
import { render } from '@react-email/render';
import InvitationEmail from '@/components/emails/invitation-email';
import crypto from 'crypto';
import { sendGuestDepositNotificationEmail } from "@/lib/validations/guest-deposit-notification";
import { sendDepositNotificationEmail } from "@/lib/validations/deposit-notification";
import jwt from 'jsonwebtoken';

const userRouter = router({
    getUserById: protectedProcedure.input(z.object({ userId: z.string() })).query(async ({ input }) => {
        return prisma.user.findUnique({ where: { id: input.userId }, select: { email: true, sendaWalletPublicKey: true, iv: true, authTag: true, encryptedPrivateKey: true } });
    }),
    getUserByEmail: protectedProcedure.input(z.object({ email: z.string() })).query(async ({ input }) => {
        return prisma.user.findUnique({ where: { email: input.email }, select: { id: true, role: true } });
    }),
    getUserPaths: protectedProcedure.input(z.object({
        userId: z.string()
    })).query(async ({ input }) => {
        console.log('Getting paths for user:', input.userId);
        
        const user = await prisma.user.findUnique({
            where: { id: input.userId },
            select: { sendaWalletPublicKey: true }
        });
        
        console.log('Found user with wallet:', user?.sendaWalletPublicKey);

        if (!user) {
            throw new Error("User not found");
        }

        const paths = await prisma.escrow.findMany({
            where: {
                OR: [
                    { senderPublicKey: user.sendaWalletPublicKey as string },
                    { receiverPublicKey: user.sendaWalletPublicKey as string }
                ],
                state: "Active"
            },
            select: {
                id: true,
                senderPublicKey: true,
                receiverPublicKey: true,
                depositCount: true,
                state: true,
                createdAt: true,
                sender: {
                    select: {
                        email: true,
                        name: true,
                    }
                },
                receiver: {
                    select: {
                        email: true,
                        name: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const groupedPaths = paths.reduce((acc, escrow) => {
            const key = [escrow.senderPublicKey, escrow.receiverPublicKey].sort().join('-');
            
            if (!acc[key]) {
                acc[key] = {
                    ...escrow,
                    depositCount: Number(escrow.depositCount),
                };
            } else {
                acc[key].depositCount += Number(escrow.depositCount);
                if (escrow.createdAt > acc[key].createdAt) {
                    acc[key].id = escrow.id;
                    acc[key].createdAt = escrow.createdAt;
                }
            }
            return acc;
        }, {} as Record<string, any>);

        const uniquePaths = Object.values(groupedPaths);

        console.log('Unique paths:', uniquePaths);

        return {
            paths: uniquePaths
        };
    }),
    createMinimalUser: protectedProcedure.input(z.object({ recipientEmail: z.string().email() })).mutation(async ({ input }) => {
        const { recipientEmail } = input;
        const keypair = Keypair.generate();
        const secretBuffer = Buffer.from(keypair.secretKey);

        const { iv, authTag, data: encryptedPrivateKey } = encryptPrivateKey(secretBuffer);

        const newUser = await prisma.user.create({
            data: {
                email: recipientEmail,
                sendaWalletPublicKey: keypair.publicKey.toString(),
                encryptedPrivateKey,
                iv,
                authTag,
                role: "GUEST",
            },
        });
        return newUser;
    }),
    verifyInvitation: publicProcedure
        .input(z.object({
            token: z.string(),
            jwt: z.string().optional()
        }))
        .query(async ({ input }) => {
            try {
                const verificationToken = await prisma.verificationToken.findUnique({
                    where: { token: input.token }
                });

                if (!verificationToken) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Invalid token'
                    });
                }

                if (new Date() > verificationToken.expires) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Token has expired'
                    });
                }

                // Get the user associated with this token
                const user = await prisma.user.findUnique({
                    where: { email: verificationToken.identifier }
                });

                if (!user) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'User not found'
                    });
                }

                // Get the deposit information associated with this token
                const deposit = await prisma.depositRecord.findFirst({
                    where: {
                        userId: user.id
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    select: {
                        amount: true,
                        stable: true
                    }
                });

                // If JWT token is provided, verify it
                if (input.jwt) {
                    try {
                        console.log('Verifying JWT token:', input.jwt);
                        const decoded = jwt.verify(input.jwt, process.env.AUTH_SECRET!) as { email: string, role: string };
                        console.log('Decoded JWT:', decoded);
                        if (decoded.email !== user.email) {
                            console.log('Email mismatch:', { decoded: decoded.email, user: user.email });
                            throw new Error('Invalid JWT token');
                        }
                    } catch (error) {
                        console.error("Error verifying JWT token:", error);
                        throw new TRPCError({
                            code: 'UNAUTHORIZED',
                            message: 'Invalid JWT token'
                        });
                    }
                }

                return {
                    success: true,
                    data: {
                        email: verificationToken.identifier,
                        amount: deposit?.amount.toString(),
                        token: deposit?.stable,
                        userId: user.id,
                        hasWallet: !!user.sendaWalletPublicKey
                    }
                };
            } catch (error) {
                console.error("Error verifying invitation:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to verify invitation'
                });
            }
        }),
    createUserAndSendInvitation: publicProcedure
        .input(z.object({
            email: z.string().email(),
        }))
        .mutation(async ({ input }) => {
            try {
                // Check if user already exists
                const existingUser = await prisma.user.findUnique({
                    where: { email: input.email }
                });

                if (existingUser) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'User with this email already exists'
                    });
                }

                // Generate invitation token
                const token = crypto.randomBytes(32).toString('hex');
                const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

                // Create user and verification token in a transaction
                const result = await prisma.$transaction(async (tx) => {
                    const newUser = await tx.user.create({
                        data: {
                            email: input.email,
                            role: "GUEST",
                        },
                    });

                    await tx.verificationToken.create({
                        data: {
                            identifier: input.email,
                            token,
                            expires,
                        },
                    });

                    return newUser;
                });

                // Create a JWT token
                console.log('Creating JWT token with token:', token);
                const jwtToken = jwt.sign(
                    { 
                        token,
                        email: input.email,
                        role: "GUEST"
                    },
                    process.env.AUTH_SECRET!,
                    { expiresIn: '7d' }
                );
                console.log('Generated JWT token:', jwtToken);

                // Send invitation email using existing infrastructure
                const transport = createTransport({
                    host: "smtp.gmail.com",
                    port: 465,
                    secure: true,
                    tls: {
                        rejectUnauthorized: true,
                        minVersion: 'TLSv1.2'
                    },
                    auth: {
                        user: process.env.EMAIL_SERVER_USER,
                        pass: process.env.EMAIL_SERVER_PASSWORD
                    }
                });

                const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-invitation?token=${token}&jwt=${jwtToken}`;
                console.log('Generated invite URL:', inviteUrl);
                const props = {
                    userEmail: input.email,
                    inviteUrl,
                    host: new URL(process.env.NEXT_PUBLIC_APP_URL!).host,
                    url: inviteUrl
                };

                const html = await render(InvitationEmail(props));

                await transport.sendMail({
                    to: input.email,
                    from: process.env.EMAIL_FROM,
                    subject: 'Welcome to Senda - Complete Your Registration',
                    text: `Click the link below to complete your registration:\n${inviteUrl}\n\n`,
                    html,
                });

                return {
                    success: true,
                    message: 'User created and invitation sent successfully',
                    userId: result.id,
                    jwtToken
                };
            } catch (error) {
                console.error("Error creating user and sending invitation:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to create user and send invitation'
                });
            }
        }),
    createWallet: protectedProcedure.mutation(async ({ ctx }) => {
        try {
            const keypair = Keypair.generate();
            const secretBuffer = Buffer.from(keypair.secretKey);

            const { iv, authTag, data: encryptedPrivateKey } = encryptPrivateKey(secretBuffer);

            const updatedUser = await prisma.user.update({
                where: { id: ctx.session.user.id },
                data: {
                    sendaWalletPublicKey: keypair.publicKey.toString(),
                    encryptedPrivateKey,
                    iv,
                    authTag,
                    role: "INDIVIDUAL",
                },
            });

            return {
                success: true,
                data: {
                    publicKey: updatedUser.sendaWalletPublicKey
                }
            };
        } catch (error) {
            console.error("Error creating wallet:", error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: error instanceof Error ? error.message : 'Failed to create wallet'
            });
        }
    }),
    updateProfile: protectedProcedure
        .input(z.object({
            name: z.string().min(1),
            image: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const updatedUser = await prisma.user.update({
                    where: { id: ctx.session.user.id },
                    data: {
                        name: input.name,
                        image: input.image,
                    },
                });

                return {
                    success: true,
                    data: {
                        name: updatedUser.name,
                        image: updatedUser.image,
                    }
                };
            } catch (error) {
                console.error("Error updating profile:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to update profile'
                });
            }
        }),
    sendDepositNotification: protectedProcedure
        .input(z.object({
            recipientEmail: z.string().email(),
            recipientRole: z.enum(['GUEST', 'INDIVIDUAL', 'BUSINESS']),
            senderEmail: z.string().email(),
            senderName: z.string().optional(),
            amount: z.number(),
            token: z.string(),
            escrowId: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            try {
                if (input.recipientRole && input.recipientRole === 'GUEST') {
                    // Check if user exists, if not create them with a wallet
                    let user = await prisma.user.findUnique({
                        where: { email: input.recipientEmail }
                    });

                    if (!user) {
                        const keypair = Keypair.generate();
                        const secretBuffer = Buffer.from(keypair.secretKey);
                        const { iv, authTag, data: encryptedPrivateKey } = encryptPrivateKey(secretBuffer);

                        user = await prisma.user.create({
                            data: {
                                email: input.recipientEmail,
                                role: "GUEST",
                                sendaWalletPublicKey: keypair.publicKey.toString(),
                                encryptedPrivateKey,
                                iv,
                                authTag,
                            },
                        });
                    }

                    const inviteToken = crypto.randomBytes(32).toString('hex');
                    await prisma.verificationToken.create({
                        data: {
                            identifier: input.recipientEmail,
                            token: inviteToken,
                            expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                        },
                    });

                    // Create a JWT token
                    const jwtToken = jwt.sign(
                        { 
                            token: inviteToken,
                            email: input.recipientEmail,
                            role: "GUEST"
                        },
                        process.env.AUTH_SECRET!,
                        { expiresIn: '24h' }
                    );

                    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-invitation?token=${inviteToken}&jwt=${jwtToken}`;
                    
                    if (input.escrowId) {
                        await prisma.verificationToken.update({
                            where: { token: inviteToken },
                            data: {
                                metadata: JSON.stringify({
                                    escrowId: input.escrowId,
                                    amount: input.amount,
                                    token: input.token,
                                })
                            }
                        });
                    }

                    await sendGuestDepositNotificationEmail(
                        input.recipientEmail,
                        inviteUrl,
                        input.senderEmail,
                        input.amount.toFixed(2),
                        input.token,
                        input.senderName
                    );
                } else {
                    await sendDepositNotificationEmail(
                        input.recipientEmail,
                        input.amount,
                        input.token,
                        input.senderName
                    );
                }

                return {
                    success: true,
                    message: 'Notification sent successfully'
                };
            } catch (error) {
                console.error('Error sending deposit notification:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to send deposit notification'
                });
            }
        }),
});

export default userRouter;
