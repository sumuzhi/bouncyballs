import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const DEFAULT_FIST_START_RATIO = 1.08;
const FIST_HYSTERESIS = 0.12;
const SMOOTHING_FACTOR = 0.35;

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getPalmCenter(landmarks) {
  const indices = [0, 5, 9, 13, 17];
  const total = indices.reduce(
    (acc, idx) => ({
      x: acc.x + landmarks[idx].x,
      y: acc.y + landmarks[idx].y,
    }),
    { x: 0, y: 0 },
  );
  return {
    x: total.x / indices.length,
    y: total.y / indices.length,
  };
}

function getFistRatio(landmarks) {
  const palmCenter = getPalmCenter(landmarks);
  const fingerTips = [4, 8, 12, 16, 20];
  const avgTipDistance =
    fingerTips.reduce((sum, idx) => sum + distance(landmarks[idx], palmCenter), 0) /
    fingerTips.length;
  const palmScale =
    (distance(landmarks[0], landmarks[9]) + distance(landmarks[5], landmarks[17])) / 2;
  return avgTipDistance / Math.max(palmScale, 1e-4);
}

function isFingerCurled(landmarks, tipIdx, pipIdx) {
  const wrist = landmarks[0];
  const tipDistance = distance(landmarks[tipIdx], wrist);
  const pipDistance = distance(landmarks[pipIdx], wrist);
  return tipDistance <= pipDistance * 0.9;
}

function isFistGesture(landmarks, gripping, fistStartRatio) {
  const fistEndRatio = fistStartRatio + FIST_HYSTERESIS;
  const ratio = getFistRatio(landmarks);
  const palmCenter = getPalmCenter(landmarks);
  const curledCount =
    [8, 12, 16, 20].filter((tip, index) => isFingerCurled(landmarks, tip, [6, 10, 14, 18][index]))
      .length;
  const thumbCurled =
    distance(landmarks[4], palmCenter) <= distance(landmarks[2], palmCenter) * 0.92;
  if (gripping) {
    return ratio <= fistEndRatio && (curledCount >= 2 || thumbCurled);
  }
  return ratio <= fistStartRatio && curledCount >= 3;
}

function joinBaseUrl(basePath, relativePath) {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBase}${relativePath}`.replace(/([^:]\/)\/+/g, '$1');
}

function ensureDirUrl(inputUrl) {
  if (!inputUrl) {
    return '';
  }
  return inputUrl.endsWith('/') ? inputUrl : `${inputUrl}/`;
}

function resolveRuntimeBaseUrl() {
  if (typeof window === 'undefined') {
    return '/';
  }
  const wujieUrl = window.__WUJIE?.url;
  if (wujieUrl) {
    const resolved = new URL(wujieUrl, window.location.href);
    return ensureDirUrl(resolved.href);
  }
  const wujiePublicPath = window.__WUJIE_PUBLIC_PATH__;
  if (wujiePublicPath) {
    const resolved = new URL(wujiePublicPath, window.location.href);
    return ensureDirUrl(resolved.href);
  }
  return ensureDirUrl(`${window.location.origin}${import.meta.env.BASE_URL || '/'}`);
}

function resolveWasmBaseUrl() {
  return joinBaseUrl(resolveRuntimeBaseUrl(), 'mediapipe/');
}

function resolveModelCandidates() {
  const runtimeBaseUrl = resolveRuntimeBaseUrl();
  const candidates = [];
  candidates.push(joinBaseUrl(runtimeBaseUrl, 'models/hand_landmarker.task'));
  if (import.meta.env.VITE_HAND_LANDMARKER_MODEL_URL) {
    candidates.push(import.meta.env.VITE_HAND_LANDMARKER_MODEL_URL);
  }
  return [...new Set(candidates)];
}

async function ensureModuleFactoryReady(wasmBaseUrl) {
  if (typeof window === 'undefined' || window.ModuleFactory) {
    return;
  }
  const loaderUrl = joinBaseUrl(wasmBaseUrl, 'vision_wasm_internal.js');
  const code = await fetch(loaderUrl, { credentials: 'same-origin' }).then((res) => {
    if (!res.ok) {
      throw new Error(`wasm loader request failed: ${res.status}`);
    }
    return res.text();
  });
  const factory = new Function(
    `${code}\nreturn typeof ModuleFactory !== "undefined" ? ModuleFactory : (typeof module !== "undefined" && module.exports ? module.exports : undefined);`,
  )();
  if (factory) {
    window.ModuleFactory = factory.default || factory;
    return;
  }
  throw new Error('ModuleFactory preload failed');
}

export default function useHandGestureDrag({
  videoRef,
  boardRef,
  onPickCard,
  onMoveCard,
  onDropCard,
  cursorSensitivity = 1.9,
  fistStartRatio = DEFAULT_FIST_START_RATIO,
}) {
  const [ready, setReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState({ x: 0, y: 0, active: false, pinch: false });
  const [draggingCardId, setDraggingCardId] = useState('');
  const rafRef = useRef(0);
  const handLandmarkerRef = useRef(null);
  const isRunningRef = useRef(true);
  const smoothPointRef = useRef({ x: 0, y: 0, init: false });
  const pinchRef = useRef(false);
  const gripOffsetRef = useRef({ x: 0, y: 0, active: false });
  const draggingCardIdRef = useRef('');
  const streamRef = useRef(null);
  const calibrationRef = useRef({ active: false, anchorX: 0.5, anchorY: 0.5 });
  const lastHandPointRef = useRef({ x: 0.5, y: 0.5, valid: false });

  const resetCursorToCenter = () => {
    const board = boardRef.current;
    if (!board) {
      return;
    }
    const rect = board.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const { x, y, valid } = lastHandPointRef.current;
    calibrationRef.current = {
      active: valid,
      anchorX: valid ? x : 0.5,
      anchorY: valid ? y : 0.5,
    };
    smoothPointRef.current = { x: centerX, y: centerY, init: true };
    gripOffsetRef.current.active = false;
    pinchRef.current = false;
    setDraggingCardId('');
    setCursor({ x: centerX, y: centerY, active: true, pinch: false });
  };

  useEffect(() => {
    draggingCardIdRef.current = draggingCardId;
  }, [draggingCardId]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const wasmBaseUrl = resolveWasmBaseUrl();
      try {
        await ensureModuleFactoryReady(wasmBaseUrl);
        const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl);
        const modelCandidates = resolveModelCandidates();
        let handLandmarker = null;
        let lastError = null;
        for (let i = 0; i < modelCandidates.length; i += 1) {
          try {
            handLandmarker = await HandLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetPath: modelCandidates[i] },
              numHands: 1,
              runningMode: 'VIDEO',
            });
            if (handLandmarker) {
              break;
            }
          } catch (error) {
            lastError = error;
          }
        }
        if (!handLandmarker) {
          throw lastError || new Error('No available model source');
        }
        handLandmarkerRef.current = handLandmarker;
        if (!mounted) {
          return;
        }
        setReady(true);
      } catch (err) {
        if (mounted) {
          const detail =
            err && typeof err.message === 'string'
              ? err.message.slice(0, 120)
              : 'unknown';
          setError(`手势模型加载失败：${detail}（WASM:${wasmBaseUrl}）`);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }

    let mounted = true;

    const openCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          return;
        }
        video.srcObject = stream;
        await video.play();
        if (mounted) {
          setCameraReady(true);
        }
      } catch (_err) {
        if (mounted) {
          setError('无法访问摄像头，请检查权限设置');
        }
      }
    };

    openCamera();

    return () => {
      mounted = false;
    };
  }, [ready, videoRef]);

  useEffect(() => {
    if (!ready || !cameraReady) {
      return undefined;
    }
    isRunningRef.current = true;

    const tick = () => {
      if (!isRunningRef.current) {
        return;
      }
      const handLandmarker = handLandmarkerRef.current;
      const video = videoRef.current;
      const board = boardRef.current;
      if (!handLandmarker || !video || !board) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const result = handLandmarker.detectForVideo(video, performance.now());
      const hasHand = result.landmarks && result.landmarks.length > 0;
      if (!hasHand) {
        setCursor((prev) => ({ ...prev, active: false, pinch: false }));
        if (pinchRef.current && draggingCardIdRef.current) {
          onDropCard(draggingCardIdRef.current, null);
          setDraggingCardId('');
        }
        pinchRef.current = false;
        gripOffsetRef.current.active = false;
        lastHandPointRef.current.valid = false;
        smoothPointRef.current.init = false;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const landmarks = result.landmarks[0];
      const fistActive = isFistGesture(landmarks, pinchRef.current, fistStartRatio);
      const cursorLandmark = getPalmCenter(landmarks);
      const boardRect = board.getBoundingClientRect();
      const mirrorX = 1 - cursorLandmark.x;
      lastHandPointRef.current = { x: mirrorX, y: cursorLandmark.y, valid: true };
      const anchorX = calibrationRef.current.active ? calibrationRef.current.anchorX : 0.5;
      const anchorY = calibrationRef.current.active ? calibrationRef.current.anchorY : 0.5;
      const adjustedX = (mirrorX - anchorX) * cursorSensitivity + 0.5;
      const adjustedY = (cursorLandmark.y - anchorY) * cursorSensitivity + 0.5;
      let rawX = adjustedX * boardRect.width;
      let rawY = adjustedY * boardRect.height;

      if (pinchRef.current && gripOffsetRef.current.active) {
        rawX += gripOffsetRef.current.x;
        rawY += gripOffsetRef.current.y;
      }

      if (!smoothPointRef.current.init) {
        smoothPointRef.current = { x: rawX, y: rawY, init: true };
      } else {
        const factor = pinchRef.current ? 0.2 : SMOOTHING_FACTOR;
        smoothPointRef.current.x += (rawX - smoothPointRef.current.x) * factor;
        smoothPointRef.current.y += (rawY - smoothPointRef.current.y) * factor;
      }

      const point = {
        x: Math.min(Math.max(smoothPointRef.current.x, 0), boardRect.width),
        y: Math.min(Math.max(smoothPointRef.current.y, 0), boardRect.height),
      };

      const isPinchStart = !pinchRef.current && fistActive;
      const isPinchEnd = pinchRef.current && !fistActive;

      if (isPinchStart) {
        gripOffsetRef.current = {
          x: point.x - rawX,
          y: point.y - rawY,
          active: true,
        };
        const pickedCard = onPickCard(point);
        if (pickedCard) {
          setDraggingCardId(pickedCard);
        }
      }

      const currentDraggingCardId = draggingCardIdRef.current;
      if (currentDraggingCardId && !isPinchEnd) {
        onMoveCard(currentDraggingCardId, point);
      }

      if (isPinchEnd) {
        if (currentDraggingCardId) {
          onDropCard(currentDraggingCardId, point);
          setDraggingCardId('');
        }
        gripOffsetRef.current.active = false;
      }

      pinchRef.current = !isPinchEnd && (pinchRef.current || isPinchStart);
      setCursor({ x: point.x, y: point.y, active: true, pinch: pinchRef.current });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      isRunningRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [boardRef, cameraReady, cursorSensitivity, fistStartRatio, onDropCard, onMoveCard, onPickCard, ready, videoRef]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  return {
    ready,
    cameraReady,
    error,
    cursor,
    draggingCardId,
    resetCursorToCenter,
  };
}
