'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { Notice } from '@/components/ui/feedback';
import {
  closeAccount,
  requestEmailChange,
  revokeOtherSessions,
  type AccountState,
} from '@/server/actions/account';
import { changePassword, type PasswordState } from '@/server/actions/password';

const accountInitial: AccountState = { status: 'idle' };
const passwordInitial: PasswordState = { status: 'idle' };

function Feedback({
  state,
  title,
}: {
  state: { status: string; message?: string };
  title: string;
}) {
  if (state.status === 'idle' || !state.message) return null;
  return (
    <Notice
      tone={state.status === 'error' ? 'error' : 'ceremonial'}
      title={state.status === 'error' ? title : 'Done'}
    >
      {state.message}
    </Notice>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, passwordInitial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Feedback state={state} title="Not changed" />

      <Field htmlFor="currentPassword" label="Current password" required>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          required
          autoComplete="current-password"
        />
      </Field>

      <Field
        htmlFor="newPassword"
        label="New password"
        required
        hint="At least 12 characters, mixing cases or including a number."
        error={state.errors?.password}
      >
        <PasswordInput
          id="newPassword"
          name="password"
          required
          autoComplete="new-password"
          minLength={12}
        />
      </Field>

      <Field
        htmlFor="confirmNewPassword"
        label="Repeat it"
        required
        error={state.errors?.confirmPassword}
      >
        <PasswordInput
          id="confirmNewPassword"
          name="confirmPassword"
          required
          autoComplete="new-password"
        />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Changing…' : 'Change password'}
      </Button>
    </form>
  );
}

export function ChangeEmailForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(requestEmailChange, accountInitial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Feedback state={state} title="Not changed" />

      <Field
        htmlFor="newEmail"
        label="New address"
        required
        hint={`Currently ${current}. The new address has to confirm before anything moves.`}
        error={state.errors?.newEmail}
      >
        <Input id="newEmail" name="newEmail" type="email" required autoComplete="email" />
      </Field>

      <Field htmlFor="emailPassword" label="Your password" required error={state.errors?.password}>
        <PasswordInput
          id="emailPassword"
          name="password"
          required
          autoComplete="current-password"
        />
      </Field>

      <Button type="submit" variant="outline" size="md" disabled={pending} className="self-start">
        {pending ? 'Sending…' : 'Send the confirmation'}
      </Button>
    </form>
  );
}

export function RevokeSessionsForm({ others }: { others: number }) {
  return (
    <form action={revokeOtherSessions}>
      <Button type="submit" variant="outline" size="sm" disabled={others === 0}>
        {others === 0
          ? 'No other sessions'
          : `Sign out ${others} other session${others === 1 ? '' : 's'}`}
      </Button>
    </form>
  );
}

export function CloseAccountForm({ heldRecord }: { heldRecord: string | null }) {
  const [state, action, pending] = useActionState(closeAccount, accountInitial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Feedback state={state} title="Not closed" />

      <Notice tone="warning" title="What closing does">
        Your sign-in, sessions, Dossier and preferences are deleted, and you are signed out
        everywhere. It cannot be undone.
        {heldRecord ? (
          <>
            {' '}
            <strong>{heldRecord}</strong> stays in the archive and becomes unclaimed again, with any
            honour on it intact, PALMA&rsquo;s record of what happened does not belong to the
            account that held it.
          </>
        ) : null}
      </Notice>

      <Field htmlFor="closePassword" label="Your password" required error={state.errors?.password}>
        <PasswordInput
          id="closePassword"
          name="password"
          required
          autoComplete="current-password"
        />
      </Field>

      <Field htmlFor="confirm" label="Type CLOSE to confirm" required error={state.errors?.confirm}>
        <Input id="confirm" name="confirm" required autoComplete="off" placeholder="CLOSE" />
      </Field>

      <Button type="submit" variant="danger" size="md" disabled={pending} className="self-start">
        {pending ? 'Closing…' : 'Close my account'}
      </Button>
    </form>
  );
}
