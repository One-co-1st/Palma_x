import { describe, expect, it } from 'vitest';
import {
  checkEvidenceLink,
  checkUpload,
  containsExplicitLanguage,
  MAX_UPLOAD_BYTES,
} from '@/domain/content-policy';

describe('evidence links', () => {
  it('accepts and normalises an ordinary link', () => {
    const result = checkEvidenceLink('example.com/work/2027');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url.startsWith('https://')).toBe(true);
      expect(result.host).toBe('example.com');
    }
  });

  it('strips a leading www from the recorded host', () => {
    const result = checkEvidenceLink('https://www.example.com/a');
    expect(result.ok && result.host).toBe('example.com');
  });

  it('refuses script and data URLs', () => {
    for (const value of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,<script>',
      'vbscript:msgbox',
      'file:///etc/passwd',
    ]) {
      expect(checkEvidenceLink(value).ok, value).toBe(false);
    }
  });

  it('refuses links carrying credentials', () => {
    expect(checkEvidenceLink('https://user:pass@example.com').ok).toBe(false);
  });

  it('refuses input that is not a domain', () => {
    expect(checkEvidenceLink('').ok).toBe(false);
    expect(checkEvidenceLink('not a link').ok).toBe(false);
    expect(checkEvidenceLink('localhost').ok).toBe(false);
  });
});

describe('uploads', () => {
  it('permits only still images, within the size limit', () => {
    expect(checkUpload({ type: 'image/jpeg', size: 1000 }).ok).toBe(true);
    expect(checkUpload({ type: 'image/avif', size: 1000 }).ok).toBe(true);
    expect(checkUpload({ type: 'video/mp4', size: 1000 }).ok).toBe(false);
    expect(checkUpload({ type: 'application/pdf', size: 1000 }).ok).toBe(false);
    expect(checkUpload({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 }).ok).toBe(false);
  });
});

describe('public copy screening', () => {
  it('catches the obvious policy breaches in profile prose', () => {
    expect(containsExplicitLanguage('Escort services available')).toBe(true);
    expect(containsExplicitLanguage('NSFW content daily')).toBe(true);
  });

  it('leaves ordinary professional copy alone', () => {
    expect(
      containsExplicitLanguage('Long-form video essayist working on labour and the internet.'),
    ).toBe(false);
  });
});
