# Normalized appointment and review schema rollout

The application now reads appointment lab, test, and slot details through
`lab_test_slots`, and derives review patient/lab identity from the appointment.
Do not run `npm run db:init` against an existing database; it recreates the
schema destructively.

## Staged rollout

1. Take and verify a restorable database backup. Confirm that the application
   deployment is ready to be coordinated with the migration.
2. Apply the expand stage to the exact database. It checks historical
   appointment and review identities, backfills mappings, adds integrity
   constraints, and installs temporary compatibility triggers.
3. Deploy the new backend. During this stage the previous backend can still
   read/write the legacy columns, while the compatibility triggers keep the new
   mapping/identity in sync.
4. Verify booking, availability, appointment lists, lab rosters, reviews, and
   payouts on the new backend.
5. Once rollback to the old backend is no longer required, apply the contract
   stage. This drops the redundant appointment lab/test/slot and review
   patient/lab columns.

The migration runner requires explicit `ALLOW_NORMALIZATION_MIGRATION=true`,
`NORMALIZATION_BACKUP_CONFIRMED=true`, and an exact
`NORMALIZATION_TARGET_DATABASE` value. It also requires
`ALLOW_PRODUCTION_NORMALIZATION_MIGRATION=true` when `NODE_ENV=production`.
Pass `expand` or `contract` as the runner's argument. For example, set the
required environment values in a protected local shell and run
`npm run db:migrate:normalized -- expand`.

The contract stage is intentionally a separate operation: do not run it until
the new backend has been verified in production and the compatibility period
has ended.

## Payment-order safeguards

The appointment payment-order migration adds a durable order-to-patient and
order-to-booking association used by server-side payment verification,
idempotent finalization, serialized slot-capacity checks, and refund tracking.
Deploy the compatible backend only after applying this additive migration.

For a local or staging database, set `PAYMENT_ORDER_ENV_FILE` to the protected
environment file, `ALLOW_PAYMENT_ORDER_MIGRATION=true`,
`PAYMENT_ORDER_BACKUP_CONFIRMED=true`, and
`PAYMENT_ORDER_TARGET_DATABASE` to the exact database name, then run
`npm run db:migrate:payment-orders`. Production additionally requires
`ALLOW_PRODUCTION_PAYMENT_ORDER_MIGRATION=true`; take and verify a restorable
backup and coordinate the migration with the backend deployment first.

The migration is additive and does not alter existing appointments or payments.
If a capacity conflict occurs after a captured payment, the order is marked
for refund, and its refund ID/status/error are recorded. A failed refund is
reported explicitly and remains visible for support follow-up.
