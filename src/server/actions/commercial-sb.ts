'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { placement as placementRule, placementTargetIsValid } from '@/domain/sponsorship';
import { supabaseAdmin } from '@/server/db/supabase';
import { createId } from '@/server/db/ids';

export type CommercialState = { status: 'idle' | 'error' | 'success'; message?: string };

const placementSchema = z.object({
  sponsorId: z.string().trim().min(1, 'Choose a sponsor.').max(40),
  awardYearId: z.string().trim().min(1, 'Choose a season.').max(40),
  placement: z.enum(['category', 'event', 'editorial', 'principal']),
  categoryId: z.string().trim().max(40).optional().or(z.literal('')),
  eventId: z.string().trim().max(40).optional().or(z.literal('')),
  articleId: z.string().trim().max(40).optional().or(z.literal('')),
  attribution: z.string().trim().max(60).optional().or(z.literal('')),
});

export async function assignPlacement(
  _previous: CommercialState,
  formData: FormData,
): Promise<CommercialState> {
  const parsed = placementSchema.safeParse({
    sponsorId: formData.get('sponsorId'),
    awardYearId: formData.get('awardYearId'),
    placement: formData.get('placement'),
    categoryId: formData.get('categoryId') ?? '',
    eventId: formData.get('eventId') ?? '',
    articleId: formData.get('articleId') ?? '',
    attribution: formData.get('attribution') ?? '',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the placement.' };
  }

  const target = {
    categoryId: parsed.data.categoryId || null,
    eventId: parsed.data.eventId || null,
    articleId: parsed.data.articleId || null,
  };

  if (!placementTargetIsValid({ placement: parsed.data.placement, ...target })) {
    const rule = placementRule(parsed.data.placement);
    return {
      status: 'error',
      message: rule.target
        ? `A ${rule.name.toLowerCase()} has to name exactly one ${rule.target.replace('Id', '')}.`
        : 'A principal partnership attaches to the season itself. Leave the others blank.',
    };
  }

  const sb = supabaseAdmin();

  const { data: sponsor } = await sb
    .from('Sponsor')
    .select('id, name, status, agreementStatus')
    .eq('id', parsed.data.sponsorId)
    .single();

  if (!sponsor) return { status: 'error', message: 'That sponsor does not exist.' };

  if (sponsor.status !== 'active' || sponsor.agreementStatus !== 'signed') {
    return {
      status: 'error',
      message: `${sponsor.name} is ${sponsor.status} with a ${sponsor.agreementStatus} agreement. A placement needs an active sponsor and a signed agreement.`,
    };
  }

  const { error } = await sb.from('Sponsorship').insert({
    id: createId(),
    sponsorId: sponsor.id,
    awardYearId: parsed.data.awardYearId,
    placement: parsed.data.placement,
    categoryId: target.categoryId,
    eventId: target.eventId,
    articleId: target.articleId,
    attribution: parsed.data.attribution || null,
    isApproved: false,
  });

  if (error) {
    return { status: 'error', message: 'Could not create the placement. It may already exist.' };
  }

  revalidatePath('/portal/sponsorships');

  return {
    status: 'success',
    message: `Proposed. ${sponsor.name} appears nowhere public until an administrator approves it.`,
  };
}

export async function decidePlacement(
  _previous: CommercialState,
  formData: FormData,
): Promise<CommercialState> {
  const id = String(formData.get('sponsorshipId') ?? '');
  const decision = String(formData.get('decision') ?? '');

  if (!id) return { status: 'error', message: 'Missing placement reference.' };

  const sb = supabaseAdmin();

  const { data: sponsorship } = await sb
    .from('Sponsorship')
    .select('id, Sponsor(name), Category(name, slug), AwardYear(title)')
    .eq('id', id)
    .single();

  if (!sponsorship) return { status: 'error', message: 'That placement does not exist.' };

  const category = sponsorship.Category as unknown as { name: string; slug: string } | null;
  const categorySlug = category?.slug ?? null;

  if (decision === 'remove') {
    await sb.from('Sponsorship').delete().eq('id', id);

    revalidatePath('/portal/sponsorships');
    if (categorySlug) revalidatePath(`/categories/${categorySlug}`);

    return { status: 'success', message: 'Removed. The attribution is gone from every page.' };
  }

  if (decision !== 'approve') {
    return { status: 'error', message: 'Choose approve or remove.' };
  }

  await sb
    .from('Sponsorship')
    .update({
      isApproved: true,
      approvedAt: new Date().toISOString(),
    })
    .eq('id', id);

  revalidatePath('/portal/sponsorships');
  revalidatePath('/categories');
  if (categorySlug) revalidatePath(`/categories/${categorySlug}`);

  return {
    status: 'success',
    message: `Approved. It appears once the matching feature is switched on for that season.`,
  };
}
