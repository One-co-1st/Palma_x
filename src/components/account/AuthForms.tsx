'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, Input } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { Notice } from '@/components/ui/feedback';
import { register, signIn, type AuthState } from '@/server/actions/auth';
import { requestPasswordReset, resetPassword, type PasswordState } from '@/server/actions/password';

const initial: AuthState = { status: 'idle' };

export function SignInForm({
  next,
  entrance = 'creator',
  submitLabel = 'Sign in',
  showRegister = true,
}: {
  next?: string;
  /** Which door this form belongs to. The server refuses the wrong role here. */
  entrance?: 'creator' | 'judge' | 'moderator' | 'admin';
  submitLabel?: string;
  showRegister?: boolean;
}) {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="entrance" value={entrance} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === 'error' && state.message ? (
        <Notice tone="error" title={state.wrongDoor ? 'Wrong entrance' : 'Could not sign in'}>
          {state.message}
          {state.wrongDoor ? (
            <>
              {' '}
              <Link href={state.wrongDoor.path} className="palma-link text-ink">
                Go to {state.wrongDoor.title.toLowerCase()}
              </Link>
              .
            </>
          ) : null}
        </Notice>
      ) : null}

      <Field htmlFor="email" label="Email" required error={state.errors?.email}>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>

      <Field htmlFor="password" label="Password" required error={state.errors?.password}>
        <PasswordInput id="password" name="password" required autoComplete="current-password" />
      </Field>

      <Button type="submit" size="md" disabled={pending}>
        {pending ? 'Signing in…' : submitLabel}
      </Button>

      {/* Every door carries this. Losing a password is the most ordinary way
          to lose an account, and it should never be the end of the road. */}
      <p className="text-taupe-deep text-sm">
        <Link href="/forgot" className="palma-link hover:text-ink">
          Forgotten your password?
        </Link>
      </p>

      {showRegister ? (
        <p className="text-taupe-deep text-sm">
          No account?{' '}
          <Link href="/register" className="palma-link hover:text-ink">
            Create one
          </Link>
          .
        </p>
      ) : null}
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initial);

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status === 'error' && state.message ? (
        <Notice tone="error" title="Could not create the account">
          {state.message}
        </Notice>
      ) : null}

      <Field htmlFor="name" label="Your name" required error={state.errors?.name}>
        <Input id="name" name="name" required autoComplete="name" />
      </Field>

      <Field htmlFor="email" label="Email" required error={state.errors?.email}>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>

      <Field
        htmlFor="password"
        label="Password"
        required
        hint="At least 12 characters, mixing cases or including a number."
        error={state.errors?.password}
      >
        <PasswordInput
          id="password"
          name="password"
          required
          autoComplete="new-password"
          minLength={12}
        />
      </Field>

      <CheckboxField
        id="acceptTerms"
        name="acceptTerms"
        label="I accept the PALMA terms and content policy."
        error={state.errors?.acceptTerms}
      />

      <Button type="submit" size="md" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-taupe-deep text-sm">
        Already have an account?{' '}
        <Link href="/creator" className="palma-link hover:text-ink">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}

const passwordInitial: PasswordState = { status: 'idle' };

/**
 * Asking for a link.
 *
 * The answer is the same sentence whether or not the address has an account,
 * and the form is replaced by it — so there is nothing to submit twice and
 * nothing to compare between two attempts.
 */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, passwordInitial);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Check your inbox">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status === 'error' && state.message ? (
        <Notice tone="error" title="Could not send the link">
          {state.message}
        </Notice>
      ) : null}

      <Field htmlFor="email" label="Email" required>
        <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
      </Field>

      <Button type="submit" size="md" disabled={pending}>
        {pending ? 'Sending…' : 'Send the link'}
      </Button>

      <p className="text-taupe-deep text-sm">
        Remembered it?{' '}
        <Link href="/creator" className="palma-link hover:text-ink">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}

/** Spending it. The token rides in a hidden field rather than the form data. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, passwordInitial);

  if (state.status === 'success') {
    return (
      <div className="flex flex-col gap-6">
        <Notice tone="ceremonial" title="Password set">
          {state.message}
        </Notice>
        <Button asChild size="md" className="self-start">
          <Link href={state.signInPath ?? '/creator'}>Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="token" value={token} />

      {state.status === 'error' && state.message ? (
        <Notice tone="error" title="Could not set the password">
          {state.message}
        </Notice>
      ) : null}

      <Field
        htmlFor="password"
        label="New password"
        required
        hint="At least 12 characters, mixing cases or including a number."
        error={state.errors?.password}
      >
        <PasswordInput
          id="password"
          name="password"
          required
          autoComplete="new-password"
          minLength={12}
          autoFocus
        />
      </Field>

      <Field
        htmlFor="confirmPassword"
        label="Repeat it"
        required
        error={state.errors?.confirmPassword}
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          required
          autoComplete="new-password"
        />
      </Field>

      <Button type="submit" size="md" disabled={pending}>
        {pending ? 'Setting…' : 'Set the password'}
      </Button>
    </form>
  );
}
