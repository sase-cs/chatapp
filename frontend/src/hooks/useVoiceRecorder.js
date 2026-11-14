import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 120;
const WAVEFORM_BARS = 40;
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

// Shrinks the recorded loudness samples to a fixed number of bars, scaled so the loudest is 1.
function toWaveform(samples, bars = WAVEFORM_BARS) {
  if (!samples.length) return [];
  const size = samples.length / bars;
  const result = [];
  for (let i = 0; i < bars; i++) {
    const slice = samples.slice(Math.floor(i * size), Math.max(Math.floor((i + 1) * size), Math.floor(i * size) + 1));
    result.push(slice.reduce((a, b) => Math.max(a, b), 0));
  }
  const peak = Math.max(...result, 0.01);
  return result.map((v) => Math.round((v / peak) * 100) / 100);
}

/**
 * Records a voice note with MediaRecorder and samples its loudness with an AnalyserNode,
 * so the message can show a real waveform without decoding the audio again later.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState("idle"); // idle | recording
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState([]); // live bars while recording
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const samplesRef = useRef([]);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const resolveRef = useRef(null);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    audioCtxRef.current = null;
    recorderRef.current = null;
    setState("idle");
    setLevels([]);
    setElapsed(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stopRecorder = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const mimeType = pickMimeType();
    if (mimeType === null || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice notes aren't supported in this browser");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = audioCtx;
      const buffer = new Uint8Array(analyser.fftSize);

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      samplesRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const duration = (performance.now() - startedAtRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const waveform = toWaveform(samplesRef.current);
        cleanup();
        resolveRef.current?.({ blob, duration, waveform });
        resolveRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start();
      startedAtRef.current = performance.now();
      setState("recording");

      // sample loudness 10x per second (RMS of the time-domain signal)
      timerRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (const v of buffer) sum += ((v - 128) / 128) ** 2;
        const level = Math.min(1, Math.sqrt(sum / buffer.length) * 4);
        samplesRef.current.push(level);
        setLevels((prev) => [...prev.slice(-(WAVEFORM_BARS - 1)), level]);

        const seconds = (performance.now() - startedAtRef.current) / 1000;
        setElapsed(seconds);
        if (seconds >= MAX_SECONDS) stopRecorder();
      }, 100);
      return true;
    } catch (err) {
      cleanup();
      setError(err?.name === "NotAllowedError" ? "Microphone access was blocked" : "Couldn't start recording");
      return false;
    }
  }, [cleanup, stopRecorder]);

  // resolves with { blob, duration, waveform }
  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        stopRecorder();
      }),
    [stopRecorder],
  );

  const cancel = useCallback(() => {
    resolveRef.current = null;
    if (recorderRef.current) {
      recorderRef.current.onstop = null;
      stopRecorder();
    }
    cleanup();
  }, [cleanup, stopRecorder]);

  return { state, elapsed, levels, error, start, stop, cancel, maxSeconds: MAX_SECONDS };
}
