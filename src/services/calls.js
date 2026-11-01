import {
  ref,
  onValue,
  set,
  update,
  remove,
  get,
  runTransaction,
  onDisconnect,
  serverTimestamp,
} from "firebase/database";
import { db } from "./cloud.js";

const callRef = (id) => ref(db, "collegeChat/calls/" + id);

const inboxRef = (id) => ref(db, "collegeChat/incoming/" + id);

export const watchIncoming = (userId, callback, onError) =>
  onValue(inboxRef(userId), (snapshot) => callback(snapshot.val()), onError);

const historyRef = (a, b, id) => {
  const [first, second] = [a, b].sort();
  return ref(db, `collegeChat/callHistory/${first}/${second}/${id}`);
};

// Both endpoints may finish together; transactions preserve the first outcome.
async function finishRecord(id, userId, reason) {
  const result = await runTransaction(callRef(id), (current) => {
    if (!current) return current;
    if (current.status === "ended") return;
    const endedAt = Date.now();
    return {
      ...current,
      status: "ended",
      endedBy: userId,
      endedAt,
      outcome: current.connectedAt
        ? "completed"
        : reason === "No answer"
          ? "missed"
          : reason === "Declined"
            ? "declined"
            : reason === "Busy"
              ? "busy"
              : reason === "Connection timed out"
                ? "failed"
                : reason === "Failed"
                  ? "failed"
                  : "cancelled",
    };
  });
  const record = result.snapshot.val();
  if (!record) return;
  await runTransaction(
    historyRef(record.caller, record.receiver, id),
    (current) => {
      if (!current) return current;
      if (current.endedAt) return;
      return {
        ...current,
        outcome: record.outcome || "interrupted",
        endedAt: record.endedAt || Date.now(),
        duration: record.connectedAt
          ? Math.max(
              0,
              Math.floor(
                ((record.endedAt || Date.now()) - record.connectedAt) / 1000,
              ),
            )
          : 0,
      };
    },
  );
}

export async function dismissIncoming(userId, incoming) {
  await finishRecord(
    incoming.id,
    userId,
    Date.now() - incoming.createdAt > 60000 ? "No answer" : "Busy",
  );
  await remove(inboxRef(userId));
}

export function createCall({ user, other, video = false, incoming = null }) {
  const id = incoming?.id || crypto.randomUUID();
  let peer = null,
    local = null,
    remote = null,
    closed = false,
    created = Boolean(incoming),
    stops = [],
    timer = null,
    settingAnswer = false,
    muted = false,
    cameraEnabled = true;
  let view = {
    phase: incoming ? "Incoming call" : "Starting call…",
    local: null,
    remote: null,
    error: "",
  };
  const listeners = new Set(),
    seenCandidates = new Set();
  let pendingCandidates = [],
    outgoingCandidates = [];
  const emit = (patch) => {
    view = { ...view, ...patch };
    listeners.forEach((fn) => fn(view));
  };
  const isCaller = !incoming;

  // ICE candidates can arrive before the remote description is ready.
  async function flushCandidates() {
    if (!peer?.remoteDescription) return;
    const candidates = pendingCandidates;
    pendingCandidates = [];
    for (const candidate of candidates) await peer.addIceCandidate(candidate);
  }

  // Release listeners, peer state and device tracks on every exit path.
  function stopMedia() {
    clearTimeout(timer);
    stops.forEach((fn) => fn());
    stops = [];
    if (peer) {
      peer.close();
      peer = null;
    }
    local?.getTracks().forEach((track) => track.stop());
    remote?.getTracks().forEach((track) => track.stop());
  }

  async function end(reason = "Call ended") {
    if (closed) return;
    closed = true;
    stopMedia();
    emit({ phase: reason, ended: true });
    if (created) {
      try {
        await finishRecord(id, user.id, reason);
      } catch (error) {
        emit({
          error:
            "The call ended, but its history could not be saved. " +
            error.message,
        });
      }
      await Promise.allSettled([
        onDisconnect(callRef(id)).cancel(),
        remove(inboxRef(isCaller ? other.id : user.id)),
      ]);
    }
  }

  async function media() {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection)
      throw new Error(
        "Calling needs a supported browser on HTTPS or localhost.",
      );
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video,
    });
    if (closed) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
    local = stream;
    local.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    local.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled;
    });
    remote = new MediaStream();
    peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    local.getTracks().forEach((track) => peer.addTrack(track, local));
    peer.ontrack = (event) => {
      if (event.streams[0]) remote = event.streams[0];
      else remote.addTrack(event.track);
      emit({ remote });
    };
    const publishCandidate = (candidate) =>
      set(
        ref(
          db,
          `collegeChat/calls/${id}/${isCaller ? "callerIce" : "receiverIce"}/${crypto.randomUUID()}`,
        ),
        candidate,
      ).catch(fail);
    peer.onicecandidate = (event) => {
      if (!event.candidate || closed) return;
      const candidate = event.candidate.toJSON();
      if (!created) outgoingCandidates.push(candidate);
      else publishCandidate(candidate);
    };
    peer.onconnectionstatechange = () => {
      if (!peer) return;
      if (peer.connectionState === "connected") {
        clearTimeout(timer);
        runTransaction(
          ref(db, `collegeChat/calls/${id}/connectedAt`),
          (current) => current || Date.now(),
        ).catch((error) =>
          emit({
            error:
              "Connected, but call timing could not be saved: " + error.message,
          }),
        );
        emit({ phase: "Connected" });
      }
      if (peer.connectionState === "failed")
        fail(
          new Error(
            "Could not connect this call. Try another network; some networks require a TURN server.",
          ),
        );
    };
    emit({ local, remote });
    return true;
  }

  async function fail(error) {
    emit({
      error:
        error.name === "NotAllowedError"
          ? "Microphone or camera permission was denied. Allow access in your browser and try again."
          : error.message,
    });
    await end("Failed");
  }

  function listen() {
    stops.push(
      onValue(
        callRef(id),
        async (snapshot) => {
          const data = snapshot.val();
          if (!data || closed) return;
          try {
            if (data.status === "ended") {
              await end("Call ended");
              return;
            }
            if (
              isCaller &&
              data.answer &&
              peer &&
              !peer.currentRemoteDescription &&
              !settingAnswer
            ) {
              settingAnswer = true;
              await peer.setRemoteDescription(data.answer);
              await flushCandidates();
            }
            if (data.status === "accepted" && view.phase !== "Connected")
              emit({ phase: "Connecting…" });
          } catch (error) {
            fail(error);
          }
        },
        fail,
      ),
    );
    stops.push(
      onValue(
        ref(
          db,
          `collegeChat/calls/${id}/${isCaller ? "receiverIce" : "callerIce"}`,
        ),
        (snapshot) => {
          for (const [key, candidate] of Object.entries(snapshot.val() || {})) {
            if (!seenCandidates.has(key)) {
              seenCandidates.add(key);
              pendingCandidates.push(candidate);
            }
          }
          flushCandidates().catch(fail);
        },
        fail,
      ),
    );
  }

  return {
    id,
    other,
    video,
    incoming: Boolean(incoming),
    subscribe(callback) {
      listeners.add(callback);
      callback(view);
      return () => listeners.delete(callback);
    },
    async start() {
      try {
        if (!(await media())) return;
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        if (closed) return;
        await set(callRef(id), {
          id,
          caller: user.id,
          receiver: other.id,
          callerName: user.name,
          receiverName: other.name,
          video,
          status: "ringing",
          createdAt: Date.now(),
          offer: { type: offer.type, sdp: offer.sdp },
        });
        created = true;
        if (closed) {
          await update(callRef(id), { status: "ended" });
          return;
        }
        await set(historyRef(user.id, other.id, id), {
          id,
          caller: user.id,
          receiver: other.id,
          callerName: user.name,
          receiverName: other.name,
          video,
          createdAt: Date.now(),
          outcome: "ringing",
          duration: 0,
        });
        await onDisconnect(callRef(id)).update({
          status: "ended",
          outcome: "interrupted",
          endedAt: serverTimestamp(),
        });
        if (closed) return;
        for (const candidate of outgoingCandidates)
          await set(
            ref(db, `collegeChat/calls/${id}/callerIce/${crypto.randomUUID()}`),
            candidate,
          );
        outgoingCandidates = [];
        listen();
        await set(inboxRef(other.id), {
          id,
          from: user.id,
          name: user.name,
          video,
          createdAt: Date.now(),
        });
        if (
          !closed &&
          view.phase !== "Connected" &&
          view.phase !== "Connecting…"
        )
          emit({ phase: "Calling…" });
        if (!closed && view.phase !== "Connected")
          timer = setTimeout(() => end("No answer"), 45000);
      } catch (error) {
        await fail(error);
      }
    },
    async accept() {
      if (closed) return;
      try {
        emit({ phase: "Connecting…" });
        const snapshot = await get(callRef(id));
        const data = snapshot.val();
        if (!data || data.status === "ended") {
          await end();
          return;
        }
        if (!(await media())) return;
        await peer.setRemoteDescription(data.offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await update(callRef(id), {
          answer: { type: answer.type, sdp: answer.sdp },
          status: "accepted",
        });
        await remove(inboxRef(user.id));
        listen();
        if (!closed && view.phase !== "Connected")
          timer = setTimeout(() => end("Connection timed out"), 45000);
      } catch (error) {
        await fail(error);
      }
    },
    listenForEnd() {
      if (!incoming) return () => {};
      const stop = onValue(
        callRef(id),
        (snapshot) => {
          if (snapshot.val()?.status === "ended") end();
        },
        fail,
      );
      stops.push(stop);
      return () => {
        stop();
        stops = stops.filter((fn) => fn !== stop);
      };
    },
    mute(value) {
      muted = value;
      local?.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    },
    camera(enabled) {
      cameraEnabled = enabled;
      local?.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    },
    snapshot() {
      if (!video || !local) return;
      const element = document.createElement("video");
      element.srcObject = local;
      element.muted = true;
      element.onloadeddata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = element.videoWidth;
        canvas.height = element.videoHeight;
        canvas.getContext("2d").drawImage(element, 0, 0);
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "flabbychat-snapshot.png";
        link.click();
        element.pause();
        element.srcObject = null;
      };
      element.play().catch(() => {});
    },
    end,
  };
}
