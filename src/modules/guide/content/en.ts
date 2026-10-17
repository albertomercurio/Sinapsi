import type { GuideContent } from './types'

const en: GuideContent = {
  title: 'Guide: how to read measures and charts',
  intro:
    'This guide explains, without assuming any background, what Sinapsi measures, how the numbers are computed and how to read the charts. Every “?” next to a measure links here, to the right section. At the end of each section you will find the scientific references for further reading.',
  sections: [
    {
      id: 'reading',
      title: 'How to read the results',
      blocks: [
        {
          p: 'Each time a patient does an exercise, Sinapsi records what happened trial by trial: when the stimulus appeared, when and where the patient touched the screen or clicked, how long they held the press, how the mouse moved. From these recordings it computes measures (for example, how many correct answers and how fast).',
        },
        {
          p: 'The most important point: each patient is compared only with themselves. Sinapsi does not compare the patient with “the population” and does not say whether a value is “normal” or “pathological”. It answers questions such as: “compared with a month ago, is the patient faster?”, “do they make fewer mistakes?”, “can they handle harder exercises?”.',
        },
        { h: 'Where to find what' },
        {
          list: [
            "The patient's Overview tab: the level reached in each activity and a small chart of how it has evolved.",
            'Progress tab: charts over time, by cognitive area and by activity, with the list of all runs.',
            'Run detail (click a point or a row): every measure from that run, trial-by-trial times and, for some exercises, a replay of the path.',
            'Report: a printable page (or save as PDF) summarising the chosen period.',
          ],
        },
        {
          example:
            'Example: in the Progress tab you see that ability in “Traffic light” went from L2.1 to L3.0 in two months and that the median reaction time is “Improving”. This means the patient now does well on a harder version of the exercise, and responds faster than before.',
        },
      ],
    },
    {
      id: 'score',
      title: 'Score and performance',
      blocks: [
        {
          p: 'The score (0 to 100) sums up a run in one number. Each activity computes it in its own way, but always by combining two things: how many answers were correct and how fast they were. A correct, quick answer is worth more than a correct but very slow one; a wrong answer given in a hurry “costs” more than a wrong answer given calmly.',
        },
        {
          p: 'Performance is the same idea expressed from 0 to 1, calibrated so that 0.75 means “the exercise was at the right difficulty for this patient”. It is the number the system uses to choose the level for the next time (see “Estimated ability and adaptive difficulty”).',
        },
        { h: 'Why the score alone is not enough' },
        {
          p: 'Because the difficulty adapts to the patient, as the patient improves the exercises get harder and the score tends to stay about the same. To see progress, look at the estimated ability, which takes into account how hard the exercises were.',
        },
        {
          p: 'The score uses a rule called “signed residual time”, the same one used by adaptive practice platforms such as Math Garden: each correct answer is worth more the more time is left before the deadline, and each wrong answer subtracts in the same proportion.',
        },
      ],
      refs: ['maris2012', 'klinkenberg2011'],
    },
    {
      id: 'ability',
      title: 'Estimated ability and adaptive difficulty',
      blocks: [
        {
          p: 'Each activity has five difficulty levels, from L1 (very easy) to L5 (very hard), with every value in between (for example L2.5). The level is translated into concrete settings: more cards in Memory pairs, faster stimuli in Traffic light, longer sequences, more similar symbols.',
        },
        {
          p: 'Estimated ability is the level the patient can handle successfully in that activity. It uses the same scale (L1–L5): an ability of L3.2 means that a level-3.2 exercise would be an “even match”, with about 50% success.',
        },
        { h: 'How it is estimated: the Glicko method (similar to chess Elo ratings)' },
        {
          p: 'In chess every player has an Elo rating: beat a stronger opponent and you gain many points, lose to a weaker one and you lose many. Sinapsi does the same: each run is like a “match” between the patient and the exercise. If the patient does better than expected for that difficulty, ability goes up; if worse, it goes down.',
        },
        {
          p: 'Glicko adds a measure of uncertainty to Elo. At first the system knows little about the patient: the uncertainty is large and ability can change a lot from one run to the next. With practice the uncertainty shrinks and the estimate becomes stable. After a long break (for example a month without exercises) the uncertainty grows again, so the system quickly adapts to any change.',
        },
        {
          p: "In the ability chart, the blue line is the estimate after each run and the light band is the 95% uncertainty interval (see “Trend lines and reliability”): the patient's true level is almost certainly inside it.",
        },
        { h: 'How the difficulty is chosen' },
        {
          p: 'The system deliberately picks a level a little below the estimated ability, so that the patient succeeds in about 3 trials out of 4 (75%). It is a balance between challenge and motivation: hard enough to train, easy enough not to discourage. The value can be changed for each patient (from 60% to 90%) in their profile.',
        },
        {
          p: 'The therapist can always decide otherwise: fix the difficulty of an exercise in a session, or lock it for a patient (“Lock difficulty” button). Ability keeps being estimated either way.',
        },
        { h: 'Sequences: the “3 right, go up; 1 wrong, go down” rule' },
        {
          p: 'In “Sequences to remember” the length also adapts within the same run: after 3 correct answers in a row the sequence gets one item longer, after a mistake it gets shorter. This rule, used for decades in psychophysics, makes sequences settle near the length the patient recalls correctly about 8 times out of 10.',
        },
        {
          example:
            'Example: a new patient starts at L1.5. They do very well three times in a row, so ability rises quickly (the initial uncertainty is large) and the exercises move to level 2.5. After about ten runs ability hovers around L3.4: that is their current level.',
        },
      ],
      refs: ['glickman1999', 'klinkenberg2011', 'levitt1971'],
    },
    {
      id: 'areas',
      title: 'Progress by area and profile',
      blocks: [
        {
          p: 'Each activity trains one or more cognitive areas (attention, memory, executive functions, processing speed…). The “Progress by cognitive area” chart shows, week by week, how many ability levels the patient has gained on average in the activities of each area compared with the first time they did them.',
        },
        {
          list: [
            '0 = same as at the start.',
            '+1 = on average the patient handles exercises one level harder than when they started.',
            'Negative values = on average they handle easier exercises than when they started.',
          ],
        },
        {
          p: 'The “Profile: two dates compared” chart compares the average ability per area on two chosen dates. Each row is an area: the grey dot is the start date, the blue dot the end date. The longer the line, the bigger the change.',
        },
        {
          p: 'The “Activity calendar” shows on which days the patient did exercises and how many: useful to see how regular the work is.',
        },
      ],
    },
    {
      id: 'trends',
      title: 'Trend lines and reliability',
      blocks: [
        {
          p: "A person's results naturally vary from one day to the next: tiredness, mood, time of day. To tell whether there is a real change, the trend must be separated from the “noise”. Sinapsi uses four statistical tools, chosen because they are robust: a single bad day does not fool them.",
        },
        { h: '1. The trend line (LOWESS)' },
        {
          p: 'In the measure charts, the dots are the individual runs and the line through them is a “soft” average computed with the LOWESS method (locally weighted regression). For each point in time, the method looks at nearby runs, giving more weight to the closest ones and less weight to unusual values. The result is a curve that follows the general direction without chasing every dot.',
        },
        { h: '2. The change every 30 days (Theil–Sen method)' },
        {
          p: 'To say “how much a measure changes on average” over time, Sinapsi conceptually draws a straight line between every pair of runs and computes its slope; then it takes the median slope (the one in the middle). This method, by Theil and Sen, is very resistant to unusual values: even if a few runs are very different from the others, the result hardly changes. The value is then expressed as “change every 30 days”.',
        },
        { h: '3. The confidence interval (“probably between … and …”)' },
        {
          p: 'Every estimate has a margin of uncertainty. The 95% confidence interval is the range that almost certainly contains the true value. Sinapsi computes it with the bootstrap method: it redoes the calculation hundreds of times “reshuffling” the available runs and looks at how much the results vary. If the interval includes both positive and negative values (for example “between −5 and +12”), you cannot say with confidence whether the measure is going up or down.',
        },
        { h: '4. The trend test (Mann–Kendall)' },
        {
          p: 'The Mann–Kendall test compares each run with all the later ones and counts how many times the value went up and how many times it went down. If ups (or downs) clearly prevail, more than would happen by chance, the trend is considered significant (p < 0.05: less than a 5% probability that it is due to chance).',
        },
        { h: 'The “Improving / Stable / Declining” badge' },
        {
          p: 'The badge says “Improving” or “Declining” only if both conditions hold: the confidence interval of the change does not include zero, and the Mann–Kendall test is significant. It takes the direction of the measure into account: for reaction times going down is an improvement, for accuracy going up. Otherwise it shows “Stable”. With fewer than 5 runs it shows “Not enough data”.',
        },
        { h: 'Change from the start' },
        {
          p: 'This is the difference between the average of the last 3 runs and that of the first 3, with its confidence interval. It answers the simplest question: “compared with how it was at the start, how is it now?”.',
        },
        {
          example:
            'Example: “Change every 30 days: −18 ms (probably between −30 and −7)” on median reaction time means that each month the patient responds on average 18 thousandths of a second faster, and that the improvement is almost certainly between 7 and 30 ms per month. The interval does not include zero: the improvement is reliable.',
        },
      ],
      refs: ['cleveland1979', 'sen1968', 'mann1945', 'efron1993'],
    },
    {
      id: 'reaction-times',
      title: 'Reaction times',
      blocks: [
        {
          p: 'Reaction time is the time (in milliseconds, ms: 1000 ms = 1 second) between the stimulus appearing on screen and the response. Sinapsi records the moment the stimulus was actually drawn on the screen and the exact moment of the touch or click.',
        },
        {
          terms: [
            {
              term: 'Median',
              def: 'The value in the middle: half the responses are faster, half are slower. Unlike the mean, it is not “pulled up” by a few very slow responses: that is why it is the main measure.',
            },
            {
              term: 'Anticipations',
              def: 'Responses faster than 150 ms. They are too quick to be a reaction to the stimulus (the brain does not have time to see it): the patient pressed “on a guess”. They are counted but left out of the time calculations.',
            },
            {
              term: 'Slow outliers',
              def: 'Responses much slower than the others (more than three times the typical variability above the median). They are left out of the “clean” times but remain visible in the trial-by-trial chart.',
            },
            {
              term: 'Irregularity (CV)',
              def: 'The coefficient of variation: how much the times vary relative to their mean. A patient with steady times has a low CV; one who sometimes responds immediately and sometimes after a long time has a high CV. A high CV is typical of attention that comes and goes.',
            },
            {
              term: 'Simple reaction time',
              def: 'In the initial warm-up the patient only has to press as soon as a green circle appears. This measures the speed of the hand and the built-in delay of the device (screen, mouse, touch).',
            },
            {
              term: 'Decision time',
              def: 'Reaction time in the exercise minus simple reaction time. What is left is the time needed to recognise the stimulus and decide what to do, net of motor speed and the device.',
            },
            {
              term: 'Press duration',
              def: 'How long the finger, key or mouse button stays pressed. Very long or very variable values may reflect motor aspects.',
            },
          ],
        },
        { h: 'Mind the device' },
        {
          p: 'Mouse, touchpad, touch screen and pen have different delays (even tens of milliseconds). To compare times over time, use the “Input device” filter in the Progress tab and look at one kind of device at a time. Decision time reduces this problem.',
        },
      ],
      refs: ['whelan2008', 'ratcliff1993'],
    },
    {
      id: 'rt-distribution',
      title: 'The distribution of times (ex-Gaussian model)',
      blocks: [
        {
          p: 'If you put all the reaction times of a run in a histogram, the shape is not symmetrical: there is a peak (the usual times) and a long “tail” to the right (a few much slower responses). The ex-Gaussian model describes this shape with three numbers:',
        },
        {
          terms: [
            {
              term: 'μ (mu) — usual speed',
              def: 'Where the peak is: how fast the patient is when focused.',
            },
            {
              term: 'σ (sigma) — steadiness',
              def: 'How spread out the usual times are around the peak.',
            },
            {
              term: 'τ (tau) — slow responses',
              def: 'How long the tail of slow responses is. A high τ indicates frequent moments of distraction (so-called attention lapses). It is a particularly sensitive measure in attention disorders.',
            },
          ],
        },
        {
          p: 'Estimating these three numbers reliably requires at least 40 correct responses, which is why they appear only in longer exercises (such as Traffic light at higher levels). The “Distribution of times” chart in the run detail shows the histogram with the model curve on top.',
        },
        {
          example:
            'Example: two patients have the same median of 500 ms. The first has τ = 40 ms (very few slow responses), the second τ = 180 ms (many slow responses). The second has less stable attention, even though “on average” they look the same.',
        },
      ],
      refs: ['hervey2006', 'ratcliff1993'],
    },
    {
      id: 'signal-detection',
      title: 'Responding or holding back (d′ and response style)',
      blocks: [
        {
          p: 'In exercises where the patient must respond to some stimuli and ignore others (such as Traffic light: press for green, do not press for red), there are four possibilities:',
        },
        {
          list: [
            'Hit: a stimulus to press, the patient presses.',
            'Omission: a stimulus to press, the patient does not press (they “miss” it).',
            'Commission or false alarm: a stimulus to ignore, the patient presses anyway (impulsivity).',
            'Correct rejection: a stimulus to ignore, the patient does not press.',
          ],
        },
        {
          p: 'The problem: a patient who always presses has no omissions but many false alarms; one who hardly ever presses has the opposite. Signal detection theory separates two different things:',
        },
        {
          terms: [
            {
              term: 'd′ (d-prime) — ability to tell apart',
              def: 'How well the patient distinguishes the stimuli to respond to from those to ignore, regardless of how inclined they are to press. 0 = responds at random; 1 = modest discrimination; above 2 = good discrimination; above 3 = very good.',
            },
            {
              term: 'c — response style',
              def: 'Positive = cautious (prefers not to press: fewer false alarms but more omissions). Negative = liberal or impulsive (presses often: few omissions but more false alarms). Close to 0 = balanced. It is not a grade: it describes the strategy.',
            },
          ],
        },
        {
          p: 'When a patient never makes a mistake (0 errors), the formulas would give an infinite value; a small standard correction (log-linear) is therefore used so the calculation is always possible.',
        },
        {
          example:
            'Example: after a month of exercises, d′ stays at 2.0 but style c moves from −0.6 to 0. This means the patient tells the stimuli apart as before, but has become less impulsive: they press “on impulse” less often.',
        },
      ],
      refs: ['stanislaw1999', 'hautus1995'],
    },
    {
      id: 'speed-accuracy',
      title: 'Speed and accuracy together',
      blocks: [
        {
          p: 'Everyone chooses, more or less consciously, a trade-off: going fast and making more mistakes, or going slowly and making fewer. Looking only at times or only at errors can be misleading: a patient can “improve” their times simply by becoming more hasty.',
        },
        { p: 'That is why Sinapsi uses measures that combine the two:' },
        {
          terms: [
            {
              term: 'Signed residual time score',
              def: 'Each correct answer is worth more if it is fast; each wrong answer subtracts more if it is given in a hurry. It is the basis of the score in many activities.',
            },
            {
              term: 'Inverse efficiency score (IES)',
              def: 'Mean time of correct answers divided by the proportion of correct answers: “how many milliseconds each correct answer takes”. Lower is better.',
            },
            {
              term: 'Rate-correct score (RCS)',
              def: 'How many correct answers the patient gives on average per second of work. Higher is better.',
            },
            {
              term: 'Balanced integration score (BIS)',
              def: "Puts accuracy and speed on the same scale, relative to the patient's own history, and adds them with equal weight.",
            },
          ],
        },
      ],
      refs: ['maris2012', 'townsend1983', 'woltz2006', 'liesefeld2019'],
    },
    {
      id: 'attention-time',
      title: 'Attention over time',
      blocks: [
        {
          terms: [
            {
              term: 'Attention decline over time (vigilance decrement)',
              def: 'By how many milliseconds reaction times increase for each minute of exercise. If positive, the patient slows down as the exercise goes on: a sign of fatigue or difficulty sustaining attention.',
            },
            {
              term: 'Fatigue index',
              def: 'Times in the last third of the exercise divided by those in the first third. 1 = no difference; 1.2 = 20% slower at the end.',
            },
            {
              term: 'Slowing after an error',
              def: 'Many people slow down a little after a mistake to be more careful. Sinapsi compares the time of the response right after an error with that of the response right before it. A positive value is a good sign: the patient notices errors and corrects course. The calculation follows the “robust” method that is not distorted by general slowing.',
            },
          ],
        },
      ],
      refs: ['dutilh2012'],
    },
    {
      id: 'visual-search',
      title: 'Visual search (Symbol hunt)',
      blocks: [
        {
          p: 'In the cancellation exercise the patient must find all the symbols that match a model. Besides how many they find, Sinapsi records where the found and missed ones are, and in which order they were searched.',
        },
        {
          terms: [
            {
              term: 'Left–right balance (center of cancellation)',
              def: 'A number from −1 to +1. 0 = the patient found targets evenly across the whole sheet. Negative values = they found mostly those on the left (missing those on the right); positive = the opposite. There is also a top–bottom version. It describes what happened; it is not a diagnosis.',
            },
            {
              term: 'Left / right omissions',
              def: 'How many targets were missed in each half of the sheet.',
            },
            {
              term: 'Search order (best r)',
              def: 'How much the search follows rows or columns, as in reading. Close to 1 = very orderly exploration; close to 0 = jumping from one place to another.',
            },
            {
              term: 'Path crossings',
              def: 'Joining the targets with a line in the order they were found, how many times the line crosses itself. Many crossings = disorderly search.',
            },
            {
              term: 'Mean distance between cancellations',
              def: 'How long the “jumps” from one target to the next are on average. Long jumps indicate a less systematic search.',
            },
          ],
        },
        {
          p: 'In the run detail, the “Play” button shows the search path in the real order, with found targets, missed targets and the mouse movement.',
        },
      ],
      refs: ['rorden2010', 'mark2004', 'donnelly1999'],
    },
    {
      id: 'memory',
      title: 'Memory (Memory pairs and Sequences)',
      blocks: [
        { h: 'Memory pairs' },
        {
          terms: [
            {
              term: 'Efficiency vs optimal play',
              def: "Even a player with perfect memory must turn every card at least once before matching it: n pairs need on average about 1.6 × n attempts. Sinapsi compares the patient's attempts with this value. 100% = like a perfect memory; 50% = twice the attempts needed.",
            },
            {
              term: 'Memory errors',
              def: 'The patient turns a card whose partner they had already seen, but does not pick it: the error most closely linked to visual memory.',
            },
            { term: 'Perseverations', def: 'The same wrong pairing repeated several times.' },
          ],
        },
        { h: 'Sequences to remember (span)' },
        {
          terms: [
            {
              term: 'Estimated span',
              def: 'The sequence length the patient recalls with good confidence. It comes from the “3 right, go up; 1 wrong, go down” rule (see “Estimated ability and adaptive difficulty”).',
            },
            { term: 'Maximum span', def: 'The longest sequence repeated without errors.' },
            {
              term: 'Items in the right place (partial credit)',
              def: 'For each sequence, the share of items recalled in the right position, even if the whole sequence was not correct; then the average. It is more informative than simple right/wrong.',
            },
            {
              term: 'Item and order errors',
              def: 'Item error = the patient points to something that was not in the sequence. Order error = the item was right but in the wrong position (difficulty keeping the order).',
            },
            {
              term: 'First and last position',
              def: 'People usually remember the first item (primacy effect) and the last (recency effect) best.',
            },
          ],
        },
      ],
      refs: ['velleman2013', 'conway2005', 'levitt1971'],
    },
    {
      id: 'flexibility',
      title: 'Flexibility (Sort it out and Connect in order)',
      blocks: [
        { h: 'Sort it out (rule switching)' },
        {
          terms: [
            {
              term: 'Switch cost',
              def: 'When the rule changes (for example from “sort by category” to “sort by size”), almost everyone slows down or makes a few more mistakes on the next trial. The switch cost measures this slowing (in ms) and the drop in accuracy.',
            },
            {
              term: 'Perseverative errors',
              def: 'After the switch, the patient keeps applying the previous rule. They indicate rigidity, that is difficulty “changing tracks”.',
            },
          ],
        },
        { h: 'Connect in order (part A and part B)' },
        {
          terms: [
            {
              term: 'Time A and time B',
              def: 'Part A: connect 1-2-3-… (visuo-motor speed). Part B: alternate numbers and letters 1-A-2-B-… (also requires switching between two series).',
            },
            {
              term: 'Difference B − A',
              def: 'The extra time required by alternating, net of baseline speed. It reflects cognitive flexibility.',
            },
            {
              term: 'Ratio B ÷ A',
              def: 'Like the difference, but as a proportion: a ratio of 2 means part B takes twice as long as part A.',
            },
            {
              term: 'Pauses',
              def: 'Links that took more than 2.5 times the usual time: hesitations or moments when the patient lost track.',
            },
          ],
        },
      ],
    },
    {
      id: 'movement',
      title: 'Movement and devices',
      blocks: [
        {
          p: 'When the patient uses a mouse or a pen, Sinapsi also records the pointer path (about 30 positions per second). From this it computes:',
        },
        {
          terms: [
            {
              term: 'Movement efficiency',
              def: 'Straight-line distance to the target divided by the path actually travelled. 1 = direct movement; lower values = detours, hesitations, corrections.',
            },
            {
              term: 'Start and movement time',
              def: 'How long before the pointer starts moving, and how long the movement lasts.',
            },
            {
              term: 'Sub-movements and pauses',
              def: 'How many times the movement speeds up and slows down (course corrections) and how many times it stops for more than a fifth of a second.',
            },
          ],
        },
        {
          p: 'With a touch screen the finger “jumps” straight to the target, so these measures are not available; times, precision and press duration remain. This is another reason to compare runs done with the same kind of device.',
        },
      ],
    },
    {
      id: 'quality',
      title: 'Data quality and detailed recordings',
      blocks: [
        {
          p: 'Sinapsi automatically flags runs that may not be reliable. In the Progress tab, the “Exclude unusual runs” option (usually on) removes them from the charts; they still appear in the list.',
        },
        {
          terms: [
            {
              term: 'Interrupted',
              def: 'The window was hidden or lost focus for more than 3 seconds (for example the patient switched app).',
            },
            { term: 'Paused', def: 'Someone pressed the pause button during the exercise.' },
            {
              term: 'Many anticipations',
              def: 'More than 10% of the responses were too fast to be a real reaction.',
            },
            { term: 'Few trials', def: 'The exercise was too short for reliable measures.' },
            {
              term: 'Mixed input',
              def: 'Different devices were used in the same run (for example mouse and touch).',
            },
            { term: 'Not completed', def: 'The patient stopped before the end.' },
          ],
        },
        { h: 'Detailed recording' },
        {
          p: 'For each run Sinapsi keeps the full recording (every touch, time and movement) in compressed form. It is used to replay the path and to recompute the measures if the formulas improve in the future. It is deleted automatically after the period set by the practice (24 months unless changed), while the summary measures remain. With “Keep with no expiry” you can keep it for important runs.',
        },
      ],
    },
    {
      id: 'limits',
      title: 'What these data are not',
      blocks: [
        {
          list: [
            'They are not standardised tests: the exercises are generated automatically and change every time, and there are no reference values for the population.',
            'They are not a diagnosis: measures such as left–right balance or slow responses describe what happened during an exercise, not its cause.',
            'They do not replace clinical assessment: they are one more tool for the therapist, who remains the only person who interprets the results and decides the treatment.',
            'They depend on context: tiredness, time of day, device and environment affect the results. To compare over time, keep conditions similar.',
          ],
        },
      ],
    },
  ],
}

export default en
