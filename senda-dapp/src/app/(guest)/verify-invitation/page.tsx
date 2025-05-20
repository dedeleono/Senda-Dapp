"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/app/_trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    image: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

function VerifyInvitationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const jwtToken = searchParams.get("jwt");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { update: updateSession } = useSession();

    const { data: verificationData, isLoading: isLoadingVerification } = trpc.userRouter.verifyInvitation.useQuery(
        { 
            token: token || "",
            jwt: jwtToken || ""
        },
        {
            enabled: !!token && !!jwtToken,
            retry: false,
        }
    );

    useEffect(() => {
        if (verificationData?.success === false) {
            toast.error("Invalid or expired invitation link");
            router.push("/");
        }
    }, [verificationData, router]);

    const updateProfile = trpc.userRouter.updateProfile.useMutation({
        onSuccess: () => {
            toast.success("Profile updated successfully");
        },
        onError: (error) => {
            toast.error(error.message);
            setIsSubmitting(false);
        },
    });

    const createWallet = trpc.userRouter.createWallet.useMutation({
        onSuccess: () => {
            toast.success("Wallet created successfully");
            router.push("/");
        },
        onError: (error) => {
            toast.error(error.message);
            setIsSubmitting(false);
        },
    });

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            image: "",
        },
    });

    const handleSubmit = async (data: FormData) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            if (!jwtToken) {
                throw new Error("No JWT token available");
            }

            // Sign in with the JWT token first
            const signInResult = await signIn("credentials", {
                token: jwtToken,
                redirect: false,
            });

            if (signInResult?.error) {
                throw new Error(signInResult.error);
            }

            // Wait for session to be established
            await new Promise(resolve => setTimeout(resolve, 1000));
            await updateSession();

            // Update profile and create wallet in parallel
            const [profileResult, walletResult] = await Promise.all([
                updateProfile.mutateAsync({
                    name: data.name,
                    image: data.image,
                }),
                createWallet.mutateAsync()
            ]);

            // Update the session with all new data
            await updateSession();

            // Redirect to home page
            router.push("/home");
            toast.success("Profile updated successfully");
            return [profileResult, walletResult];
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An error occurred");
            setIsSubmitting(false);
        }
    };

    if (isLoadingVerification) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!verificationData?.success) {
        return null;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Complete Your Profile</CardTitle>
                    <CardDescription>
                        Set up your profile and create your wallet to get started
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder="Your name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    "Complete Setup"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function VerifyInvitationPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <VerifyInvitationContent />
        </Suspense>
    );
}
