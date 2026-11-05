# Voice preparation and future Cartesia connection

No voice has been generated for this new six-film pack. The owner may supply a Cartesia API key later; no key is needed to finish the scripts, casting direction and line ledgers now. This file is the one provider-specific exception requested by the owner; picture/story documents remain independent of named software.

## What is ready before a credential exists

Every lead has a dedicated `04-VOICE-AND-SOUND.md`: adult voice casting description, exact script, line IDs, Romanized/Hindi text, delivery, pauses, estimated spoken duration, picture window, breath/reaction and sound cues. The line IDs travel with the shots and batches so a recording can be replaced without recreating unrelated pictures.

| Lead | Primary voice alias | Baseline performance distinction |
|---|---|---|
| Dhwani | `VOICE_DHWANI_V1_PENDING` | Light warm adult female voice, grounded conversational energy after exertion; humor in breath/timing, not shrillness |
| Rohan | `VOICE_ROHAN_V1_PENDING` | Mid-low adult male voice with a dry, practical delivery; office tiredness releases into an unguarded laugh |
| Tara | `VOICE_TARA_V1_PENDING` | Warm medium adult female voice, soft sleepy phrases becoming sincere appreciation and playful self-reassurance |
| Gary | `VOICE_GARY_V1_PENDING` | Warm resonant adult male voice, breath after sport, clear welcome and friendly spatial energy without shouting everything |
| Sameer | `VOICE_SAMEER_V1_PENDING` | Warm medium adult male voice, curious and lightly amused, with a brighter release when a small plan becomes possible |
| Meera | `VOICE_MEERA_V1_PENDING` | Clear adult female voice with precise, unforced phrasing, private practice focus and understated delighted surprise |

These aliases are **production labels**, not real provider voice IDs. They do not refer to a cloned real person. Choose an actual permitted voice only after a small sample is heard and approved.

## Later credential handling

When the owner is ready, use an approved private local environment/credential destination outside checked-in docs. Do not paste a key into Markdown, a prompt, a subtitle, a manifest, a screenshot, a terminal command that prints it or a shared link. Do not commit it. The eventual local name can be `CARTESIA_API_KEY`, but no environment file or credential is created by this planning work.

Before any future paid generation, confirm the current service inputs, account access and a concrete sample cost. A key by itself is not permission to generate all six films or clone a performer. Begin with a single short voice audition and the owner's intended budget, not a full-script spend.

## The per-line production record

The eventual voice job should copy these fields from the script; this is a planning schema, not an API request body:

```text
character_id: tara
line_id: TA-L01
script_version: v1
voice_alias: VOICE_TARA_V1_PENDING
selected_voice_id: [chosen after audition]
language: Hindi/Hinglish
text: Bas paanch minute aur…
meaning: Just five more minutes…
delivery: sleepy, low effort, a small breath after the phrase
picture_shot: TA01
slot_start: [from selected edit]
slot_end: [from selected edit]
estimated_spoken_duration: [from line ledger]
approved_take: [not generated]
audio_file: [not generated]
actual_duration: [measure after generation]
pronunciation_review: [pending]
consent_or_stock_voice_rights: [record before use]
```

Only one text variant is spoken at a time. Romanized Hindi and Devanagari columns are two written representations of the same line. Never concatenate them into a repeated bilingual performance by accident. Keep stage directions outside spoken text so the voice does not say “whispers” or read a bracketed pause aloud.

## Small audition, then measured timing

1. Select one stock/original permitted voice per lead based on age, timbre, pronunciation and acting range, not only gender or pitch. No celebrity imitation or nonconsensual clone.
2. Audition one ordinary line, one sincere line and one amused/physical-effort line from that lead. They can be separate clips, not one overwritten output.
3. Listen for Hindi/Hinglish code-switching, names, place words, clipped consonants, forced pauses, excessive breathiness and unintended caricature. The owner must actually hear the result; an audio file existing or a waveform passing checks does not approve the performance.
4. Record the selected voice and settings as a version. Keep other takes separate. Do not silently swap a voice for one line because it generated faster.
5. Measure every actual clip before fitting it into the edit. Use the line's designated extra silence/hold or extend that shot if needed. Cut optional words only with script review; do not speed up a warm line to hit a fixed second count.
6. Add final lip timing only after the approved audio exists. Reference phoneme/mouth shapes as needed, but do not invent exact frame-level mouth timings in advance of hearing the recording.

## Mouth, eye and body acting

On a visible spoken line, the mouth follows words and returns to rest between them. Eyes can look toward the listener, invitation or mirror; every word does not need a new eyebrow pose. Keep a preparatory breath and a short settling beat. Offscreen voice notes or over-shoulder reads can ease mouth visibility naturally, rather than hiding every difficult line with a random cut.

Laughter, sigh, small “hmm”, gasps and effort sounds get separate direction; do not ask a speech engine to recite stage instructions. Exertion is controlled and age-appropriate, not a strained caricature. If a video already has voice, keep a clean picture take/source and replace audio deliberately with a reviewed sound pass rather than layering two voices.

## Supporting roles and sound mix

Use only the few supporting voices actually scripted. Distinct aliases and line IDs make them trackable. A friend in one film is not automatically another lead. Crowd murmur and a whole table's laugh are ambience/performance layers, not ten extra synthetic speaking characters.

Record room/field/café/stage ambience separately from dialogue. Keep music lower during speech and preserve intentional silence around the postcard response, a quiet invitation or a moment before going on stage. Avoid clipping, abrupt noise-floor changes, cut-off breaths and ambience that continues from the wrong location. Final loudness/format follows the selected delivery, not a guessed provider parameter.

## What remains pending

Owner key through a private destination; actual permitted voice IDs; heard audition approval; current service capability/cost confirmation; actual recordings and durations; pronunciation review; final line-level lip sync. All story and shot writing can be reviewed independently while these are pending.
