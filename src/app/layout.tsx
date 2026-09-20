import type { Metadata, Viewport } from 'next';
import { Amatic_SC, Fraunces, Inter } from 'next/font/google';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { THEME_BOOTSTRAP } from '@/lib/theme';
import { organisationJsonLd, SITE_DESCRIPTOR, SITE_NAME, JsonLd } from '@/lib/seo';
import { siteUrl } from '@/lib/env';
import './globals.css';
import { ENTITY } from '@/lib/legal';

const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-palma-display',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-palma-sans',
});

/**
 * The annotation face.
 *
 * Used two or three times on the whole site — a hand in the margin of an
 * institutional page. Used more than that it becomes a gimmick, so it is
 * deliberately not available as a general utility: see `.palma-annotation`.
 */
const annotation = Amatic_SC({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
  variable: '--font-palma-annotation',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME}, ${SITE_DESCRIPTOR}`,
    template: `%s, ${SITE_NAME}`,
  },
  description:
    'PALMA, The Creator Honours. Recognising the people shaping creator culture, and keeping the permanent record of who they are.',
  applicationName: SITE_NAME,
  keywords: ['PALMA', 'Palma Awards', 'creator awards', 'The Creator Honours', 'creator industry'],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: ENTITY.name,
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_GB',
    url: siteUrl,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f0e8' },
    { media: '(prefers-color-scheme: dark)', color: '#14151a' },
  ],
  colorScheme: 'light dark',
  /**
   * The page runs to the physical edge of the screen.
   *
   * Without this a notched phone letterboxes the document below the status
   * bar, which puts a strip of nothing above a header that is supposed to be
   * the top of the page. With it, the header runs under the status bar and
   * pads itself back out with `env(safe-area-inset-top)`, so the ivory reaches
   * the edge and the header is genuinely at the top.
   */
  viewportFit: 'cover',
};

/**
 * The root stays static.
 *
 * Reading `headers()` here opts every page into dynamic rendering, including
 * the public record that should be cached at the edge. Public chrome lives in
 * `(public)/layout.tsx`; the desks and rooms bring their own shells.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${sans.variable} ${annotation.variable}`}>
      <head>
        {/* Applies the reader's theme before first paint. Without it, every
            reader who chose Ink gets a white flash on every navigation. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <MotionProvider>{children}</MotionProvider>
        <JsonLd data={organisationJsonLd()} />
      </body>
    </html>
  );
}
