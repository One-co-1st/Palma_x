import { redirect } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { Masthead } from '@/components/palma/Masthead';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { buildMetadata } from '@/lib/seo';
import { isValidCodeFormat, normaliseCode } from '@/lib/verification';

export const metadata = buildMetadata({
  title: 'Verify an honour',
  description:
    'Check a PALMA. Every honour carries a permanent verification code. Enter it to confirm the recipient, category and season.',
  path: '/verify',
});

type Props = { searchParams: Promise<{ error?: string; code?: string }> };

export default async function VerifyIndexPage({ searchParams }: Props) {
  const { error, code } = await searchParams;

  async function lookup(formData: FormData) {
    'use server';
    const raw = String(formData.get('code') ?? '');
    const normalised = normaliseCode(raw);
    if (!isValidCodeFormat(normalised)) {
      redirect(`/verify?error=format&code=${encodeURIComponent(raw.slice(0, 40))}`);
    }
    redirect(`/verify/${normalised}`);
  }

  return (
    <>
      <Masthead
        eyebrow={'PALMA verification'}
        title="Verify an honour"
        standfirst="Every PALMA carries a permanent code, printed on the certificate and engraved on the trophy. Enter it to see the record exactly as it was conferred."
        meta={['Signed at the moment it was conferred', 'Re-checked on every request']}
        size="compact"
      />

      <Section>
        <Container size="narrow">
          <div className="grid gap-14 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <form action={lookup} className="flex flex-col gap-6">
                <Field
                  htmlFor="code"
                  label="Verification code"
                  hint="In the format PM-2027-XXXXXX. Case does not matter."
                  error={error === 'format' ? 'That is not a valid PALMA code.' : undefined}
                >
                  <Input
                    id="code"
                    name="code"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    defaultValue={code ?? ''}
                    placeholder="PM-2027-K4T9RD"
                    aria-invalid={error === 'format' ? true : undefined}
                    className="font-mono text-lg tracking-[0.18em] uppercase"
                  />
                </Field>

                {/* Checking an honour is a ceremonial act, not a routine one:
                    it gets the seal rather than a rectangle. */}
                <SubmitButton
                  variant="ceremonial"
                  size="seal"
                  className="self-start"
                  pendingLabel="Checking\u2026"
                >
                  Verify
                  <br />
                  the record
                </SubmitButton>
              </form>

              <Notice className="mt-10" title="What verification proves">
                A PALMA verification page is generated from the record created when the honour was
                conferred, and is signed. If any detail of the record were altered, the name, the
                category, the season, the signature would no longer match and the page would refuse
                to render.
              </Notice>
            </div>

            <div className="flex justify-center sm:col-span-2">
              <PalmaSeal className="text-olive h-44 w-44" sublegend="VERIFIED RECORD" />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
