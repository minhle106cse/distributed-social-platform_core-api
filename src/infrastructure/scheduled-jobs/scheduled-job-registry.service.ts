import { Injectable } from '@nestjs/common'
import {
  scheduledJobLastSuccessGauge,
  scheduledJobLastFailureGauge,
  scheduledJobFailuresCounter,
  scheduledJobInfoGauge,
} from './scheduled-jobs.metrics'

export interface ScheduledJobDescriptor {
  name: string
  /** Human-readable schedule, e.g. "@Interval(30000)" or "@Cron(0 3 * * *)". */
  schedule: string
  /** Repo-relative path — where to go read the actual logic. */
  file: string
  purpose: string
}

/**
 * "What jobs exist" enforcement point — replaces resilience_patterns.md §6's
 * hand-maintained table, which drifted twice in one session (2026-07-31)
 * because nothing enforced it staying in sync with the code. Each job
 * registers itself in its own constructor (`register()` throws on a
 * duplicate name — same guard style as `EventRouter.register()`), which sets
 * `core_api_scheduled_job_info` (scheduled-jobs.metrics.ts) — no separate
 * REST endpoint or in-process list survives past this call; a job that's
 * never actually wired up simply never appears on GET /metrics.
 *
 * `recordSuccess`/`recordFailure` write straight to Prometheus too (not
 * stored here) — live health genuinely differs per replica and per restart,
 * unlike the static descriptor set, which is identical on every replica
 * since they all run the same deployed code.
 */
@Injectable()
export class ScheduledJobRegistry {
  private readonly registered = new Set<string>()

  register(descriptor: ScheduledJobDescriptor): void {
    if (this.registered.has(descriptor.name)) {
      throw new Error(`Duplicate scheduled job name "${descriptor.name}" — names must be unique.`)
    }
    this.registered.add(descriptor.name)
    scheduledJobInfoGauge.set(
      {
        job: descriptor.name,
        schedule: descriptor.schedule,
        file: descriptor.file,
        purpose: descriptor.purpose,
      },
      1,
    )
  }

  recordSuccess(name: string): void {
    this.assertRegistered(name)
    scheduledJobLastSuccessGauge.set({ job: name }, Date.now() / 1000)
  }

  recordFailure(name: string): void {
    this.assertRegistered(name)
    scheduledJobLastFailureGauge.set({ job: name }, Date.now() / 1000)
    scheduledJobFailuresCounter.inc({ job: name })
  }

  private assertRegistered(name: string): void {
    if (!this.registered.has(name)) {
      throw new Error(`Unknown scheduled job "${name}" — call register() in the constructor first.`)
    }
  }
}
