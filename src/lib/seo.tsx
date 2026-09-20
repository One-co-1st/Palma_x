import type { Metadata } from 'next';
import { siteUrl } from '@/lib/env';

export const SITE_NAME = 'PALMA';
export const SITE_DESCRIPTOR = 'The Creator Honours';
export const SITE_LEGAL_NAME = 'Palma Awards';

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

type MetaInput = {
  title: string;
  description: string;
  path: string;
  /** Path to a generated OG image; defaults to the institutional card. */
  image?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string | null;
  noIndex?: boolean;
};

/**
 * Every public entity in PALMA has a canonical URL and a share card. The
 * institution is only as findable as its record.
 */
export function buildMetadata({
  title,
  description,
  path,
  image = '/opengraph-image',
  type = 'website',
  publishedTime,
  noIndex = false,
}: MetaInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${title}, ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'en_GB',
      type: type === 'profile' ? 'profile' : type,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${title}, ${SITE_NAME}` }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title}, ${SITE_NAME}`,
      description,
      images: [imageUrl],
    },
  };
}

type JsonLd = Record<string, unknown>;

export function organisationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    legalName: `${SITE_LEGAL_NAME} Ltd`,
    alternateName: `${SITE_NAME}, ${SITE_DESCRIPTOR}`,
    url: siteUrl,
    description:
      'PALMA is the permanent record of achievement in the creator industry, the institution behind The Creator Honours.',
    address: { '@type': 'PostalAddress', addressCountry: 'GB' },
  };
}

export function awardJsonLd(input: {
  creatorName: string;
  creatorUrl: string;
  categoryName: string;
  year: number;
  kind: string;
  code?: string | null;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.creatorName,
    url: input.creatorUrl,
    award: `${SITE_NAME} ${input.year}, ${input.categoryName} (${input.kind})`,
    ...(input.code
      ? {
          identifier: {
            '@type': 'PropertyValue',
            propertyID: 'PALMA verification code',
            value: input.code,
          },
        }
      : {}),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  authorName: string;
  publishedAt: string | null;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    author: { '@type': 'Person', name: input.authorName },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function JsonLd({ data }: { data: JsonLd | JsonLd[] }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is generated server-side from our own records.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
