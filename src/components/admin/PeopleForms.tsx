'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Input, Label, Select, Textarea } from '@/components/ui/form';
import { INVITABLE_ROLES, ROLES, type Role } from '@/lib/auth/rbac';
import {
  changeUserRole,
  decideConsequentialAction,
  inviteOperator,
  issueOperatorPasswordReset,
  proposeConsequentialAction,
  revokeSessions,
  setAccountState,
  type PeopleState,
} from '@/server/actions/people';

const idle: PeopleState = { status: 'idle' };

function Feedback({ state }: { state: PeopleState }) {
  if (state.status === 'idle' || !state.message) return null;
  return <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>;
}

export function RoleForm({ userId, role }: { userId: string; role: Role }) {
  const [state, action, pending] = useActionState(changeUserRole, idle);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <Feedback state={state} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={`role-${userId}`}>Role</Label>
          <Select id={`role-${userId}`} name="role" defaultValue={role}>
            {ROLES.filter((entry) => entry !== 'visitor').map((entry) => (
              <option key={entry} value={entry}>
                {entry.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Change role'}
        </Button>
      </div>
    </form>
  );
}

export function AccountStateForm({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [state, action, pending] = useActionState(setAccountState, idle);
  const [open, setOpen] = React.useState(false);

  if (!isActive) {
    return (
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="suspend" value="false" />
        <Feedback state={state} />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? 'Restoring…' : 'Restore account'}
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="suspend" value="true" />
      <Feedback state={state} />

      {open ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`reason-${userId}`}>Reason for suspension</Label>
            <Textarea id={`reason-${userId}`} name="reason" className="min-h-20" required />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
              {pending ? 'Suspending…' : 'Suspend and sign out'}
            </Button>
            <Button type="button" variant="quiet" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-taupe text-xs leading-relaxed">
            Reversible. Every session ends immediately, because an account suspended but still
            signed in somewhere is not suspended.
          </p>
        </>
      ) : (
        <Button type="button" variant="quiet" size="sm" onClick={() => setOpen(true)}>
          Suspend account
        </Button>
      )}
    </form>
  );
}

/**
 * Bring a colleague onto the desk.
 *
 * The only place a judge, moderator or administrator account is created.
 * No password field — the invited person sets their own, from the link this
 * sends them. The judge fields only matter, and only appear, when the role
 * chosen is judge.
 */
export function InviteOperatorForm() {
  const [state, action, pending] = useActionState(inviteOperator, idle);
  const [role, setRole] = React.useState<(typeof INVITABLE_ROLES)[number]>('judge');
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.status === 'success') formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <Feedback state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-name">Name</Label>
          <Input id="invite-name" name="name" required maxLength={120} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" name="email" type="email" required maxLength={200} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-role">What they will do at PALMA</Label>
        <Select
          id="invite-role"
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as typeof role)}
        >
          {INVITABLE_ROLES.map((entry) => (
            <option key={entry} value={entry}>
              {entry.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>

      {role === 'judge' ? (
        <div className="border-stone-deep flex flex-col gap-4 border-l-2 pl-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-judge-name">Name shown on the panel page</Label>
            <Input id="invite-judge-name" name="judgeDisplayName" required maxLength={120} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-judge-title">Title</Label>
              <Input id="invite-judge-title" name="judgeTitle" maxLength={120} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-judge-org">Organisation</Label>
              <Input id="invite-judge-org" name="judgeOrganisation" maxLength={120} />
            </div>
          </div>
        </div>
      ) : null}

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Inviting…' : 'Send invitation'}
      </Button>
      <p className="text-taupe text-xs leading-relaxed">
        This is the only way this kind of account is ever created. There is no sign-up form for one
        , the account exists the moment you send this, but cannot be signed into until the
        invitation link sets a password.
      </p>
    </form>
  );
}

/** Reissue a set-password link. The only way back in for a locked-out operator. */
export function IssueResetLinkForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(issueOperatorPasswordReset, idle);

  if (state.status === 'success') {
    return <Notice tone="ceremonial">{state.message}</Notice>;
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Feedback state={state} />
      <Button type="submit" variant="quiet" size="sm" disabled={pending}>
        {pending ? 'Sending…' : 'Send a new password link'}
      </Button>
    </form>
  );
}

export function RevokeSessionsForm({ userId, count }: { userId: string; count: number }) {
  const [state, action, pending] = useActionState(revokeSessions, idle);

  if (count === 0) return null;

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Feedback state={state} />
      <Button type="submit" variant="quiet" size="sm" disabled={pending}>
        {pending ? 'Ending…' : `End ${count} session${count === 1 ? '' : 's'}`}
      </Button>
    </form>
  );
}

/** Propose something irreversible. The proposer never executes it. */
export function ProposeActionForm() {
  const [state, action, pending] = useActionState(proposeConsequentialAction, idle);

  if (state.status === 'success') {
    return (
      <Notice tone="ceremonial" title="Proposed">
        {state.message}
      </Notice>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Feedback state={state} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="kind">What is being proposed</Label>
        <Select id="kind" name="kind" defaultValue="account_ban">
          <option value="account_ban">Permanent account ban</option>
          <option value="honour_revocation">Revocation of an honour</option>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="entityId">Record id</Label>
        <input
          id="entityId"
          name="entityId"
          required
          className="border-stone-deep bg-ivory-bright text-ink focus:border-olive h-11 w-full border px-3 font-mono text-sm focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="subject">Who or what this concerns</Label>
        <input
          id="subject"
          name="subject"
          required
          placeholder="e.g. maya@example.com, or PALMA 2027 Winner, Best New Creator"
          className="border-stone-deep bg-ivory-bright text-ink placeholder:text-taupe focus:border-olive h-11 w-full border px-3 text-sm focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea id="reason" name="reason" className="min-h-28" required />
        <p className="text-taupe text-xs leading-relaxed">
          Recorded in full, permanently, and shown to the administrator who has to approve it.
        </p>
      </div>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Proposing…' : 'Propose'}
      </Button>
    </form>
  );
}

export function DecideActionForm({ actionId }: { actionId: string }) {
  const [state, action, pending] = useActionState(decideConsequentialAction, idle);

  if (state.status === 'success') {
    return <Notice tone="ceremonial">{state.message}</Notice>;
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="actionId" value={actionId} />
      <Feedback state={state} />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="decision" value="approve" size="sm" disabled={pending}>
          {pending ? 'Working…' : 'Approve and carry out'}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="cancel"
          variant="outline"
          size="sm"
          disabled={pending}
        >
          Cancel proposal
        </Button>
      </div>
    </form>
  );
}
