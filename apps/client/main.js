        // Matter.js 模块别名
        const Engine = Matter.Engine,
              Render = Matter.Render,
              Runner = Matter.Runner,
              Bodies = Matter.Bodies,
              Composite = Matter.Composite,
              Events = Matter.Events,
              Mouse = Matter.Mouse,
              MouseConstraint = Matter.MouseConstraint,
              Body = Matter.Body,
              Vector = Matter.Vector;

        // 三年级生字数据
        // 数据将从 API 加载
        let VOCABULARY = [];


        // DOM 元素
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const modalStartBtn = document.getElementById('modal-start-btn');
        const overlay = document.getElementById('overlay');
        const volumeBar = document.getElementById('volume-bar');
        const sensitivityInput = document.getElementById('sensitivity');
        const ballCountSlider = document.getElementById('ball-count-percent');
        const ballCountDisplay = document.getElementById('ball-count-display');
        
        // 放大详情模态框相关
        const detailModal = document.getElementById('detail-modal');
        const modalPinyin = document.getElementById('modal-pinyin');
        const modalChar = document.getElementById('modal-char');
        const modalExamples = document.getElementById('modal-examples');
        const modalStroke = document.getElementById('modal-stroke');
        const modalAudioBtn = document.getElementById('modal-audio-btn');
        const closeDetailBtn = document.querySelector('.close-detail-btn');
        let currentDetailBall = null; // 存储当前展示的球体信息

        // 全局变量
        let engine, runner;
        let width, height;
        let balls = []; // 存储所有球体及其关联数据
        let walls = [];
        let mouseConstraint;
        let isPaused = false;
        let currentNormalizedVol = 0; // 全局存储当前音量，供碰撞事件使用
        
        // 音频相关
        let audioContext, analyser, microphone, dataArray;
        let isAudioActive = false;
        
        // 配置参数
        const BALL_RADIUS = 30;
        const FLOOR_OFFSET = 50; // 增加底部高度以容纳操作栏

        function init() {
            // 初始化物理引擎
            engine = Engine.create();
            engine.world.gravity.y = 1; // 增加重力感，让它们下落更快
            
            // 调整尺寸
            resize();
            
            // 创建球体和墙壁
            createWalls();

            // 加载数据
            // 为了游戏，我们需要一次性获取所有数据（或者获取足够多），这里设置一个较大的 limit
            // 加载数据
            // 为了游戏，我们需要一次性获取所有数据（或者获取足够多），这里设置一个较大的 limit
            fetch('/api/characters?limit=1000')
                .then(res => res.json())
                .then(result => {
                    // API 现在返回 { data: [...], meta: {...} }
                    // 如果是旧接口可能直接返回数组，做个兼容
                    if (Array.isArray(result)) {
                        VOCABULARY = result;
                    } else if (result.data && Array.isArray(result.data)) {
                        VOCABULARY = result.data;
                    } else {
                        VOCABULARY = [];
                    }

                    if (VOCABULARY.length > 0) {
                        createBalls();
                    } else {
                        console.warn("No vocabulary data found.");
                    }
                })
                .catch(err => console.error("Error fetching vocabulary:", err));
            
            // 添加鼠标控制
            addMouseControl();
            
            // 开始运行物理模拟
            runner = Runner.create();
            Runner.run(runner, engine);
            
            // 开始自定义渲染循环
            requestAnimationFrame(renderLoop);
            
            // 监听窗口大小变化
            window.addEventListener('resize', handleResize);

            // 监听碰撞事件，只有在碰撞时才应用声音带来的加速
            Events.on(engine, 'collisionStart', function(event) {
                if (!isAudioActive || isPaused || currentNormalizedVol <= 0.1) return;

                const pairs = event.pairs;
                const sensitivity = parseFloat(sensitivityInput.value);

                // 遍历所有碰撞对
                for (let i = 0; i < pairs.length; i++) {
                    const pair = pairs[i];
                    const bodyA = pair.bodyA;
                    const bodyB = pair.bodyB;

                    // 检查是否是小球与墙壁/地板的碰撞，或者是小球之间的碰撞
                    // 我们只关心小球，所以只要其中一个是小球即可
                    // 但为了效果更明显，我们可以让小球撞到任何东西都获得加速
                    
                    // 查找对应的小球对象
                    const ballA = balls.find(b => b.body === bodyA);
                    const ballB = balls.find(b => b.body === bodyB);

                    if (ballA) applyCollisionForce(ballA, pair.collision.normal, sensitivity);
                    if (ballB) applyCollisionForce(ballB, pair.collision.normal, sensitivity);
                }
            });
        }

        function applyCollisionForce(ballObj, normal, sensitivity) {
             // 只有当音量超过该小球的阈值时才加速
             if (currentNormalizedVol <= ballObj.threshold) return;

             // 冷却时间检查（防止连续微小碰撞导致速度爆炸）
             const now = Date.now();
             const cooldown = 50; // 50ms 冷却
             if (now - ballObj.lastJump < cooldown) return;
             ballObj.lastJump = now;

             const body = ballObj.body;

             // 力的计算：基于当前音量和灵敏度
             // 碰撞增强：当球撞击物体时，利用声音能量增加反弹速度
             
             // 因子说明：
             // currentNormalizedVol: 0-3.0 (受灵敏度影响后的音量)
             // sensitivity: 0.5-5.0
             
             // 计算额外的弹力系数
             // 我们希望声音越大，反弹越猛，就像 restitution > 1
             const restitutionBoost = (currentNormalizedVol - ballObj.threshold) * 0.5 * Math.sqrt(sensitivity);
             
             if (restitutionBoost > 0) {
                 // 直接修改速度，模拟超级弹性
                 // 将当前速度反向放大
                 // 注意：这里我们不需要手动计算法线方向，因为物理引擎已经处理了碰撞反弹
                 // 我们只需要在引擎处理完之后（或之前）增加能量
                 // 但由于这是 collisionStart，引擎尚未完全解决碰撞，我们施加一个冲量是合适的
                 
                 // 简单粗暴的方法：给一个向上的推力（如果是在下面），或者沿着当前运动方向加速？
                 // 不，最自然的是沿着法线方向弹开。但 normal 是从 bodyA 指向 bodyB 的。
                 // 这比较复杂。
                 
                 // 简化方案：只增加向上的分量和随机水平分量，模拟"震动"带来的不稳定反弹
                 const boostForce = Math.min(restitutionBoost * 0.05, 0.5) * body.mass;
                 
                 Body.applyForce(body, body.position, {
                     x: (Math.random() - 0.5) * boostForce * 10, // 随机散射
                     y: -boostForce * 15 // 强力向上
                 });
             }
        }

        function handleResize() {
            resize();
            // 重建墙壁以适应新尺寸
            Composite.remove(engine.world, walls);
            createWalls();
            // 确保球体在可见区域内，但不使用“中间重置”
            balls.forEach(ballObj => {
                const body = ballObj.body;
                let newX = body.position.x;
                let newY = body.position.y;
                
                if (newX < BALL_RADIUS) newX = BALL_RADIUS;
                if (newX > width - BALL_RADIUS) newX = width - BALL_RADIUS;
                if (newY < BALL_RADIUS) newY = BALL_RADIUS;
                if (newY > height - FLOOR_OFFSET - BALL_RADIUS) newY = height - FLOOR_OFFSET - BALL_RADIUS;
                
                if (newX !== body.position.x || newY !== body.position.y) {
                    Body.setPosition(body, { x: newX, y: newY });
                }
            });
        }

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }

        function createWalls() {
            walls = [];
            const wallOptions = { isStatic: true, render: { visible: false } };
            const groundY = height - FLOOR_OFFSET / 2; // 地面中心位置
            
            // 地面
            walls.push(Bodies.rectangle(width / 2, height + 50, width * 2, 100 + FLOOR_OFFSET * 2, wallOptions)); // 稍微下移一点，留出视觉空间
            // 左墙
            walls.push(Bodies.rectangle(-50, height / 2, 100, height * 2, wallOptions));
            // 右墙
            walls.push(Bodies.rectangle(width + 50, height / 2, 100, height * 2, wallOptions));
            // 天花板 (防止飞太高)
            walls.push(Bodies.rectangle(width / 2, -2000, width * 2, 100, wallOptions)); // 很高很高的地方，基本碰不到，防止溢出

            Composite.add(engine.world, walls);
        }

        function createBalls() {
            // 清除旧球
            if (balls.length > 0) {
                const bodies = balls.map(b => b.body);
                Composite.remove(engine.world, bodies);
            }
            balls = [];

            // 获取总词汇量
            const totalVocab = VOCABULARY.length;
            
            // 获取用户设置的百分比
            const percent = parseInt(ballCountSlider.value);
            
            // 计算实际数量
            const count = Math.max(1, Math.floor(totalVocab * (percent / 100)));
            
            // 更新UI显示
            ballCountDisplay.textContent = `${percent}% (${count}个)`;

            // 随机打乱并截取指定数量
            const shuffledVocab = [...VOCABULARY]
                .sort(() => Math.random() - 0.5)
                .slice(0, count);
            
            shuffledVocab.forEach((item, index) => {
                const x = Math.random() * (width - BALL_RADIUS * 2) + BALL_RADIUS;
                const y = Math.random() * (height / 2) - 200; // 从上方掉落
                
                const body = Bodies.circle(x, y, BALL_RADIUS, {
                    restitution: 0.95, // 提高弹性系数，减少能量损失 (0-1)
                    friction: 0.002,  // 降低摩擦力
                    frictionStatic: 0, // 禁用静摩擦力，防止"粘"在地上
                    frictionAir: 0.005, // 保持适当的空气阻力，防止水平漂移
                    density: 0.04,    // 密度
                    angle: Math.random() * Math.PI * 2,
                    slop: 0.05 // 允许微小的穿透，有助于稳定堆叠
                });

                // 随机颜色
                const color = `hsl(${Math.random() * 360}, 85%, 65%)`;
                
                // 激活阈值：根据索引分布，让有些字容易跳，有些难跳
                const threshold = 0.05 + (index / shuffledVocab.length) * 0.4; // 0.05 - 0.45

                balls.push({
                    body: body,
                    char: item.char,
                    pinyin: item.pinyin,
                    examples: item.examples || [], // 确保有 examples 字段
                    audio: item.audio, // 传递 audio 字段
                    stroke: item.stroke, // 传递 stroke 字段
                    color: color,
                    threshold: threshold,
                    lastJump: 0 // 初始化跳动时间
                });
            });

            const bodies = balls.map(b => b.body);
            Composite.add(engine.world, bodies);
        }

        function addMouseControl() {
            const mouse = Mouse.create(canvas);
            mouseConstraint = MouseConstraint.create(engine, {
                mouse: mouse,
                constraint: {
                    stiffness: 0.2,
                    render: { visible: false }
                }
            });
            Composite.add(engine.world, mouseConstraint);
            
            // 防止鼠标滚轮缩放页面
            mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
            mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

            // 添加点击事件监听，用于显示详情
            Events.on(mouseConstraint, 'mousedown', function(event) {
                const mousePosition = event.mouse.position;
                // 查找点击位置的所有物体
                const bodies = balls.map(b => b.body);
                const clickedBodies = Matter.Query.point(bodies, mousePosition);
                
                if (clickedBodies.length > 0) {
                    // 找到对应的球体对象
                    const body = clickedBodies[0];
                    const ballObj = balls.find(b => b.body === body);
                    
                    if (ballObj) {
                        showInfo(ballObj);
                    }
                } else {
                    // 点击空白处隐藏面板
                    document.getElementById('info-panel').classList.remove('visible');
                }
            });

            // 添加原生点击事件监听，用于暂停时处理点击
            canvas.addEventListener('mousedown', function(e) {
                // 只有在暂停时才处理
                if (!isPaused) return;

                // 使用 Matter.Mouse 实例获取的当前鼠标位置（它会自动处理坐标转换）
                const mousePosition = mouse.position;
                
                // 查找点击位置的所有物体
                const bodies = balls.map(b => b.body);
                const clickedBodies = Matter.Query.point(bodies, mousePosition);
                
                if (clickedBodies.length > 0) {
                    // 找到对应的球体对象
                    const body = clickedBodies[0];
                    const ballObj = balls.find(b => b.body === body);
                    
                    if (ballObj) {
                        showInfo(ballObj);
                    }
                } else {
                    // 点击空白处隐藏面板
                    document.getElementById('info-panel').classList.remove('visible');
                }
            });
        }

        // 显示详情面板函数
        function showInfo(ball) {
            const panel = document.getElementById('info-panel');
            const charEl = document.getElementById('info-char');
            const pinyinEl = document.getElementById('info-pinyin');
            const strokeEl = document.getElementById('stroke-gif');
            const examplesEl = document.getElementById('info-examples');
            const playBtn = document.getElementById('play-audio-btn');

            charEl.textContent = ball.char;
            pinyinEl.textContent = ball.pinyin;
            
            // 笔画 GIF 逻辑
            if (ball.stroke) {
                strokeEl.src = ball.stroke;
                strokeEl.style.display = 'block';
            } else {
                strokeEl.style.display = 'none';
                strokeEl.src = '';
            }

            // 音频按钮逻辑
            if (ball.audio) {
                playBtn.style.display = 'flex';
                playBtn.onclick = () => {
                    const audio = new Audio(ball.audio);
                    audio.play().catch(e => console.error("Play failed", e));
                };
            } else {
                playBtn.style.display = 'none';
                playBtn.onclick = null;
            }
            
            examplesEl.innerHTML = '';
            if (ball.examples && ball.examples.length > 0) {
                ball.examples.forEach(ex => {
                    const tag = document.createElement('span');
                    tag.className = 'example-tag';
                    tag.textContent = ex;
                    examplesEl.appendChild(tag);
                });
            } else {
                // 如果没有组词，显示提示
                const tag = document.createElement('span');
                tag.style.color = '#999';
                tag.style.fontSize = '0.9rem';
                tag.textContent = '暂无组词';
                examplesEl.appendChild(tag);
            }

            // 显示面板
            panel.classList.add('visible');
            
            // 存储当前球体信息，供放大详情使用
            currentDetailBall = ball;
        }

        // 显示放大详情模态框
        function showDetailModal() {
            if (!currentDetailBall) return;
            
            modalChar.textContent = currentDetailBall.char;
            modalPinyin.textContent = currentDetailBall.pinyin;
            
            // 笔画 GIF
            if (currentDetailBall.stroke) {
                modalStroke.src = currentDetailBall.stroke;
                modalStroke.style.display = 'block';
            } else {
                modalStroke.style.display = 'none';
            }
            
            // 组词
            modalExamples.innerHTML = '';
            if (currentDetailBall.examples && currentDetailBall.examples.length > 0) {
                currentDetailBall.examples.forEach(ex => {
                    const tag = document.createElement('span');
                    tag.className = 'detail-example-tag';
                    tag.textContent = ex;
                    modalExamples.appendChild(tag);
                });
            } else {
                const tag = document.createElement('span');
                tag.className = 'detail-example-tag';
                tag.style.background = '#f5f5f5';
                tag.style.color = '#999';
                tag.textContent = '暂无组词';
                modalExamples.appendChild(tag);
            }
            
            // 音频按钮
            if (currentDetailBall.audio) {
                modalAudioBtn.style.display = 'flex';
                modalAudioBtn.onclick = (e) => {
                    e.stopPropagation(); // 防止冒泡
                    const audio = new Audio(currentDetailBall.audio);
                    audio.play().catch(e => console.error("Play failed", e));
                };
            } else {
                modalAudioBtn.style.display = 'none';
            }
            
            detailModal.classList.add('visible');
        }

        // 关闭详情模态框
        function closeDetailModal() {
            detailModal.classList.remove('visible');
        }

        async function startAudio() {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                microphone = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 512; // 更高的精度
                microphone.connect(analyser);
                dataArray = new Uint8Array(analyser.frequencyBinCount);
                isAudioActive = true;
                
                startBtn.textContent = "麦克风监听中...";
                startBtn.disabled = true;
                pauseBtn.disabled = false;
                overlay.classList.add('hidden');
                
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
            } catch (err) {
                console.error('Error accessing microphone:', err);
                alert('无法访问麦克风，请检查权限。');
            }
        }

        function getAudioData() {
            if (!isAudioActive) return { volume: 0, raw: [] };
            analyser.getByteFrequencyData(dataArray);
            
            // 计算平均音量
            let sum = 0;
            // 只取低频部分，因为人声和敲击声主要在低频，这样反应更灵敏
            const relevantFreqCount = Math.floor(dataArray.length * 0.5); 
            for (let i = 0; i < relevantFreqCount; i++) {
                sum += dataArray[i];
            }
            const average = sum / relevantFreqCount;
            
            return { volume: average, raw: dataArray }; // 0-255
        }

        function togglePause() {
            isPaused = !isPaused;
            
            if (isPaused) {
                // 暂停：停止物理引擎
                Runner.stop(runner);
                pauseBtn.textContent = "继续";
                pauseBtn.style.background = "linear-gradient(45deg, #4caf50, #81c784)";
                pauseBtn.style.boxShadow = "0 4px 0 #388e3c";
            } else {
                // 继续：恢复物理引擎
                Runner.run(runner, engine);
                pauseBtn.textContent = "暂停";
                pauseBtn.style.background = ""; // 恢复默认样式（CSS中未定义特定ID样式，所以会回退到button默认或需要重置）
                // 由于button有默认样式，我们直接重置为默认的橙色系
                pauseBtn.style.background = "linear-gradient(45deg, #ff6f00, #ffca28)";
                pauseBtn.style.boxShadow = "0 4px 0 #e65100";
            }
        }

        function renderLoop() {
            // 1. 获取音量并应用物理力
            const audioData = getAudioData();
            const volume = audioData.volume;
            let normalizedVol = 0;
            
            // 更新音量条
            if (isAudioActive) {
                // 核心逻辑：音量乘以灵敏度，放大或缩小信号
                // 允许更高的峰值，让大声时更震撼
                const sensitivity = parseFloat(sensitivityInput.value);
                normalizedVol = Math.min((volume / 255) * sensitivity, 3.0); 
                
                // 将计算后的音量更新到全局变量，供碰撞事件使用
                currentNormalizedVol = normalizedVol;

                // 更新音量条显示，让其也反映灵敏度
                const volPercent = Math.min(normalizedVol * 100, 100); 
                volumeBar.style.width = `${volPercent}%`;
                
                // 如果已暂停，不应用物理力
                if (!isPaused) {
                    // 恢复“地面震动”逻辑：解决小球静止不动的问题
                    // 模拟鼓面效应：只有在底部（接触地面）或接近地面的小球才会被声音震起来
                    if (normalizedVol > 0.1) {
                        balls.forEach(ballObj => {
                            const body = ballObj.body;
                            
                            // 检查是否在底部区域（例如距离底部 150px 以内）
                            // 并且速度较慢（说明没在飞），或者声音特别大
                            const isNearBottom = body.position.y > height - FLOOR_OFFSET - 150;
                            
                            // 1. 微弱扰动：即使声音很小，也给地上的球一点点"生气"，防止完全静止（解决粘地）
                            if (isNearBottom && Math.abs(body.velocity.y) < 0.2) {
                                Body.applyForce(body, body.position, {
                                    x: (Math.random() - 0.5) * 0.0005 * body.mass,
                                    y: -0.0005 * body.mass // 极微小的向上力，抵抗重力压迫
                                });
                            }

                            // 2. 强力震动：当声音超过阈值时触发
                            if (isNearBottom && normalizedVol > ballObj.threshold) {
                                // 冷却时间检查
                                const now = Date.now();
                                // 声音越大，冷却时间越短
                                const cooldown = 1000 / (1 + normalizedVol * 10);
                                
                                if (now - ballObj.lastJump > cooldown) {
                                    ballObj.lastJump = now;
                                    
                                    // 震动力度：基于音量和灵敏度
                                    // 相比之前的空中施力，这里的力度可以更大一点，因为是在克服重力启动
                                    const shakeForce = (normalizedVol - ballObj.threshold) * 0.1 * body.mass * Math.sqrt(sensitivity);
                                    
                                    // 施加向上的冲量，带一点随机水平分量
                                    Body.applyForce(body, body.position, {
                                        x: (Math.random() - 0.5) * shakeForce * 5, 
                                        y: -shakeForce * 8 // 强力向上
                                    });
                                }
                            }
                        });
                    }
                }
            }

            // 2. 绘图
            ctx.clearRect(0, 0, width, height);

            // 绘制地板装饰 (绿色区域)
            // 地板高度由 FLOOR_OFFSET 决定
            const floorY = height - FLOOR_OFFSET;
            
            // 确保球体绘制在地板之前，这样它们掉进去看起来像是在后面
            // 但物理边界在 floorY，所以球体实际上是停在 floorY 上方的
            
            // 绘制所有球体
            balls.forEach(ballObj => {
                const body = ballObj.body;
                const { x, y } = body.position;
                // const angle = body.angle; // 不再需要旋转角度，保持文字直立
                
                ctx.save();
                ctx.translate(x, y);
                // ctx.rotate(angle); // 移除旋转，让文字始终朝上
                
                // 绘制圆形背景
                ctx.beginPath();
                ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = 'white';
                ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = ballObj.color;
                ctx.stroke();
                
                // 添加高光效果 (更有立体感) - 移到文字下方，避免遮挡文字
                ctx.beginPath();
                ctx.arc(-BALL_RADIUS * 0.3, -BALL_RADIUS * 0.3, BALL_RADIUS * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fill();
                
                // 绘制拼音
                ctx.fillStyle = '#666';
                ctx.font = '16px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ballObj.pinyin, 0, -16);

                // 绘制汉字
                ctx.fillStyle = '#333';
                ctx.font = 'bold 28px "KaiTi", "STKaiti", "BiauKai", "楷体", "楷体_GB2312", serif';
                ctx.textBaseline = 'middle';
                ctx.fillText(ballObj.char, 0, 10);

                ctx.restore();
            });

            // 最后绘制地板，确保遮挡住可能溢出的球体（虽然物理限制了，但视觉上更好）
            // 绿色区域作为底部装饰，容纳操作栏
            ctx.fillStyle = '#81c784';
            ctx.fillRect(0, floorY, width, FLOOR_OFFSET);
            
            ctx.strokeStyle = '#4caf50';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, floorY);
            ctx.lineTo(width, floorY);
            ctx.stroke();

            if (isPaused) {
                 // 绘制暂停遮罩文字 - 移除遮罩层，保留文字提示但改到角落或者直接不显示（根据需求"去除暂停的蒙版层"）
                 // 用户要求去除蒙版层，为了不遮挡视线，这里我们完全不绘制半透明背景
                 // 同时也不绘制中间的大字“已暂停”，因为按钮已经变绿显示“继续”
            } else {
                // 只有在未暂停时才进行边界检查（瞬移逻辑）
                // 实时边界检查：防止球飞出屏幕不回来
                balls.forEach(ballObj => {
                    const body = ballObj.body;
                    
                    // 1. 天花板软约束：防止飞得太高
                    if (body.position.y < -100) { // 放宽天花板高度，允许冲出屏幕一点点
                        const depth = -100 - body.position.y;
                        // 这是一个柔和的弹簧力，不要和音量挂钩，只和距离有关
                        const pushDownForce = 0.0005 * depth * body.mass; 
                        Body.applyForce(body, body.position, { x: 0, y: pushDownForce });
                        // 不再大幅增加 frictionAir，避免突然"刹车"感
                        body.frictionAir = 0.02; // 稍微增加一点阻力
                    } else {
                        // 恢复默认空气阻力
                        body.frictionAir = 0.005;
                    }

                    // 速度限制：防止因为连续施力导致速度失控
                    const maxSpeed = 30; // 限制最大速度
                    if (body.speed > maxSpeed) {
                        Body.setSpeed(body, maxSpeed);
                    }

                    // 2. 左右墙壁软约束：防止穿墙
                    if (body.position.x < BALL_RADIUS) {
                        Body.setPosition(body, { x: BALL_RADIUS, y: body.position.y });
                        Body.setVelocity(body, { x: Math.abs(body.velocity.x) * 0.5, y: body.velocity.y });
                    } else if (body.position.x > width - BALL_RADIUS) {
                        Body.setPosition(body, { x: width - BALL_RADIUS, y: body.position.y });
                        Body.setVelocity(body, { x: -Math.abs(body.velocity.x) * 0.5, y: body.velocity.y });
                    }

                    // 3. 地板硬约束：防止掉出世界
                    if (body.position.y > height + 100) {
                        Body.setPosition(body, { x: body.position.x, y: height - FLOOR_OFFSET - BALL_RADIUS * 2 });
                        Body.setVelocity(body, { x: 0, y: 0 });
                    }
                });
            }
            
            // 绘制鼠标拖拽线 (可选)
            if (mouseConstraint && mouseConstraint.body) {
                const pos = mouseConstraint.body.position;
                const mousePos = mouseConstraint.mouse.position;
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(mousePos.x, mousePos.y);
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            requestAnimationFrame(renderLoop);
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch((e) => {
                    console.error(`Error attempting to enable fullscreen: ${e.message} (${e.name})`);
                });
                fullscreenBtn.textContent = "退出全屏";
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                    fullscreenBtn.textContent = "全屏";
                }
            }
        }

        // 事件监听
        const infoPanel = document.getElementById('info-panel');
        infoPanel.addEventListener('click', showDetailModal); // 点击侧边面板显示大图

        // 详情模态框关闭事件
        closeDetailBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeDetailModal();
        });
        
        // 点击模态框背景关闭
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                closeDetailModal();
            }
        });

        startBtn.addEventListener('click', startAudio);
        pauseBtn.addEventListener('click', togglePause);
        refreshBtn.addEventListener('click', createBalls); // 点击“换一批”按钮重新生成
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        modalStartBtn.addEventListener('click', startAudio);
        ballCountSlider.addEventListener('input', () => {
             // 实时更新显示，但不重新生成球（防卡顿）
             const totalVocab = VOCABULARY.length;
             const percent = parseInt(ballCountSlider.value);
             const count = Math.max(1, Math.floor(totalVocab * (percent / 100)));
             ballCountDisplay.textContent = `${percent}% (${count}个)`;
        });
        ballCountSlider.addEventListener('change', createBalls); // 松开鼠标后重新生成

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                fullscreenBtn.textContent = "全屏";
            } else {
                fullscreenBtn.textContent = "退出全屏";
            }
        });

        // 启动
        init();
