'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const signupSchema = z.object({
  username: z.string()
    .min(3, 'At least 3 characters')
    .max(20, 'Max 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, underscores only'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  starting_bankroll: z.coerce.number().min(0, 'Must be 0 or more').max(10000000),
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof signupSchema>, unknown, SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { starting_bankroll: 0 },
  })

  async function onSubmit(data: SignupForm) {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            starting_bankroll: data.starting_bankroll,
          },
        },
      })
      if (error) throw error

      toast.success('Account created! Welcome to Ariel MINT.')
      router.push('/dashboard')
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white">Create your account</CardTitle>
        <CardDescription className="text-slate-400">
          Start tracking your betting performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-slate-300">Username</Label>
            <Input
              id="username"
              placeholder="sharpcapper"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              {...register('username')}
            />
            {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              {...register('password')}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="starting_bankroll" className="text-slate-300">
              Starting bankroll ($)
              <span className="ml-1 text-slate-500 font-normal">— your current betting funds</span>
            </Label>
            <Input
              id="starting_bankroll"
              type="number"
              step="0.01"
              min="0"
              placeholder="1000.00"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              {...register('starting_bankroll')}
            />
            {errors.starting_bankroll && <p className="text-xs text-red-400">{errors.starting_bankroll.message}</p>}
          </div>
          <Button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Account
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
