"use client"

import * as z from 'zod'
import React, {useState} from "react"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { trpc } from "@/app/_trpc/client"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

const SignupForm = () => {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onChange',
  })

  const createUserAndSendInvitation = trpc.userRouter.createUserAndSendInvitation.useMutation({
    onSuccess: () => {
      toast.success('Invitation sent! Check your email to complete registration.')
      form.reset()
      setIsLoading(false)
    },
    onError: (error) => {
      toast.error(error.message)
      setIsLoading(false)
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isLoading) return
    setIsLoading(true)
    createUserAndSendInvitation.mutate({ email: values.email })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col items-center gap-6 w-full">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormControl>
                <Input placeholder="Enter your email" className="w-full h-12 text-lg" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={isLoading || !form.formState.isValid}
          className="w-full h-12 text-lg cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sending invitation...
            </>
          ) : (
            'Create'
          )}
        </Button>
      </form>
    </Form>
  )
}

export default SignupForm;