import { describe, expect, it } from 'vitest';
import { MAILBOXES, MAILBOX_LIST, sender, replyTo } from '@/server/email/addresses';
import { TEMPLATES, TEMPLATE_LIST, isSuppressible } from '@/server/email/register';

/**
 * The register is the answer to "does PALMA email people about X?" — so these
 * assert the properties an operator would otherwise have to take on trust.
 */
describe('who PALMA writes as', () => {
  it('publishes no noreply address', () => {
    for (const mailbox of MAILBOX_LIST) {
      expect(mailbox.address).not.toMatch(/no-?reply/i);
    }
  });

  it('sends every message from an address that accepts replies', () => {
    for (const template of TEMPLATE_LIST) {
      const mailbox = MAILBOXES[template.mailbox];
      expect(mailbox, `${template.key} has no mailbox`).toBeDefined();
      expect(replyTo(template.mailbox)).toBe(mailbox.address);
    }
  });

  it('formats a sender the provider will accept', () => {
    expect(sender('concierge')).toBe('PALMA Concierge <concierge@palmaawards.com>');
  });

  it('uses palmaawards.com throughout', () => {
    for (const mailbox of MAILBOX_LIST) {
      expect(mailbox.address.endsWith('@palmaawards.com')).toBe(true);
    }
  });
});

describe('what a person may switch off', () => {
  /**
   * The hard line. An account that can mute the news that its honour was
   * revoked, or that its password changed, is not being kept informed — so
   * these templates must never become suppressible, whatever a preferences
   * page later grows.
   */
  const NEVER_SUPPRESSIBLE = [
    'password_reset',
    'operator_invite',
    'password_changed',
    'email_change_confirm',
    'email_change_notice',
    'account_closed',
    'claim_approved',
    'claim_refused',
    'record_published',
    'verification_outcome',
    'honour_revoked',
    'enforcement_notice',
    'panel_assignment',
    'nomination_code',
  ] as const;

  it.each(NEVER_SUPPRESSIBLE)('never suppresses %s', (key) => {
    expect(isSuppressible(key)).toBe(false);
  });

  it('lets the announcements be switched off', () => {
    expect(isSuppressible('honour_conferred')).toBe(true);
    expect(isSuppressible('candidacy_update')).toBe(true);
    expect(isSuppressible('list_issue')).toBe(true);
  });

  it('sends security mail from the security mailbox, always', () => {
    for (const key of ['password_reset', 'password_changed', 'email_change_notice'] as const) {
      expect(TEMPLATES[key].mailbox).toBe('security');
      expect(TEMPLATES[key].gate).toBe('always');
    }
  });

  it('sends enforcement and revocation from the mailbox that handles appeals', () => {
    expect(TEMPLATES.enforcement_notice.mailbox).toBe('concerns');
    expect(TEMPLATES.honour_revoked.mailbox).toBe('concerns');
  });

  it('keeps a Dossier entry for everything consequential', () => {
    const consequential = TEMPLATE_LIST.filter((template) => template.important);
    expect(consequential.length).toBeGreaterThan(0);
    for (const template of consequential) {
      expect(template.dossier, `${template.key} is important but keeps no Dossier entry`).toBe(
        true,
      );
    }
  });

  it('declares every template exactly once, keyed by its own name', () => {
    for (const [key, template] of Object.entries(TEMPLATES)) {
      expect(template.key).toBe(key);
    }
  });
});
