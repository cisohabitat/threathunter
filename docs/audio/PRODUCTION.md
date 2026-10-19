# Candidate M01 voice pack v1

This is a generated content package for the internal build. **Human listening review and physical-device audio acceptance have not passed.** All current entries retain `pending-human-listening` status and no reviewer is recorded.

## Source and rights record

- Stock model: `en_US-ljspeech-high`, [Piper voice repository](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/ljspeech/high). Its root repository metadata declares MIT; the retained [model card](LJSPEECH_MODEL_CARD.md) identifies the LJSpeech dataset as public domain. [Dataset source](https://keithito.com/LJ-Speech-Dataset/).
- The exact model SHA-256 is recorded in `src/presentation/voice/manifest.json`. No model weights or speech-generation runtime are shipped to players.
- Generation uses Piper 1.8.0 and NumPy 2.5.4 at build/content-production time. Piper is a separate GPL-licensed generation tool, not an application runtime dependency. FFmpeg encodes delivery assets.
- Morgan is a fictional character using a stock synthetic English (US) voice; this is not an employee recording or a user-voice clone. The US voice is a candidate deviation from the GDD's preferred Singapore English delivery, pending audio-direction review.
- Four short UI tones and a quiet looping ambience are original synthesized signals authored for this repository. No external music is included.

## Reproduce

Create a separate Python environment with `piper-tts==1.8.0` and `numpy==2.5.4`; install FFmpeg. Download the model and its matching `.onnx.json` configuration from the source above and verify the manifest model hash. Run:

```sh
python scripts/generate_voice.py /absolute/en_US-ljspeech-high.onnx /absolute/lossless-masters
```

The script regenerates all clips from `src/presentation/voice/cues.json`, exports MP3 assets into `public/audio/m01`, and writes the manifest with scripts, cues, delivery conditions, measured delivery durations, delivery byte counts and SHA-256 hashes. It normalizes speech to a target -20 LUFS and -2 dB true peak using FFmpeg. Lossless source audio must remain outside `public/` and the initial site payload. The current workspace retains masters in `/workspace/.cache/threat-hunter-voice/masters`; this is a workspace cache, not a durable release archive. Archive reviewed masters in a durable asset store before sign-off.

## Playback and fairness

Howler loads and verifies the whole active mission pack after explicit opt-in, including every alternative debrief. There is no branch-selective asset request, runtime inference, microphone, API key or recurring generation service. Captions and accessible transcripts use the same canonical script text.

The mixer consumes public deliveries and closed-case reports only. Playback callbacks, preparation, volume, mute, skip and replay have no command adapter. Debrief reasoning narration uses the evidence-supported report class; sparse twins share the same reasoning clip. A separately selected post-close operational-outcome clip reports whether the simulated objective occurred.

Listening starts muted each fresh session. Level, caption and screen-reader-friendly preferences persist separately from game saves. The screen-reader-friendly option disables unsolicited speech and retains on-demand playback. Navigation clears obsolete narration; backgrounding stops playback without a backlog on return.

## Still required for acceptance

Listen to every final clip for pronunciation, pace, clarity, artefacts and level consistency. Review the voice identity/accent and production rights record. Check low-volume and actual phone/iPad speakers, Safari autoplay/interruption, screen-reader coexistence and selected transcript parity. Record reviewer, build, devices and results. Technical asset/decode/browser tests do not establish these human acceptance criteria.
