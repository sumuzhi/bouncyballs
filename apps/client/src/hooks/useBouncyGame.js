import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Matter from 'matter-js';
import { fetchCharacters } from '../services/characters';

const Engine = Matter.Engine;
const Runner = Matter.Runner;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Events = Matter.Events;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Body = Matter.Body;

const BALL_RADIUS = 30;
const FLOOR_OFFSET = 50;

export function useBouncyGame(enabled = true) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const wallsRef = useRef([]);
  const ballsRef = useRef([]);
  const mouseConstraintRef = useRef(null);
  const mouseRef = useRef(null);
  const animationFrameRef = useRef(null);
  const disposedRef = useRef(false);
  const resizeObserverRef = useRef(null);
  const collisionHandlerRef = useRef(null);
  const pausedMouseDownHandlerRef = useRef(null);
  const widthRef = useRef(0);
  const heightRef = useRef(0);
  const vocabularyRef = useRef([]);
  const isAudioActiveRef = useRef(false);
  const currentNormalizedVolRef = useRef(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const streamRef = useRef(null);
  const isPausedRef = useRef(false);
  const sensitivityRef = useRef(1.5);
  const ballCountPercentRef = useRef(10);

  const [isAudioActive, setIsAudioActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [volumePercent, setVolumePercent] = useState(0);
  const [sensitivity, setSensitivity] = useState(1.5);
  const [ballCountPercent, setBallCountPercent] = useState(10);
  const [ballCountDisplay, setBallCountDisplay] = useState('10% (0个)');
  const [selectedBall, setSelectedBall] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [fullscreenText, setFullscreenText] = useState('全屏');

  const updateBallCountDisplay = useCallback((percent) => {
    const total = vocabularyRef.current.length;
    const count = Math.max(1, Math.floor(total * (percent / 100)));
    setBallCountDisplay(`${percent}% (${count}个)`);
    return count;
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const width =
      document.documentElement.clientWidth ||
      document.body.clientWidth ||
      window.innerWidth;
    const height =
      document.documentElement.clientHeight ||
      document.body.clientHeight ||
      window.innerHeight;
    widthRef.current = width;
    heightRef.current = height;
    canvas.width = width;
    canvas.height = height;
  }, []);

  const createWalls = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    const width = widthRef.current;
    const height = heightRef.current;
    const wallOptions = { isStatic: true, render: { visible: false } };
    const walls = [
      Bodies.rectangle(width / 2, height + 50, width * 2, 100 + FLOOR_OFFSET * 2, wallOptions),
      Bodies.rectangle(-50, height / 2, 100, height * 2, wallOptions),
      Bodies.rectangle(width + 50, height / 2, 100, height * 2, wallOptions),
      Bodies.rectangle(width / 2, -2000, width * 2, 100, wallOptions),
    ];
    wallsRef.current = walls;
    Composite.add(engine.world, walls);
  }, []);

  const createBalls = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !vocabularyRef.current.length) {
      return;
    }

    if (ballsRef.current.length > 0) {
      Composite.remove(
        engine.world,
        ballsRef.current.map((ball) => ball.body),
      );
    }

    const percent = ballCountPercentRef.current;
    const count = updateBallCountDisplay(percent);
    const shuffled = [...vocabularyRef.current]
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    const balls = shuffled.map((item, index) => {
      const x = Math.random() * (widthRef.current - BALL_RADIUS * 2) + BALL_RADIUS;
      const y = Math.random() * (heightRef.current / 2) - 200;
      const body = Bodies.circle(x, y, BALL_RADIUS, {
        restitution: 0.95,
        friction: 0.002,
        frictionStatic: 0,
        frictionAir: 0.005,
        density: 0.04,
        angle: Math.random() * Math.PI * 2,
        slop: 0.05,
      });
      return {
        body,
        char: item.char,
        pinyin: item.pinyin,
        examples: item.examples || [],
        audio: item.audio,
        stroke: item.stroke,
        color: `hsl(${Math.random() * 360}, 85%, 65%)`,
        threshold: 0.05 + (index / shuffled.length) * 0.4,
        lastJump: 0,
      };
    });

    ballsRef.current = balls;
    Composite.add(
      engine.world,
      balls.map((ball) => ball.body),
    );
  }, [updateBallCountDisplay]);

  const applyCollisionForce = useCallback((ballObj) => {
    if (currentNormalizedVolRef.current <= ballObj.threshold) {
      return;
    }
    const now = Date.now();
    if (now - ballObj.lastJump < 50) {
      return;
    }
    ballObj.lastJump = now;
    const restitutionBoost =
      (currentNormalizedVolRef.current - ballObj.threshold) *
      0.5 *
      Math.sqrt(sensitivityRef.current);
    if (restitutionBoost <= 0) {
      return;
    }
    const body = ballObj.body;
    const boostForce = Math.min(restitutionBoost * 0.05, 0.5) * body.mass;
    Body.applyForce(body, body.position, {
      x: (Math.random() - 0.5) * boostForce * 10,
      y: -boostForce * 15,
    });
  }, []);

  const showBallInfoByPosition = useCallback((position) => {
    const bodies = ballsRef.current.map((ball) => ball.body);
    const clickedBodies = Matter.Query.point(bodies, position);
    if (!clickedBodies.length) {
      setSelectedBall(null);
      setDetailVisible(false);
      return;
    }
    const target = ballsRef.current.find((ball) => ball.body === clickedBodies[0]);
    if (target) {
      setSelectedBall(target);
    }
  }, []);

  const addMouseControl = useCallback(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) {
      return;
    }

    const mouse = Mouse.create(canvas);
    mouseRef.current = mouse;
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    mouseConstraintRef.current = mouseConstraint;
    Composite.add(engine.world, mouseConstraint);

    mouse.element.removeEventListener('mousewheel', mouse.mousewheel);
    mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);

    Events.on(mouseConstraint, 'mousedown', (event) => {
      showBallInfoByPosition(event.mouse.position);
    });

    const pausedHandler = () => {
      if (!isPausedRef.current || !mouseRef.current) {
        return;
      }
      showBallInfoByPosition(mouseRef.current.position);
    };
    pausedMouseDownHandlerRef.current = pausedHandler;
    canvas.addEventListener('mousedown', pausedHandler);
  }, [showBallInfoByPosition]);

  const handleResize = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    resize();
    Composite.remove(engine.world, wallsRef.current);
    createWalls();
    ballsRef.current.forEach((ballObj) => {
      const body = ballObj.body;
      let newX = body.position.x;
      let newY = body.position.y;
      if (newX < BALL_RADIUS) newX = BALL_RADIUS;
      if (newX > widthRef.current - BALL_RADIUS) newX = widthRef.current - BALL_RADIUS;
      if (newY < BALL_RADIUS) newY = BALL_RADIUS;
      if (newY > heightRef.current - FLOOR_OFFSET - BALL_RADIUS) {
        newY = heightRef.current - FLOOR_OFFSET - BALL_RADIUS;
      }
      if (newX !== body.position.x || newY !== body.position.y) {
        Body.setPosition(body, { x: newX, y: newY });
      }
    });
  }, [createWalls, resize]);

  const getAudioData = useCallback(() => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    if (!isAudioActiveRef.current || !analyser || !dataArray) {
      return 0;
    }
    analyser.getByteFrequencyData(dataArray);
    const relevantFreqCount = Math.floor(dataArray.length * 0.5);
    let sum = 0;
    for (let i = 0; i < relevantFreqCount; i += 1) {
      sum += dataArray[i];
    }
    return sum / relevantFreqCount;
  }, []);

  const renderLoop = useCallback(() => {
    if (disposedRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const volume = getAudioData();
    let normalizedVol = 0;
    if (isAudioActiveRef.current) {
      normalizedVol = Math.min((volume / 255) * sensitivityRef.current, 3.0);
      currentNormalizedVolRef.current = normalizedVol;
      const volPercent = Math.min(normalizedVol * 100, 100);
      setVolumePercent(volPercent);

      if (!isPausedRef.current && normalizedVol > 0.1) {
        ballsRef.current.forEach((ballObj) => {
          const body = ballObj.body;
          const isNearBottom = body.position.y > heightRef.current - FLOOR_OFFSET - 150;
          if (isNearBottom && Math.abs(body.velocity.y) < 0.2) {
            Body.applyForce(body, body.position, {
              x: (Math.random() - 0.5) * 0.0005 * body.mass,
              y: -0.0005 * body.mass,
            });
          }
          if (isNearBottom && normalizedVol > ballObj.threshold) {
            const now = Date.now();
            const cooldown = 1000 / (1 + normalizedVol * 10);
            if (now - ballObj.lastJump > cooldown) {
              ballObj.lastJump = now;
              const shakeForce =
                (normalizedVol - ballObj.threshold) *
                0.1 *
                body.mass *
                Math.sqrt(sensitivityRef.current);
              Body.applyForce(body, body.position, {
                x: (Math.random() - 0.5) * shakeForce * 5,
                y: -shakeForce * 8,
              });
            }
          }
        });
      }
    }

    ctx.clearRect(0, 0, widthRef.current, heightRef.current);
    ballsRef.current.forEach((ballObj) => {
      const body = ballObj.body;
      const { x, y } = body.position;
      ctx.save();
      ctx.translate(x, y);

      ctx.beginPath();
      ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = ballObj.color;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-BALL_RADIUS * 0.3, -BALL_RADIUS * 0.3, BALL_RADIUS * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();

      ctx.fillStyle = '#666';
      ctx.font = '16px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ballObj.pinyin, 0, -16);

      ctx.fillStyle = '#333';
      ctx.font = 'bold 28px "KaiTi", "STKaiti", "BiauKai", "楷体", "楷体_GB2312", serif';
      ctx.fillText(ballObj.char, 0, 10);
      ctx.restore();
    });

    const floorY = heightRef.current - FLOOR_OFFSET;
    ctx.fillStyle = '#81c784';
    ctx.fillRect(0, floorY, widthRef.current, FLOOR_OFFSET);
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(widthRef.current, floorY);
    ctx.stroke();

    if (!isPausedRef.current) {
      ballsRef.current.forEach((ballObj) => {
        const body = ballObj.body;
        if (body.position.y < -100) {
          const depth = -100 - body.position.y;
          const pushDownForce = 0.0005 * depth * body.mass;
          Body.applyForce(body, body.position, { x: 0, y: pushDownForce });
          body.frictionAir = 0.02;
        } else {
          body.frictionAir = 0.005;
        }
        if (body.speed > 30) {
          Body.setSpeed(body, 30);
        }
        if (body.position.x < BALL_RADIUS) {
          Body.setPosition(body, { x: BALL_RADIUS, y: body.position.y });
          Body.setVelocity(body, {
            x: Math.abs(body.velocity.x) * 0.5,
            y: body.velocity.y,
          });
        } else if (body.position.x > widthRef.current - BALL_RADIUS) {
          Body.setPosition(body, {
            x: widthRef.current - BALL_RADIUS,
            y: body.position.y,
          });
          Body.setVelocity(body, {
            x: -Math.abs(body.velocity.x) * 0.5,
            y: body.velocity.y,
          });
        }
        if (body.position.y > heightRef.current + 100) {
          Body.setPosition(body, {
            x: body.position.x,
            y: heightRef.current - FLOOR_OFFSET - BALL_RADIUS * 2,
          });
          Body.setVelocity(body, { x: 0, y: 0 });
        }
      });
    }

    const mouseConstraint = mouseConstraintRef.current;
    if (mouseConstraint?.body) {
      const pos = mouseConstraint.body.position;
      const mousePos = mouseConstraint.mouse.position;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (!disposedRef.current) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    }
  }, [getAudioData]);

  const togglePause = useCallback(() => {
    const runner = runnerRef.current;
    const engine = engineRef.current;
    if (!runner || !engine || !isAudioActiveRef.current) {
      return;
    }
    const nextPaused = !isPausedRef.current;
    isPausedRef.current = nextPaused;
    setIsPaused(nextPaused);
    if (nextPaused) {
      Runner.stop(runner);
    } else {
      Runner.run(runner, engine);
    }
  }, []);

  const startAudio = useCallback(async () => {
    try {
      if (audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      } else {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const microphone = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        microphone.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        streamRef.current = stream;
      }

      isAudioActiveRef.current = true;
      setIsAudioActive(true);
      setOverlayVisible(false);
    } catch (error) {
      alert('无法访问麦克风，请检查权限。');
    }
  }, []);

  const refreshBalls = useCallback(() => {
    createBalls();
  }, [createBalls]);

  const onBallCountChange = useCallback(
    (percent) => {
      ballCountPercentRef.current = percent;
      setBallCountPercent(percent);
      updateBallCountDisplay(percent);
      createBalls();
    },
    [createBalls, updateBallCountDisplay],
  );

  const onSensitivityChange = useCallback((value) => {
    sensitivityRef.current = value;
    setSensitivity(value);
  }, []);

  const playAudio = useCallback((src) => {
    if (!src) {
      return;
    }
    const audio = new Audio(src);
    audio.play().catch(() => {});
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    ballCountPercentRef.current = ballCountPercent;
  }, [ballCountPercent]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenText(document.fullscreenElement ? '退出全屏' : '全屏');
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;
    disposedRef.current = false;

    const bootstrap = async () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      engineRef.current = Engine.create();
      engineRef.current.world.gravity.y = 1;
      resize();
      createWalls();

      const characters = await fetchCharacters(1000).catch(() => []);
      if (disposed) {
        return;
      }
      vocabularyRef.current = characters;
      updateBallCountDisplay(ballCountPercentRef.current);
      if (characters.length) {
        createBalls();
      }

      addMouseControl();

      runnerRef.current = Runner.create();
      Runner.run(runnerRef.current, engineRef.current);

      collisionHandlerRef.current = (event) => {
        if (!isAudioActiveRef.current || isPausedRef.current || currentNormalizedVolRef.current <= 0.1) {
          return;
        }
        event.pairs.forEach((pair) => {
          const ballA = ballsRef.current.find((ball) => ball.body === pair.bodyA);
          const ballB = ballsRef.current.find((ball) => ball.body === pair.bodyB);
          if (ballA) applyCollisionForce(ballA);
          if (ballB) applyCollisionForce(ballB);
        });
      };
      Events.on(engineRef.current, 'collisionStart', collisionHandlerRef.current);

      animationFrameRef.current = requestAnimationFrame(renderLoop);

      resizeObserverRef.current = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserverRef.current.observe(document.documentElement);
    };

    bootstrap();

    return () => {
      disposed = true;
      disposedRef.current = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mouseConstraintRef.current && engineRef.current) {
        Composite.remove(engineRef.current.world, mouseConstraintRef.current);
      }
      if (pausedMouseDownHandlerRef.current && canvasRef.current) {
        canvasRef.current.removeEventListener('mousedown', pausedMouseDownHandlerRef.current);
      }
      if (collisionHandlerRef.current && engineRef.current) {
        Events.off(engineRef.current, 'collisionStart', collisionHandlerRef.current);
      }
      if (runnerRef.current) {
        Runner.stop(runnerRef.current);
        runnerRef.current = null;
      }
      if (engineRef.current) {
        Engine.clear(engineRef.current);
        engineRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      audioContextRef.current?.close?.();
      audioContextRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
      isAudioActiveRef.current = false;
      currentNormalizedVolRef.current = 0;
    };
  }, [addMouseControl, applyCollisionForce, createBalls, createWalls, enabled, handleResize, renderLoop, resize, updateBallCountDisplay]);

  const actions = useMemo(
    () => ({
      startAudio,
      togglePause,
      refreshBalls,
      toggleFullscreen,
      onSensitivityChange,
      onBallCountChange,
      playAudio,
      openDetail: () => setDetailVisible(true),
      closeDetail: () => setDetailVisible(false),
      clearInfo: () => {
        setSelectedBall(null);
        setDetailVisible(false);
      },
    }),
    [onBallCountChange, onSensitivityChange, playAudio, refreshBalls, startAudio, toggleFullscreen, togglePause],
  );

  return {
    canvasRef,
    state: {
      isAudioActive,
      isPaused,
      overlayVisible,
      volumePercent,
      sensitivity,
      ballCountPercent,
      ballCountDisplay,
      selectedBall,
      detailVisible,
      fullscreenText,
    },
    actions,
  };
}
