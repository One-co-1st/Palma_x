import Link from 'next/link';
import { Container, Section, SectionHeading } from '@/components/palma/layout';
import { Masthead, MastheadPlate, PlateFact } from '@/components/palma/Masthead';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { buildMetadata } from '@/lib/seo';
import { CONTACTS, ENTITY } from '@/lib/legal';

export const metadata = buildMetadata({
  title: 'Contact',
  description:
    'Who to write to at PALMA about nominations, the record, data protection, security, accessibility, press and partnerships, with the timescales each is answered in.',
  path: '/contact',
});

type Desk = {
  label: string;
  address: string;
  description: string;
  timescale: string;
  href?: { label: string; url: string };
};

const DESKS: Desk[] = [
  {
    label: 'General',
    address: CONTACTS.general,
    description:
      'Anything about PALMA, a season, a nomination, or a correction to the public record.',
    timescale: '10 working days',
  },
  {
    label: 'Integrity and appeals',
    address: CONTACTS.integrity,
    description:
      'A concern about the conduct of a season, a disputed screening decision, or an appeal against a decision about you.',
    timescale: 'Acknowledged in 5, decided in 20',
    href: { label: 'Complaints and appeals', url: '/legal/complaints' },
  },
  {
    label: 'Data protection',
    address: CONTACTS.privacy,
    description:
      'Access requests, corrections, objections, erasure, and anything else under UK GDPR.',
    timescale: 'One month, as the law requires',
    href: { label: 'Privacy notice', url: '/legal/privacy' },
  },
  {
    label: 'Security disclosure',
    address: CONTACTS.security,
    description:
      'Vulnerabilities, exposure, anything that threatens the integrity of the record. Report in good faith and PALMA will not pursue you.',
    timescale: '2 working days',
    href: { label: 'security.txt', url: '/.well-known/security.txt' },
  },
  {
    label: 'Accessibility',
    address: CONTACTS.accessibility,
    description:
      'Something on this site stopped you. Tell us the page, what you were doing, and what you use.',
    timescale: 'Acknowledged in 5, answered in 20',
    href: { label: 'Accessibility statement', url: '/legal/accessibility' },
  },
  {
    label: 'Press',
    address: CONTACTS.press,
    description:
      'Interviews, imagery, the press kit, and questions about how to describe an honour correctly.',
    timescale: '2 working days in season',
    href: { label: 'Press kit', url: '/press' },
  },
  {
    label: 'Partnerships',
    address: CONTACTS.partnerships,
    description:
      'Sponsorship and category partnership. Read what a partnership cannot buy before you write.',
    timescale: '10 working days',
    href: { label: 'Partners', url: '/about/sponsors' },
  },
];

export default function ContactPage() {
  return (
    <>
      <Masthead
        eyebrow="The institution"
        title="Contact"
        standfirst="Seven desks, each with a named address and the timescale PALMA holds itself to. There is no contact form, because a form is a way of not giving you an address."
        meta={[`${DESKS.length} desks`, 'Named timescales', ENTITY.jurisdiction]}
        plate={
          <MastheadPlate label="Where to write">
            <dl className="grid grid-cols-2 gap-5">
              <PlateFact term="Desks">{DESKS.length}</PlateFact>
              <PlateFact term="General reply">10 days</PlateFact>
              <PlateFact term="Security reply">2 days</PlateFact>
              <PlateFact term="Data requests">1 month</PlateFact>
            </dl>
          </MastheadPlate>
        }
      />

      <Section className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            label="Write to"
            title="The desks"
            standfirst="Pick the closest one. A message sent to the wrong desk is forwarded, not returned."
          />

          <RevealGroup className="mt-14 flex flex-col">
            {DESKS.map((desk, index) => (
              <RevealItem key={desk.address}>
                <div className="palma-row border-stone-deep grid gap-4 border-t py-7 last:border-b sm:grid-cols-12 sm:gap-8">
                  <span className="palma-label text-taupe sm:col-span-1">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="sm:col-span-4">
                    <h2 className="palma-row-lead font-display text-2xl leading-tight">
                      {desk.label}
                    </h2>
                    <a
                      href={`mailto:${desk.address}`}
                      className="palma-link text-taupe-deep hover:text-ink mt-2 inline-block text-sm"
                    >
                      {desk.address}
                    </a>
                  </div>

                  <p className="text-taupe-deep text-sm leading-relaxed sm:col-span-5">
                    {desk.description}
                    {desk.href ? (
                      <>
                        {' '}
                        <Link href={desk.href.url} className="palma-link text-ink">
                          {desk.href.label}
                        </Link>
                        .
                      </>
                    ) : null}
                  </p>

                  <span className="palma-label text-taupe sm:col-span-2 sm:text-right">
                    {desk.timescale}
                  </span>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </Section>

      <Section tone="stone" className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <Reveal>
                <div className="border-stone-deep bg-ivory border p-8">
                  <h2 className="palma-label text-taupe-deep mb-4">Urgent and unsafe</h2>
                  <p className="text-taupe-deep text-sm leading-relaxed">
                    If something on PALMA is abusive, illegal, or presents a risk to a person, do
                    not use email and do not wait for a reply. Use the{' '}
                    <Link href="/report" className="palma-link text-ink">
                      report form
                    </Link>
                    , which is monitored, and contact the police where a person is at risk.
                  </p>
                  <p className="text-taupe mt-4 text-xs leading-relaxed">
                    PALMA reports child sexual abuse material and credible threats to life to the
                    relevant authorities immediately, and without notifying the person who submitted
                    the material.
                  </p>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-6">
              <Reveal delay={0.05}>
                <div className="border-stone-deep bg-ivory border p-8">
                  <h2 className="palma-label text-taupe-deep mb-4">The entity</h2>
                  <dl className="flex flex-col gap-4 text-sm">
                    <div className="border-stone-deep/60 flex justify-between gap-6 border-b pb-3">
                      <dt className="text-taupe-deep">Registered name</dt>
                      <dd className="text-right">{ENTITY.name}</dd>
                    </div>
                    <div className="border-stone-deep/60 flex justify-between gap-6 border-b pb-3">
                      <dt className="text-taupe-deep">Trading as</dt>
                      <dd className="text-right">{ENTITY.tradingAs}</dd>
                    </div>
                    <div className="border-stone-deep/60 flex justify-between gap-6 border-b pb-3">
                      <dt className="text-taupe-deep">Jurisdiction</dt>
                      <dd className="text-right">{ENTITY.jurisdiction}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-taupe-deep">Registered office</dt>
                      <dd className="text-taupe text-right">
                        {ENTITY.registeredOffice ?? 'Published once registered'}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-taupe mt-6 text-xs leading-relaxed">
                    The full register of PALMA&rsquo;s published documents is at{' '}
                    <Link href="/legal" className="palma-link text-ink">
                      /legal
                    </Link>
                    .
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
