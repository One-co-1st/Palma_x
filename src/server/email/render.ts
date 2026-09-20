import 'server-only';
import { siteUrl } from '@/lib/env';
import { MAILBOXES, type MailboxKey } from './addresses';

/**
 * PALMA's letterhead.
 *
 * Email clients are a browser from 2003 with the developer tools removed:
 * tables, inline styles, no flex, no grid, no webfonts worth relying on. What
 * survives that is typography and restraint, which happens to be what PALMA
 * looks like anyway — so these messages are not a stripped-down version of the
 * site, they are the same institution writing on paper.
 *
 * Everything here composes. A template picks blocks and fills them; none of
 * them writes raw table markup, so the shell can change once and every message
 * changes with it.
 */

export const PALETTE = {
  ink: '#161719',
  inkSoft: '#22242a',
  ivory: '#f4f0e8',
  ivoryBright: '#fbf9f4',
  stone: '#d8d3c9',
  stoneDeep: '#c4bdb0',
  taupe: '#aaa397',
  taupeDeep: '#8c8478',
  olive: '#4a5148',
  champagne: '#c9b58a',
  champagneDeep: '#a8946b',
  oxblood: '#a03740',
  laurel: '#2f7a4e',
} as const;

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── blocks ───────────────────────────────────────────────────────────────── */

/** The one sentence the message exists to deliver. */
export function lede(text: string): string {
  return `<p style="margin:0 0 24px;font-family:${SERIF};font-size:23px;line-height:1.4;color:${PALETTE.ink};">${text}</p>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;font-family:${SANS};font-size:15px;line-height:1.7;color:${PALETTE.inkSoft};">${text}</p>`;
}

/** Small uppercase label, the same one the site uses above a section. */
export function label(text: string): string {
  return `<p style="margin:0 0 10px;font-family:${SANS};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:${PALETTE.taupeDeep};">${escapeHtml(text)}</p>`;
}

export function quiet(text: string): string {
  return `<p style="margin:0 0 14px;font-family:${SANS};font-size:13px;line-height:1.65;color:${PALETTE.taupeDeep};">${text}</p>`;
}

export function rule(): string {
  return `<div style="height:1px;line-height:1px;font-size:0;background:${PALETTE.stone};margin:28px 0;">&nbsp;</div>`;
}

/**
 * The ceremonial panel — a bordered plate for the fact of the matter.
 * Used where the message *is* an announcement rather than an instruction.
 */
export function plate(input: { eyebrow?: string; title: string; meta?: string }): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${PALETTE.stoneDeep};background:${PALETTE.ivory};">
    <tr><td style="padding:26px 28px;text-align:center;">
      ${input.eyebrow ? `<div style="font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${PALETTE.champagneDeep};padding-bottom:12px;">${escapeHtml(input.eyebrow)}</div>` : ''}
      <div style="font-family:${SERIF};font-size:27px;line-height:1.3;color:${PALETTE.ink};">${escapeHtml(input.title)}</div>
      ${input.meta ? `<div style="font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${PALETTE.taupeDeep};padding-top:12px;">${escapeHtml(input.meta)}</div>` : ''}
    </td></tr>
  </table>`;
}

/** A one-time code, set the way a code should be set: big and spaced. */
export function code(value: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${PALETTE.stoneDeep};background:${PALETTE.ivory};">
    <tr><td align="center" style="padding:22px 16px;font-family:${SERIF};font-size:32px;letter-spacing:10px;color:${PALETTE.ink};">${escapeHtml(value)}</td></tr>
  </table>`;
}

/** Term/value rows — a receipt, a reference, the facts of a decision. */
export function facts(rows: [string, string][]): string {
  const body = rows
    .map(
      ([term, value], index) =>
        `<tr><td style="padding:10px 0;${index === 0 ? '' : `border-top:1px solid ${PALETTE.stone};`}font-family:${SANS};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${PALETTE.taupeDeep};">${escapeHtml(term)}</td>
         <td align="right" style="padding:10px 0;${index === 0 ? '' : `border-top:1px solid ${PALETTE.stone};`}font-family:${SANS};font-size:14px;color:${PALETTE.ink};">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${body}</table>`;
}

/**
 * The one thing to do. Bulletproof enough for Outlook: a table cell with the
 * background, an anchor filling it, no border-radius to be dropped.
 */
export function action(input: { href: string; label: string; tone?: 'ink' | 'olive' }): string {
  const background = input.tone === 'olive' ? PALETTE.olive : PALETTE.ink;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr><td style="background:${background};">
      <a href="${escapeHtml(input.href)}" style="display:inline-block;padding:15px 30px;font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${PALETTE.ivory};text-decoration:none;">${escapeHtml(input.label)}</a>
    </td></tr>
  </table>`;
}

/** A link printed in full, for the client that ate the button. */
export function fallbackLink(href: string): string {
  return `<p style="margin:0 0 20px;font-family:${SANS};font-size:12px;line-height:1.6;color:${PALETTE.taupeDeep};word-break:break-all;">If the button does not work, paste this into your browser:<br><span style="color:${PALETTE.olive};">${escapeHtml(href)}</span></p>`;
}

/** A bordered aside — a caution, a boundary, a thing PALMA will not do. */
export function aside(input: { title: string; body: string; tone?: 'plain' | 'warning' }): string {
  const accent = input.tone === 'warning' ? PALETTE.oxblood : PALETTE.champagneDeep;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-left:2px solid ${accent};background:${PALETTE.ivory};">
    <tr><td style="padding:16px 20px;">
      <div style="font-family:${SANS};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:${accent};padding-bottom:8px;">${escapeHtml(input.title)}</div>
      <div style="font-family:${SANS};font-size:13px;line-height:1.65;color:${PALETTE.inkSoft};">${input.body}</div>
    </td></tr>
  </table>`;
}

/** Numbered steps — what happens next, in order. */
export function steps(items: string[]): string {
  const body = items
    .map(
      (item, index) =>
        `<tr>
          <td valign="top" style="width:26px;padding:0 0 12px;font-family:${SERIF};font-size:14px;color:${PALETTE.champagneDeep};">${index + 1}.</td>
          <td valign="top" style="padding:0 0 12px;font-family:${SANS};font-size:14px;line-height:1.6;color:${PALETTE.inkSoft};">${item}</td>
        </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${body}</table>`;
}

/* ── the shell ────────────────────────────────────────────────────────────── */

export type ShellInput = {
  /** Which voice is writing. Sets the signature and the reply address. */
  mailbox: MailboxKey;
  /** The inbox-preview line. Written, not the first sentence repeated. */
  preheader: string;
  /** Composed blocks. */
  body: string;
  /** Shown under a hairline at the foot: how to stop receiving this. */
  unsubscribeUrl?: string;
  /** Overrides the standard "manage in your Dossier" line. */
  footnote?: string;
};

export function shell(input: ShellInput): string {
  const mailbox = MAILBOXES[input.mailbox];

  const manage =
    input.footnote ??
    (input.unsubscribeUrl
      ? `You are receiving this because someone confirmed this address for a PALMA list. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${PALETTE.olive};">Unsubscribe</a> and that list stops at once, every other PALMA subscription is separate.`
      : `This message is part of your PALMA record and is kept in your Dossier at <a href="${siteUrl}/dossier" style="color:${PALETTE.olive};">palmaawards.com</a>.`);

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>PALMA, The Creator Honours</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${PALETTE.ivory};-webkit-text-size-adjust:100%;">
<span style="display:none;opacity:0;visibility:hidden;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.ivory};">
<tr><td align="center" style="padding:36px 14px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${PALETTE.ivoryBright};border:1px solid ${PALETTE.stoneDeep};">

  <!-- letterhead -->
  <tr><td style="background:${PALETTE.ink};padding:30px 34px 26px;">
    <div style="font-family:${SERIF};color:${PALETTE.ivory};font-size:22px;letter-spacing:9px;line-height:1;">PALMA</div>
    <div style="height:1px;line-height:1px;font-size:0;background:${PALETTE.champagneDeep};margin:14px 0 12px;width:42px;">&nbsp;</div>
    <div style="font-family:${SANS};color:${PALETTE.champagne};font-size:9px;letter-spacing:3.5px;text-transform:uppercase;">The Creator Honours</div>
  </td></tr>

  <!-- body -->
  <tr><td style="padding:34px 34px 8px;">
${input.body}
  </td></tr>

  <!-- signature -->
  <tr><td style="padding:0 34px 30px;">
    <div style="height:1px;line-height:1px;font-size:0;background:${PALETTE.stone};margin:0 0 18px;">&nbsp;</div>
    <div style="font-family:${SERIF};font-size:15px;color:${PALETTE.ink};">${escapeHtml(mailbox.name)}</div>
    <div style="font-family:${SANS};font-size:12px;color:${PALETTE.taupeDeep};padding-top:4px;">
      Reply to this message and it reaches us at
      <a href="mailto:${mailbox.address}" style="color:${PALETTE.olive};text-decoration:none;">${mailbox.address}</a>.
    </div>
  </td></tr>

  <!-- foot -->
  <tr><td style="background:${PALETTE.ivory};border-top:1px solid ${PALETTE.stone};padding:20px 34px;">
    <div style="font-family:${SANS};font-size:11px;line-height:1.7;color:${PALETTE.taupeDeep};">
      ${manage}
    </div>
    <div style="font-family:${SANS};font-size:11px;line-height:1.7;color:${PALETTE.taupe};padding-top:10px;">
      PALMA, The Creator Honours · United Kingdom ·
      <a href="${siteUrl}" style="color:${PALETTE.olive};text-decoration:none;">palmaawards.com</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * The plain-text half.
 *
 * Not an afterthought: a text part is what a screen reader, a filter and a
 * forwarded quote all see, and a message with a good one is far less likely to
 * be treated as bulk. Templates write it themselves — auto-stripping the HTML
 * produces the kind of text part that proves nobody read it.
 */
export function plain(lines: (string | null | undefined)[]): string {
  return lines.filter((line) => line !== null && line !== undefined).join('\n');
}
