# Measurement and scoring methods

All metrics are computed by pure, unit-tested functions (`src/modules/scoring`,
`src/activities/*/logic.ts`) and stored with a `scoring_version`. Raw event logs and the exercise
seed are kept (24 months by default), so runs can be re-scored when a formula improves.

**Design rule:** everything compares a patient with **their own history** — no population norms,
no diagnostic labels, no automated clinical recommendations.

## Capture (`src/modules/measurement`)

| Signal | How |
|---|---|
| Stimulus onset | timestamped after the frame is painted (double `requestAnimationFrame`) |
| Reaction time | `event.timeStamp − onset` (same high-resolution time origin) |
| Press duration | `pointerdown → pointerup` / `keydown → keyup` |
| Input | mouse / touch / pen (+ pen pressure) / keyboard; runs with mixed input are flagged |
| Precision | distance from the target centre ÷ target radius |
| Movement (mouse/pen) | pointer samples at 30 Hz with coalesced events → initiation latency, movement time, path length, efficiency (straight ÷ actual), sub-movements (speed peaks), pauses > 200 ms, direction reversals |
| Interruptions | tab hidden, pauses; flagged when > 3 s |
| Device | input type, screen and viewport size, DPR, estimated refresh rate (never a user agent) |
| Motor baseline | 6 simple-RT trials before RT tasks; *decision time* = median choice RT − baseline |

Browser timing has millisecond resolution, but display refresh (≈16.7 ms at 60 Hz) and input
hardware add device-specific latency. Charts can therefore be filtered by input device.

## Shared metrics

- **Signal detection:** hit/false-alarm rates, d′ and criterion c with the log-linear correction
  (Hautus, 1995); A′ (Grier, 1971).
- **Reaction times:** median/mean of correct responses, SD and coefficient of variation;
  anticipations (< 150 ms) and slow outliers (> median + 3 scaled MAD) are flagged and trimmed.
- **Ex-Gaussian** (μ, σ, τ) by maximum likelihood (Nelder–Mead) with ≥ 40 trials; τ indexes the
  slow tail associated with attentional lapses (e.g. Hervey et al., 2006).
- **Speed–accuracy:** inverse efficiency (Townsend & Ashby, 1983), rate-correct score (Woltz & Was,
  2006), balanced integration score against the patient's own history (Liesefeld & Janczyk, 2019),
  signed residual time (Maris & van der Maas, 2012).
- **Sequential effects:** robust post-error slowing (Dutilh et al., 2012); vigilance decrement as the
  Theil–Sen slope of RT over time on task; fatigue index (last third ÷ first third).

## Activity-specific metrics

| Activity | Metrics |
|---|---|
| Go/No-Go | hits, omissions, commissions, d′, c, RT median/CV, ex-Gaussian, post-error slowing, vigilance decrement, decision time, press duration |
| Memory pairs | efficiency vs optimal play (optimal ≈ (3 − 2 ln 2)·n + 7/8 − 2 ln 2 attempts, Velleman & Warrington, 2013), memory errors (partner already seen), perseverations, seconds per pair |
| Cancellation | hits, omissions, commissions, cancellations/min, Center of Cancellation x/y (Rorden & Karnath, 2010), left/right omissions, best r (Mark et al., 2004), intersection rate (Donnelly et al., 1999), mean inter-cancellation distance, replayable path |
| Sequences (span) | longest span, span estimate, partial-credit unit score (Conway et al., 2005), item vs order errors, first/last position accuracy, latency, inter-tap interval |
| Categorization | accuracy, RT, perseverative errors after a rule switch, switch cost (RT and accuracy) |
| Connect in order | time A/B, errors A/B, **B − A** and **B/A**, time per link, pauses, movement efficiency |

## Graded outcome and adaptive difficulty

Each run yields a `performance` ∈ [0, 1] calibrated so that performing at the level's expected
standard gives ≈ 0.75 — the default target success. Calibration constants (expected time per item
or per link) are explicit in each activity and are initial values to refine with real data.

Ability is tracked per patient × activity with **Glicko-1** (Glickman, 1999), the
uncertainty-aware successor of the Elo system used by adaptive practice platforms such as Math
Garden (Klinkenberg, Straatemeier & van der Maas, 2011):

- one difficulty level = 200 rating points (level 3 = 1500); a run is a match against the exercise;
- the rating deviation (RD) shrinks with practice and grows with inactivity (≈ back to maximum
  after a year), so estimates re-adapt quickly after breaks;
- the next difficulty is the level at which expected success equals the patient's target (75% by
  default, configurable 60–90%);
- span tasks update per item with all-or-nothing outcomes, and use a 3-down/1-up staircase within
  the run (converges near 79.4% correct; Levitt, 1971);
- therapists can lock a difficulty per patient × activity or fix it per session item.

Because difficulty adapts, raw accuracy hovers around the target **by design**: the **ability
rating** (with its 95% interval) is the main progress measure.

## Trends (`src/modules/results/analysis.ts`)

- **Theil–Sen** slope with a percentile **bootstrap 95% CI**; **Mann–Kendall** test. A trend badge
  says *improving* / *declining* only when the CI excludes 0 **and** p < 0.05, taking the metric's
  polarity into account; otherwise *stable* (or *not enough data* with < 5 runs).
- **LOWESS** smoothing for the displayed trend line.
- **Change from baseline:** mean of the last 3 runs − mean of the first 3, bootstrap CI.
- **Domain composites:** weekly mean ability gained since each activity's first run, per cognitive
  area; **profile:** ability per area at two chosen dates (dumbbell chart).
- Runs flagged as interrupted, incomplete, with many anticipations or too few trials are excluded
  from trends by default (toggle in the filters).

## References

- Conway, A. R. A., et al. (2005). Working memory span tasks: A methodological review. *Psychonomic Bulletin & Review*, 12, 769–786.
- Donnelly, N., et al. (1999). Discriminating conjunctive from feature search… (intersection rate). *Neuropsychologia*.
- Dutilh, G., et al. (2012). How to measure post-error slowing. *Journal of Mathematical Psychology*, 56, 208–216.
- Glickman, M. E. (1999). Parameter estimation in large dynamic paired comparison experiments. *Applied Statistics*, 48, 377–394.
- Grier, J. B. (1971). Nonparametric indexes for sensitivity and bias. *Psychological Bulletin*, 75, 424–429.
- Hautus, M. J. (1995). Corrections for extreme proportions… *Behavior Research Methods*, 27, 46–51.
- Hervey, A. S., et al. (2006). Reaction time distribution analysis of neuropsychological performance in an ADHD sample. *Child Neuropsychology*, 12, 125–140.
- Klinkenberg, S., Straatemeier, M., & van der Maas, H. L. J. (2011). Computer adaptive practice of Maths ability using a new item response model for on the fly ability and difficulty estimation. *Computers & Education*, 57, 1813–1824.
- Levitt, H. (1971). Transformed up-down methods in psychoacoustics. *JASA*, 49, 467–477.
- Liesefeld, H. R., & Janczyk, M. (2019). Combining speed and accuracy… balanced integration score. *Behavior Research Methods*, 51, 40–60.
- Mark, V. W., et al. (2004). Cancellation search organization (best r). *Journal of the International Neuropsychological Society*.
- Maris, G., & van der Maas, H. (2012). Speed-accuracy response models: Scoring rules based on response time and accuracy. *Psychometrika*, 77, 615–633.
- Rorden, C., & Karnath, H.-O. (2010). A simple measure of neglect severity. *Neuropsychologia*, 48, 2758–2763.
- Townsend, J. T., & Ashby, F. G. (1983). *Stochastic modeling of elementary psychological processes.*
- Velleman, D. J., & Warrington, G. S. (2013). What to expect in a game of memory. *The American Mathematical Monthly*, 120, 787–805.
- Woltz, D. J., & Was, C. A. (2006). Availability of related long-term memory during and after attention focus in working memory. *Memory & Cognition*, 34, 668–684.
