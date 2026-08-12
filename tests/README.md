# Test suite

Integration tests for the atomic lead purchase flow + unit tests for rate limiting and lockout.

## One-time setup

### 1. Start an isolated Postgres

Anything works as long as it's throwaway. The easiest option locally:

```bash
docker run -d --name voyana-test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=voyana_test \
  -p 5433:5432 \
  postgres:16
```

The port `5433` (not `5432`) is deliberate — it keeps the test DB visibly separate from a local dev Postgres.

### 2. Create `.env.test` at the repo root

```
TEST_DATABASE_URL=postgresql://postgres:test@localhost:5433/voyana_test
```

The safety guard in [tests/env.ts](env.ts) refuses to run against any URL that isn't demonstrably a test DB — see the header of that file for the exact rules.

### 3. Apply the Prisma schema to the test DB

```bash
npm run test:migrate
```

Runs `prisma migrate deploy` against `.env.test`. Repeat whenever the schema changes.

## Running

```bash
npm test              # one-shot
npm run test:watch    # watch mode
VERBOSE_TESTS=1 npm test   # unmute console.log during tests
```

## What's tested

### Unit — `rate-limit.test.ts` + `lockout.test.ts`
- No DB required. Redis is mocked in-memory.
- Window boundaries, counter increment, retry-after math, fail-open behavior when Redis is unreachable.

### Integration — `purchase-lead.test.ts`
- Requires the test Postgres from step 1.
- Every scenario from the audit finding:
  - Race: two agents on the last slot — exactly one wins
  - Race: two SHARED purchases against an already-mostly-full lead
  - Insufficient credits at debit time (guarded `updateMany`)
  - EXCLUSIVE eligibility (only on `assignmentCount === 0`)
  - EXCLUSIVE consumes all slots (`assignmentCount = maxAgents`)
  - Already-shared → EXCLUSIVE rejected
  - Duplicate purchase by same agent
  - Lead expired
  - Lead not priced
  - Agent not APPROVED
  - Wallet debit + assignment atomicity (rollback on failure)
  - Lead.status transitions (SHARED → IN_PROGRESS as capacity fills)

## CI notes

- Set `TEST_DATABASE_URL` as a secret pointing at your CI Postgres.
- Run `npx prisma migrate deploy` before `npm test`.
- Full CI recipe:

  ```yaml
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_PASSWORD: test
        POSTGRES_DB: voyana_test
      ports: ["5433:5432"]
      options: --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 5

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20 }
    - run: npm ci
    - run: npx prisma generate
    - env:
        TEST_DATABASE_URL: postgresql://postgres:test@localhost:5433/voyana_test
      run: |
        npx prisma migrate deploy
        npm test
  ```

## Safety guarantees

The `tests/env.ts` bootstrap:
1. **Refuses to run without `TEST_DATABASE_URL`** — no silent fallback to `DATABASE_URL`.
2. **Refuses if `TEST_DATABASE_URL === DATABASE_URL`** — even if both were somehow the same.
3. **Refuses hosts matching known production patterns** (currently Supabase pooler URLs).
4. **Requires the URL to look like a test URL** — either `test` in the DB name/host, or localhost/127.0.0.1.
5. **Repoints `DATABASE_URL` + `DIRECT_URL` at the test DB before any Prisma client is instantiated.**
6. **Deletes Upstash Redis env vars** so tests never talk to a shared Redis and rate-limit tests can inject their own mock.

Escape hatch: `ALLOW_TEST_DB_OVERRIDE=1` skips guards (3) and (4). Never use in CI without deliberate review.
