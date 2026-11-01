import React, { useEffect, useRef, useState } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Camera,
} from "lucide-react";
import ringtone from "../assets/audio/ring.mp3";
import Avatar from "./Avatar.jsx";

export default function CallDialog({
  session,
  onClose,
  soundEnabled = true,
  photoURL,
}) {
  const [state, setState] = useState({ phase: "Starting call…" });
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [ringBlocked, setRingBlocked] = useState(false);
  const ring = useRef(null);
  const dialog = useRef(),
    local = useRef(),
    remote = useRef();

  useEffect(() => {
    const el = dialog.current;
    el.showModal();
    const stop = session.subscribe(setState);
    const stopEnd = session.listenForEnd();
    return () => {
      stop();
      stopEnd();
      el.close();
    };
  }, [session]);

  useEffect(() => {
    if (local.current) local.current.srcObject = state.local || null;
    if (remote.current) {
      remote.current.srcObject = state.remote || null;
      if (state.remote)
        remote.current
          .play()
          .then(() => setPlayError(false))
          .catch(() => setPlayError(true));
    }
  }, [state.local, state.remote]);

  const ended =
    state.ended ||
    [
      "Call ended",
      "No answer",
      "Connection timed out",
      "Failed",
      "Declined",
      "Busy",
    ].includes(state.phase);

  useEffect(() => {
    // The effect cleanup stops the loop as soon as ringing ends or sound is disabled.
    const shouldRing =
      soundEnabled &&
      !ended &&
      (state.phase === "Incoming call" || state.phase === "Calling…");
    if (!shouldRing) return;
    const audio = new Audio(ringtone);
    ring.current = audio;
    audio.loop = true;
    audio.volume = session.incoming ? 0.65 : 0.35;
    audio.play().catch(() => setRingBlocked(true));
    return () => {
      audio.pause();
      audio.currentTime = 0;
      ring.current = null;
      setRingBlocked(false);
    };
  }, [soundEnabled, ended, state.phase, session]);

  async function close() {
    await session.end(
      session.incoming && state.phase === "Incoming call"
        ? "Declined"
        : "Call ended",
    );
    onClose();
  }

  return (
    <dialog
      className="call-dialog"
      ref={dialog}
      aria-labelledby="call-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <h2 id="call-title">
        {session.video ? "Video call" : "Voice call"} with {session.other.name}
      </h2>
      <p role="status">{state.phase}</p>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <div className={`call-videos ${session.video ? "" : "audio-only"}`}>
        <video
          ref={remote}
          autoPlay
          playsInline
          aria-label="Remote participant"
        />
        {session.video && (
          <video
            ref={local}
            autoPlay
            playsInline
            muted
            aria-label="Your camera"
          />
        )}
        {!session.video && (
          <Avatar
            className="call-avatar"
            name={session.other.name}
            photoURL={photoURL || session.other.photoURL}
          />
        )}
      </div>
      {ringBlocked && !ended && (
        <button
          className="secondary"
          onClick={() =>
            ring.current
              ?.play()
              .then(() => setRingBlocked(false))
              .catch(() => setRingBlocked(true))
          }
        >
          Play calling sound
        </button>
      )}
      {playError && (
        <button
          className="secondary"
          onClick={() => remote.current.play().then(() => setPlayError(false))}
        >
          Play call audio
        </button>
      )}
      <div className="call-buttons">
        {session.incoming && state.phase === "Incoming call" ? (
          <button
            className="primary"
            disabled={accepting}
            onClick={() => {
              setAccepting(true);
              session.accept();
            }}
          >
            <Phone size={18} /> Accept
          </button>
        ) : (
          !ended && (
            <>
              <button
                className="secondary"
                onClick={() => {
                  session.mute(!muted);
                  setMuted(!muted);
                }}
              >
                {muted ? <MicOff size={18} /> : <Mic size={18} />}{" "}
                {muted ? "Unmute" : "Mute"}
              </button>
              {session.video && (
                <>
                  <button
                    className="secondary"
                    onClick={() => {
                      session.camera(!camera);
                      setCamera(!camera);
                    }}
                  >
                    {camera ? <Video size={18} /> : <VideoOff size={18} />}{" "}
                    Camera
                  </button>
                  <button
                    className="secondary"
                    onClick={() => session.snapshot()}
                    disabled={!camera || !state.local}
                  >
                    <Camera size={18} /> Snapshot
                  </button>
                </>
              )}
            </>
          )
        )}
        <button className="danger" onClick={close}>
          <PhoneOff size={18} />
          {ended
            ? "Close"
            : session.incoming && state.phase === "Incoming call"
              ? "Decline"
              : "End call"}
        </button>
      </div>
      <small>
        Calls need microphone permission. Video also needs camera permission.
      </small>
    </dialog>
  );
}
