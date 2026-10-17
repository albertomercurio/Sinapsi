/**
 * LOCAL DEMO DATA — never run against production.
 *
 *   pnpm demo:seed
 *
 * Simulates ~4 months of twice-weekly sessions for the synthetic seed patients,
 * going through the real generators, scoring and adaptive engine, and writes
 * them to the LOCAL Supabase with the service-role key from `supabase status`.
 */
import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createRng } from '@/shared/lib/rng'
import { buildContentPack } from '@/content'
import words from '@/content/it/words.json'
import { getActivity } from '@/modules/activities/registry'
import { ageGroupFor } from '@/modules/activities/taxonomy'
import { chooseDifficulty } from '@/modules/activities/adaptive'
import { qualityFlags, packRecording, toByteaHex, type RunRecording } from '@/modules/measurement'
import { abilityAfter } from '@/modules/sessions/runner/saveRun'
import { ratingToLevel, round } from '@/modules/scoring'
import { createNameKey, encryptName } from '@/modules/patients/names/crypto'
import * as sim from './demo/simulate'

const run = process.env.SINAPSI_SEED_DEMO === '1'

describe.skipIf(!run)('demo data', () => {
  it('seeds simulated history', { timeout: 300_000 }, async () => {
    const env = Object.fromEntries(
      execSync('pnpm exec supabase status -o env', { encoding: 'utf8' })
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => [
          l.slice(0, l.indexOf('=')),
          l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, ''),
        ]),
    )
    if (!String(env.API_URL).includes('127.0.0.1'))
      throw new Error('refusing to seed a non-local database')
    const db = createClient(env.API_URL!, env.SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })
    const content = buildContentPack('it', words as never)
    const { data: patients } = await db.from('patients').select('*').order('birth_year')
    expect(patients?.length).toBeGreaterThan(0)
    const therapist = '22222222-2222-4222-8222-222222222222'
    const plans: string[][] = [
      ['memory-pairs', 'cancellation', 'go-no-go', 'trail-connect'],
      ['span-sequence', 'categorization', 'go-no-go', 'trail-connect'],
      ['memory-pairs', 'cancellation', 'categorization', 'span-sequence'],
    ]

    // Demo names, end-to-end encrypted with the passphrase "demo sinapsi studio".
    const orgId = patients![0]!.org_id
    const { key: nameKey, params } = await createNameKey('demo sinapsi studio', orgId)
    await db
      .from('organizations')
      .update({ name_key: params as never })
      .eq('id', orgId)
    const demoNames = [
      { first: 'Giuseppina', last: 'Verdi' },
      { first: 'Marco', last: 'Neri' },
      { first: 'Sofia', last: 'Gallo' },
    ]
    for (const [i, p] of (patients ?? []).entries()) {
      const n = demoNames[i % demoNames.length]!
      await db
        .from('patients')
        .update({ name_enc: await encryptName(nameKey, n, p.org_id) })
        .eq('id', p.id)
    }

    for (const [pi, patient] of (patients ?? []).entries()) {
      const rng = createRng(1000 + pi)
      const ageGroup = ageGroupFor(patient.birth_year)
      const plan = plans[pi % plans.length]!
      // Latent ability per activity: starts low, improves with practice (with noise).
      const latent = Object.fromEntries(plan.map((a) => [a, 1.6 + rng.float(0, 0.6)]))
      const abilities = new Map<
        string,
        { rating: number; rd: number; n_runs: number; last_run_at: string | null }
      >()
      const start = new Date(Date.now() - 120 * 86400000)
      for (let s = 0; s < 34; s++) {
        const day = new Date(start.getTime() + s * 3.5 * 86400000 + rng.int(9, 17) * 3600000)
        const { data: session } = await db
          .from('sessions')
          .insert({
            patient_id: patient.id,
            org_id: patient.org_id,
            title: `Seduta ${s + 1}`,
            scheduled_for: day.toISOString().slice(0, 10),
            status: 'completed',
            started_at: day.toISOString(),
            completed_at: day.toISOString(),
            created_by: therapist,
            mode: s % 5 === 4 ? 'home' : 'clinic',
          })
          .select('id')
          .single()
        const items = plan.map((activity_id, position) => ({
          session_id: session!.id,
          org_id: patient.org_id,
          position,
          activity_id,
          difficulty: null,
          locked: false,
          config: {},
        }))
        const { data: savedItems } = await db
          .from('session_items')
          .insert(items)
          .select('id, activity_id')
        let t = day.getTime()
        for (const item of savedItems ?? []) {
          const act = getActivity(item.activity_id)!
          latent[item.activity_id] = Math.min(
            4.8,
            latent[item.activity_id]! + 0.045 + rng.normal(0, 0.03),
          )
          const stored = abilities.get(item.activity_id)
          const choice = chooseDifficulty({
            stored: stored ? { ...stored, locked: false, locked_difficulty: null } : null,
            itemDifficulty: null,
            itemLocked: false,
            targetSuccess: 0.75,
            now: new Date(t),
          })
          const seed = rng.int(1, 2 ** 31 - 1)
          const config = act.configSchema.parse(act.configFor(choice.difficulty, ageGroup))
          const inst = act.generate({
            rng: createRng(seed),
            config,
            difficulty: choice.difficulty,
            ageGroup,
            locale: 'it',
            content,
          })
          const ability = latent[item.activity_id]! + rng.normal(0, 0.25)
          const when = new Date(t)
          let rec: RunRecording
          switch (item.activity_id) {
            case 'go-no-go':
              rec = sim.simGoNoGo(rng, inst, config, ability, choice.difficulty, when)
              break
            case 'memory-pairs':
              rec = sim.simPairs(rng, inst, ability, choice.difficulty, when)
              break
            case 'cancellation':
              rec = sim.simCancellation(rng, inst, config, ability, choice.difficulty, when)
              break
            case 'span-sequence':
              rec = sim.simSpan(rng, inst, config, ability, when)
              break
            case 'categorization':
              rec = sim.simCategorization(rng, inst, config, ability, choice.difficulty, when)
              break
            default:
              rec = sim.simTrail(rng, inst, ability, choice.difficulty, when)
          }
          const result = act.score(inst, rec, { config, baselineRt: rec.baseline?.median ?? null })
          const fake = {
            activityId: act.id,
            activityVersion: act.version,
            scoringVersion: act.scoringVersion,
            difficulty: choice.difficulty,
            seed,
            config,
            recording: rec,
            result,
            qualityFlags: [],
          }
          const after = abilityAfter(fake, choice.ability)
          const { data: runRow, error } = await db
            .from('activity_runs')
            .insert({
              org_id: patient.org_id,
              patient_id: patient.id,
              session_id: session!.id,
              session_item_id: item.id,
              activity_id: act.id,
              activity_version: act.version,
              scoring_version: act.scoringVersion,
              difficulty: round(choice.difficulty, 2)!,
              seed,
              config,
              device: rec.device,
              mode: 'clinic',
              started_at: when.toISOString(),
              duration_ms: rec.durationMs,
              score: result.score,
              performance: result.performance,
              metrics: result.metrics,
              quality_flags: [
                ...qualityFlags(rec, { minTrials: act.minTrials }),
                ...(result.flags ?? []),
              ],
              rating_before: round(choice.ability.rating, 2),
              rating_after: round(after.rating, 2),
              rd_after: round(after.rd, 2),
              created_by: therapist,
            })
            .select('id')
            .single()
          if (error) throw error
          await db.from('activity_run_events').insert({
            run_id: runRow!.id,
            org_id: patient.org_id,
            payload: toByteaHex(packRecording(rec)),
          })
          abilities.set(item.activity_id, {
            rating: after.rating,
            rd: after.rd,
            n_runs: (stored?.n_runs ?? 0) + 1,
            last_run_at: when.toISOString(),
          })
          t += rec.durationMs + 60_000
        }
      }
      for (const [activity_id, a] of abilities) {
        await db.from('patient_ability').upsert({
          patient_id: patient.id,
          org_id: patient.org_id,
          activity_id,
          rating: round(a.rating, 2)!,
          rd: round(a.rd, 2)!,
          n_runs: a.n_runs,
          last_run_at: a.last_run_at,
        })
        console.log(
          `${patient.code} ${activity_id}: L${ratingToLevel(a.rating).toFixed(2)} (latent ${latent[activity_id]!.toFixed(2)})`,
        )
      }
    }
  })
})
