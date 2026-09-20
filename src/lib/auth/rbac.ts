/**
 * Role-based access control.
 *
 * Every privileged action in PALMA is named here and checked on the server.
 * Client components may hide UI, but authority lives exclusively in this file
 * and the guards that consume it.
 */
export const ROLES = [
  'visitor',
  'creator',
  'judge',
  // Editorial and moderation are one job at PALMA's size: the person who
  // writes a creator's record is the person who screens a claim about it.
  // Splitting them produced two roles neither of which could finish a task.
  'moderator',
  'admin',
  'super_admin',
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Who can be invited to work at PALMA.
 *
 * `visitor` is not an account and `creator` self-registers — nobody invites a
 * creator, they claim a record or sign up. Everyone else is staff: they never
 * had a public sign-up form and never will, so the only way one of these
 * accounts comes to exist is an administrator creating it on purpose. A
 * super administrator account is the one exception within this list — see
 * the guard in `inviteOperator` — reserved for a super administrator to
 * create, the same way granting that role to an existing account already is.
 */
export const INVITABLE_ROLES = ['judge', 'moderator', 'admin', 'super_admin'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export function isInvitableRole(value: string): value is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(value);
}

/**
 * Whether this role may ask for its own password reset link, unauthenticated,
 * from the public /forgot page.
 *
 * Creators are the public: there is no administrator standing between a
 * creator and their own account, so self-service is the only door. Staff are
 * the opposite case on purpose. An account with `admin:manage_users` or
 * `honours:confer_the_palma` sitting behind it is a more valuable thing to
 * steal than a mailbox, and a public form that will mint a password-setting
 * link for any email address on request is exactly the door a stolen or
 * guessed staff mailbox walks through. A colleague who forgets their password
 * asks another operator to reissue the link from `/admin/users`, which is
 * audited and requires someone already signed in to act.
 */
export function canSelfServiceReset(role: Role): boolean {
  return role === 'creator';
}

export const PERMISSIONS = [
  // Creator surface
  'creator:claim_profile',
  'creator:update_own_profile',
  'creator:start_verification',
  'nomination:submit',
  'nomination:view_own',

  // Judging
  'judging:view_assignments',
  'judging:submit_score',
  'judging:declare_conflict',

  // Editorial — the presentation of the record, never its outcomes
  'journal:write',
  'journal:publish',
  'kulture:manage_products',
  'creators:view_records',
  'editorial:create_creator',
  'editorial:edit_creator',
  'editorial:write_internal_note',

  // Operations queues
  'claims:review',
  'claims:decide',
  'verification:review_manual',

  // Moderation
  'moderation:view_reports',
  'moderation:act',

  // The moderator's dashboard
  'operations:view_dashboard',

  // Administration
  'admin:view_dashboard',
  'admin:view_analytics',
  'admin:enforce',
  'admin:manage_seasons',
  'admin:manage_categories',
  'admin:review_nominations',
  'admin:manage_judges',
  'admin:assign_judging',
  'admin:resolve_conflicts',
  'admin:select_finalists',
  'admin:select_winners',
  'honours:propose_the_palma',
  'honours:confer_the_palma',
  'admin:revoke_honour',
  'admin:correct_score',
  'admin:manage_sponsors',
  'admin:view_audit_log',
  'admin:manage_users',
  'admin:manage_system',
  /** Read what PALMA has sent, and to whom. */
  'admin:view_communications',

  // Commercial. Kept apart from everything above on purpose: these are the
  // permissions a person selling sponsorship needs, and none of them is
  // anywhere near an award decision.
  'commercial:view',
  'commercial:manage_sponsors',
  'commercial:manage_packages',
  'commercial:manage_campaigns',
  'commercial:manage_event_commerce',
  'commercial:manage_licensing',
  'commercial:manage_features',
  /**
   * Placing an approved sponsor against a category, event or article.
   *
   * Deliberately separate from `manage_sponsors`: doing the deal is commercial
   * work and belongs with administration, while deciding that a partner's name
   * sits under a category heading is editorial work and belongs with the desk
   * that owns those pages. Neither can do the other's half.
   */
  'commercial:assign_placement',
  /** Write to a whole PALMA list. Separate from reading, because sending to a
   *  mailing list cannot be undone and does not belong with a read-only view. */
  'communications:send_list',
  /** Write records into the archive in bulk. */
  'editorial:import_creators',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const CREATOR: Permission[] = [
  'creator:claim_profile',
  'creator:update_own_profile',
  'creator:start_verification',
  'nomination:submit',
  'nomination:view_own',
];

const JUDGE: Permission[] = [
  'judging:view_assignments',
  'judging:submit_score',
  'judging:declare_conflict',
];

/**
 * Editorial maintains the *presentation* of the record: bios, imagery, links,
 * descriptions, the Journal. It has no permission that touches an outcome —
 * no selection, no revocation, no score correction — and that boundary is the
 * point of the role rather than an oversight in this list.
 */
/**
 * The moderator.
 *
 * Maintains the *accuracy* of the record and never its *results*: creator
 * records, the Journal, claims, manual age assurance and reports. Editorial
 * and moderation were two roles until it became clear that neither could
 * finish a task on its own — the person who writes a creator's record is the
 * person who screens a claim about it.
 *
 * It holds no permission that decides an award. That boundary is the point of
 * the role rather than an oversight in this list.
 */
const MODERATOR: Permission[] = [
  'operations:view_dashboard',
  'creators:view_records',
  'journal:write',
  'journal:publish',
  // Kulture is the desk's pillar, and the Product Library is the desk's work.
  // It is the one commercial-adjacent surface whose content an administrator
  // has no business writing: a verdict is editorial, and the people who write
  // verdicts are the people who own them.
  'kulture:manage_products',
  'editorial:create_creator',
  'editorial:edit_creator',
  'editorial:write_internal_note',
  'moderation:view_reports',
  'moderation:act',
  'claims:review',
  'claims:decide',
  'verification:review_manual',
  // Screening candidacies is desk work, and the desk is where the audience is
  // read: the count and the reasons behind it both stop here. This permission
  // is inside JUDGING_CONFIDENTIAL_PERMISSIONS and unlocks nothing in the
  // judging layer, which builds its own sample of reasons without the number
  // attached. Volume decides who is looked at, never who wins.
  'admin:review_nominations',
  // The desk presets records for claiming, so the importer is theirs too.
  'editorial:import_creators',
  // The desk owns the pages a sponsor's name appears on, so it places them,
  // but only sponsors administration has already approved, and only while the
  // matching feature is live.
  'commercial:assign_placement',
  // The desk also owns what is switched on.
  //
  // A feature flag decides whether a public surface exists at all, which makes
  // it an editorial decision before it is a commercial one: the people who run
  // the pages are the people who should be able to take one down at four in the
  // afternoon without finding an administrator. Switching one ON still demands
  // a written reason of at least ten characters and is audited with the name of
  // whoever threw it.
  //
  // What this deliberately does NOT carry is the money. Creating a sponsor,
  // pricing a package and licensing the mark stay with administration, so the
  // desk can decide whether a surface is live without being able to decide who
  // pays to be on it.
  'commercial:view',
  'commercial:manage_features',
  // And the desk does the work of THE PALMA.
  //
  // Proposing it is desk work: naming the panel's choice and writing the
  // citation is preparing the record, which is what this desk is for. What the
  // desk cannot do is complete it alone. `honours:confer_the_palma` is the
  // second signature and stays an outcome permission, because a single person
  // who can both edit a creator's record and confer the institution's highest
  // honour on them is the one hole this firewall exists to close.
  'honours:propose_the_palma',
];

const ADMIN: Permission[] = [
  ...MODERATOR,
  'claims:decide',
  'admin:view_dashboard',
  'admin:view_analytics',
  'admin:enforce',
  'admin:manage_seasons',
  'admin:manage_categories',
  'admin:review_nominations',
  'admin:manage_judges',
  'admin:assign_judging',
  'admin:resolve_conflicts',
  'admin:select_finalists',
  'admin:select_winners',
  // The second signature on THE PALMA. Administration confers what the desk
  // proposed, and the action refuses it if the two are the same person.
  'honours:confer_the_palma',
  'admin:revoke_honour',
  'admin:correct_score',
  'admin:manage_sponsors',
  'admin:view_audit_log',
  'admin:view_communications',
  'communications:send_list',
  'editorial:import_creators',
  'commercial:view',
  'commercial:manage_sponsors',
  'commercial:manage_packages',
  'commercial:manage_campaigns',
  'commercial:manage_event_commerce',
  'commercial:manage_features',
  'commercial:assign_placement',
  // Inviting a colleague and reissuing a stuck one's link. Held apart from
  // `admin:manage_system` on purpose — this is the day-to-day of running the
  // desk, not the handful of settings that reach the whole platform. The
  // actions behind this permission still refuse anything that reaches a
  // super administrator's own role or account: an administrator runs the
  // desk's roster, not the desk's ceiling.
  'admin:manage_users',
];

const MATRIX: Record<Role, readonly Permission[]> = {
  visitor: [],
  creator: CREATOR,
  // Judges are people first: they may also hold a creator profile of their own.
  judge: [...CREATOR, ...JUDGE],
  moderator: [...CREATOR, ...MODERATOR],
  admin: [...CREATOR, ...ADMIN],
  super_admin: [...PERMISSIONS],
};

export function permissionsFor(role: Role): readonly Permission[] {
  return MATRIX[role] ?? [];
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return permissionsFor(role).includes(permission);
}

export function canAll(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.every((permission) => can(role, permission));
}

export function canAny(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

/**
 * Outcomes of the award. No editor or moderator holds any of these, at any
 * time, by any route — the back office maintains the accuracy of the record
 * and never its results.
 */
export const OUTCOME_PERMISSIONS: readonly Permission[] = [
  'admin:select_finalists',
  'admin:select_winners',
  // Conferring is an outcome. Proposing is not, which is why
  // `honours:propose_the_palma` is deliberately absent from this list.
  'honours:confer_the_palma',
  'admin:revoke_honour',
  'admin:correct_score',
  'admin:assign_judging',
  'admin:resolve_conflicts',
];

/**
 * Sponsors hold no role in this matrix by design. Sponsorship is a commercial
 * relationship recorded against a season; it grants no access to nominations,
 * judges, scores or outcomes.
 */
export const SPONSOR_PERMISSIONS: readonly Permission[] = [];

/**
 * The firewall.
 *
 * PALMA's commercial side and PALMA's judging side are two jobs, and the
 * strongest thing the institution can say to a sponsor is that buying an
 * association bought no part of a decision. That sentence is only true if it
 * is enforced somewhere a person cannot quietly undo, so it is enforced here
 * and asserted by a test: no permission may appear in both lists.
 *
 * This is not about hiding a button. A commercial permission grants nothing
 * that touches a nomination, a score, a conflict, a finalist or a winner —
 * including, deliberately, read access. "They only look at the scores" is how
 * a firewall stops being one.
 */
export const COMMERCIAL_PERMISSIONS: readonly Permission[] = [
  'commercial:view',
  'commercial:manage_sponsors',
  'commercial:manage_packages',
  'commercial:manage_campaigns',
  'commercial:manage_event_commerce',
  'commercial:manage_licensing',
  'commercial:manage_features',
  /**
   * Placing an approved sponsor against a category, event or article.
   *
   * Deliberately separate from `manage_sponsors`: doing the deal is commercial
   * work and belongs with administration, while deciding that a partner's name
   * sits under a category heading is editorial work and belongs with the desk
   * that owns those pages. Neither can do the other's half.
   */
  'commercial:assign_placement',
];

/**
 * What a commercial role must never reach, whatever else it holds.
 *
 * Wider than OUTCOME_PERMISSIONS, which names the decisions themselves. This
 * adds the confidential material somebody would need to *influence* one.
 */
export const JUDGING_CONFIDENTIAL_PERMISSIONS: readonly Permission[] = [
  ...OUTCOME_PERMISSIONS,
  'judging:view_assignments',
  'judging:submit_score',
  'judging:declare_conflict',
  'admin:review_nominations',
  'admin:manage_judges',
];

export function isStaff(role: Role | null | undefined): boolean {
  return role === 'moderator' || role === 'admin' || role === 'super_admin';
}
