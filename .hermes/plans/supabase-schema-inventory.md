# Supabase/Postgres schema inventory (no pg_dump)

Generated: 2026-09-19T09:04:06Z

## Counts
tables=58
columns=626
enums=38
indexes=184
constraints=522
triggers=25

## Tables
- Achievement
- Article
- ArticleCategory
- AuditLog
- AuthSession
- AwardMarkLicence
- AwardPhysicalItem
- AwardYear
- Campaign
- Candidacy
- CandidacyEvidence
- Category
- ClaimInvitation
- ConsequentialAction
- Creator
- CreatorClaim
- CreatorClaimLink
- CreatorLink
- CreatorNote
- CreatorPortrait
- CreatorVerification
- Dispatch
- EmailChangeRequest
- EmailDelivery
- EmailSubscription
- FeatureSetting
- Honour
- Judge
- JudgeConflict
- JudgePanelMembership
- JudgingAssignment
- JudgingScore
- ModerationAction
- Nomination
- Nominator
- NominatorVerification
- Notification
- NotificationPreference
- Opportunity
- PageCount
- PalmaEvent
- PasswordResetToken
- ProductEntry
- RateLimitCounter
- RecordObjection
- Report
- SearchCount
- Sponsor
- Sponsorship
- SponsorshipPackage
- SuppressedAddress
- SystemSetting
- TicketType
- User
- VerificationCase
- VerificationRecord
- _prisma_migrations
- app_schema_migrations

## Enum types
- AgreementStatus: none, drafted, sent, signed, expired
- ArticleStatus: draft, in_review, scheduled, published, archived
- AssignmentStatus: assigned, in_progress, completed, recused, reassigned
- CampaignStatus: draft, scheduled, live, completed, cancelled
- CandidacyStatus: under_review, eligible, ineligible, shortlisted, finalist, winner, withdrawn
- ClaimStatus: submitted, awaiting_information, escalated, approved, rejected, withdrawn
- ConflictKind: personal_relationship, commercial_relationship, representation, employment, competitor, other
- ConflictStatus: declared, upheld, dismissed
- ConsequentialActionKind: account_ban, honour_revocation, the_palma_conferral
- EmailDeliveryStatus: queued, sent, delivered, bounced, complained, failed, suppressed
- EmailListType: awards, journal, events, opportunities, partner_offers
- EventStatus: planned, announced, on_sale, sold_out, held, cancelled
- EvidenceKind: external_link, press_mention, metric_statement, testimonial, award_record, other
- HonourKind: shortlist, finalist, winner, special_recognition, the_palma
- HonourState: active, revoked
- LicenceStatus: granted, suspended, revoked, expired
- ModerationActionKind: content_removed, profile_suspended, nomination_rejected, honour_revoked, creator_banned, warning_issued, restored
- NominationSource: organic, referral, editorial
- NominationStatus: pending_verification, counted, rejected, withdrawn
- NotificationChannel: email, in_app
- OpportunityKind: collaboration, brand, application, programme, event, professional, partnership
- OpportunityStatus: draft, published, closed, withdrawn
- PhysicalItemStatus: not_ordered, ordered, in_production, ready, shipped, delivered, replacement, cancelled
- PortraitStatus: published, withdrawn
- RecordObjectionStatus: received, upheld, refused, withdrawn
- ReportReason: impersonation, fabricated_achievement, explicit_content, harassment, ineligible_creator, vote_manipulation, other
- ReportStatus: open, investigating, actioned, dismissed
- Role: visitor, creator, judge, moderator, admin, super_admin
- SeasonStage: announced, nominations_open, nominations_closed, shortlisting, shortlist_announced, judging, finalists_announced, winners_announced, archived
- SponsorStatus: prospect, active, paused, expired, terminated
- SponsorTier: headline, category_partner, supporting, media
- SponsorshipPlacement: category, event, editorial, principal
- SubscriptionStatus: pending, confirmed, unsubscribed
- SuppressionReason: hard_bounce, soft_bounce, complaint
- TicketKind: general, premium, vip, table, hospitality, industry
- VerificationCaseReason: provider_unavailable, provider_exception, result_requires_review, reverification_due
- VerificationCaseStatus: open, awaiting_information, verified, refused, abandoned
- VerificationStatus: unverified, pending, verified, failed, expired, revoked
