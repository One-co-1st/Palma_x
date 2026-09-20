import { Container, Section } from '@/components/palma/layout';
import { Wordmark } from '@/components/brand/Wordmark';
import { PalmMark } from '@/components/brand/PalmMark';
import { SignInForm } from './AuthForms';
import { type Entrance } from '@/lib/auth/entrances';

/**
 * A door.
 *
 * Each entrance is its own page with its own panel. They share this layout so
 * they look like parts of one institution, and share nothing else — a door
 * admits one kind of account and says so before anyone types a password.
 */
export function EntrancePanel({
  entrance,
  next,
  children,
}: {
  entrance: Entrance;
  next?: string;
  children?: React.ReactNode;
}) {
  return (
    <Section tone="stone" className="relative overflow-hidden py-16 sm:py-24">
      <PalmMark
        className="text-ink pointer-events-none absolute -top-10 -right-24 -z-10 h-96 opacity-[0.04] sm:-right-16 sm:h-[34rem]"
        aria-hidden="true"
      />

      <Container size="narrow">
        <div className="mx-auto flex max-w-120 flex-col gap-10">
          <div className="flex flex-col gap-5">
            <Wordmark size="md" descriptor />

            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="bg-olive inline-block size-2 rounded-full" />
              <span className="palma-label text-olive">{entrance.eyebrow}</span>
            </span>

            <h1 className="text-4xl leading-tight sm:text-5xl">{entrance.title}</h1>
            <span aria-hidden="true" className="bg-stone-deep block h-px w-full" />
            <p className="text-taupe-deep leading-relaxed">{entrance.standfirst}</p>
          </div>

          <div className="border-stone-deep bg-ivory border p-7 sm:p-9">
            <SignInForm
              next={next}
              entrance={entrance.key}
              submitLabel={entrance.key === 'creator' ? 'Sign in' : `Enter`}
              showRegister={entrance.key === 'creator'}
            />
          </div>

          {children}
        </div>
      </Container>
    </Section>
  );
}
