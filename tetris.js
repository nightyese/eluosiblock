// 游戏常量
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 32;
const COLORS = [
    null,
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#FFE138',
    '#3877FF'
];

// 方块形状
const PIECES = [
    [],
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]] // Z
];

// 获取画布和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏状态
let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let piece = null;
let dropCounter = 0;
let lastTime = 0;

// 玩家状态
const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0
};

// 添加新的游戏状态变量
let gameStarted = false;
let gamePaused = false;
let gameOver = false;
let nextPiece = null;

// 获取新的画布和元素
const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');

// 显示开始界面
startScreen.style.display = 'flex';

// 添加按钮事件监听器
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('resume-button').addEventListener('click', resumeGame);
document.getElementById('restart-button').addEventListener('click', startGame);

// 添加新按钮的事件监听器
document.getElementById('start-game-btn').addEventListener('click', startTimerMode);
document.getElementById('restart-game-btn').addEventListener('click', startGame);

// 在游戏初始化部分添加
const speedLevels = {
    slow: 1200,    // 慢速: 1.2秒/格
    normal: 600,   // 正常: 0.6秒/格
    fast: 200      // 快速: 0.2秒/格
};

// 初始化时设置正常速度
let currentSpeed = speedLevels.normal;
let dropInterval = speedLevels.normal;

// 添加难度按钮事件监听
document.getElementById('slow-speed').addEventListener('click', () => {
    setGameSpeed('slow');
});

document.getElementById('normal-speed').addEventListener('click', () => {
    setGameSpeed('normal');
});

document.getElementById('fast-speed').addEventListener('click', () => {
    setGameSpeed('fast');
});

function setGameSpeed(speed) {
    currentSpeed = speedLevels[speed];
    dropInterval = currentSpeed;
    
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${speed}-speed`).classList.add('active');
}

// 创建新方块
function createPiece(type) {
    return PIECES[type];
}

// 绘制方块
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(
                    (x + offset.x) * BLOCK_SIZE,
                    (y + offset.y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                ctx.strokeStyle = 'black';
                ctx.strokeRect(
                    (x + offset.x) * BLOCK_SIZE,
                    (y + offset.y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        });
    });
}

// 绘制游戏界面
function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawMatrix(board, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
}

// 合并方块到游戏板
function merge() {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

// 碰撞检测
function collide() {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (board[y + o.y] &&
                board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// 旋转方块
function rotate(matrix) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }
    matrix.reverse();
}

// 玩家移动
function playerMove(dir) {
    player.pos.x += dir;
    if (collide()) {
        player.pos.x -= dir;
    }
}

// 玩家下落
function playerDrop() {
    player.pos.y++;
    if (collide()) {
        player.pos.y--;
        merge();
        playerReset();
        sweepRows();
    }
    dropCounter = 0;
}

// 玩家旋转
function playerRotate() {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix);
    while (collide()) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix);
            player.pos.x = pos;
            return;
        }
    }
}

// 重置玩家
function playerReset() {
    const pieces = 'IJLOSTZ';
    if (!nextPiece) {
        nextPiece = createPiece(pieces.indexOf(pieces[Math.floor(Math.random() * pieces.length)]) + 1);
    }
    player.matrix = nextPiece;
    nextPiece = createPiece(pieces.indexOf(pieces[Math.floor(Math.random() * pieces.length)]) + 1);
    player.pos.y = 0;
    player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);
    
    if (collide()) {
        endGame();
    }
    
    drawNextPiece();
}

// 绘制下一个方块
function drawNextPiece() {
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const offset = {
        x: Math.floor((nextCanvas.width / BLOCK_SIZE - nextPiece[0].length) / 2),
        y: Math.floor((nextCanvas.height / BLOCK_SIZE - nextPiece.length) / 2)
    };
    
    nextPiece.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                nextCtx.fillStyle = COLORS[value];
                nextCtx.fillRect(
                    (x + offset.x) * BLOCK_SIZE,
                    (y + offset.y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                nextCtx.strokeStyle = 'black';
                nextCtx.strokeRect(
                    (x + offset.x) * BLOCK_SIZE,
                    (y + offset.y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        });
    });
}

// 消除行
function sweepRows() {
    outer: for (let y = board.length - 1; y > 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        player.score += 10;
        scoreElement.textContent = player.score;
    }
}

// 更新游戏
function update(time = 0) {
    if (!gameStarted || gamePaused || gameOver) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    requestAnimationFrame(update);
}

// 修改键盘控制
document.addEventListener('keydown', event => {
    if (!gameStarted) return;
    
    switch (event.keyCode) {
        case 37: // 左箭头
            playerMove(-1);
            break;
        case 39: // 右箭头
            playerMove(1);
            break;
        case 40: // 下箭头
            playerDrop();
            break;
        case 38: // 上箭头
            playerRotate();
            break;
        case 32: // 空格键
            pauseGame();
            break;
    }
});

// 添加计时模式相关变量
let isTimerMode = false;
let timeLeft = 600; // 10分钟 = 600秒
let timerInterval = null;

// 添加计时模式相关函数
function startTimerMode() {
    isTimerMode = true;
    timeLeft = 600;
    document.getElementById('timer').style.display = 'block';
    updateTimerDisplay();
    
    // 开始游戏
    startGame();
    
    // 开始倒计时
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            // 时间到，结束游戏
            clearInterval(timerInterval);
            endGame();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('countdown').textContent = display;
}

// 游戏控制函数
function startGame() {
    gameStarted = true;
    gamePaused = false;
    gameOver = false;
    player.score = 0;
    scoreElement.textContent = player.score;
    board.forEach(row => row.fill(0));
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    dropInterval = currentSpeed;
    playerReset();
    lastTime = 0;
    dropCounter = 0;
    
    // 如果不是计时模式，确保计时器隐藏
    if (!isTimerMode) {
        document.getElementById('timer').style.display = 'none';
    }
    
    update();
}

// 修改 pauseGame 函数，添加防抖
let lastPauseTime = 0;
function pauseGame() {
    const now = Date.now();
    if (now - lastPauseTime < 200) return; // 防止快速连续按空格
    lastPauseTime = now;
    
    if (!gameStarted || gameOver) return;
    gamePaused = !gamePaused;
    pauseScreen.style.display = gamePaused ? 'flex' : 'none';
    
    // 在计时模式下，暂停/继续计时器
    if (isTimerMode) {
        if (gamePaused) {
            clearInterval(timerInterval);
        } else {
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    endGame();
                }
            }, 1000);
        }
    }
    
    if (!gamePaused) {
        update();
    }
}

function resumeGame() {
    if (gamePaused) {
        pauseGame();
    }
}

// 在文件开头添加排行榜相关变量
let highScores = JSON.parse(localStorage.getItem('tetrisHighScores')) || [];
const MAX_HIGH_SCORES = 3;

// 修改更新排行榜的函数
function updateHighScores(score) {
    // 检查是否能进入前三名
    const canEnterLeaderboard = isTopThreeScore(score);
    const playerNameInput = document.getElementById('player-name');
    const saveScoreBtn = document.getElementById('save-score');
    const restartButton = document.getElementById('restart-button');
    
    if (canEnterLeaderboard) {
        // 如果可以进入前三名，显示输入框和保存按钮
        playerNameInput.parentElement.style.display = 'block';
        restartButton.style.display = 'none';
        saveScoreBtn.style.display = 'block';
        
        // 监听保存按钮点击事件
        saveScoreBtn.onclick = () => {
            const playerName = playerNameInput.value.trim() || '匿名玩家';
            
            // 添加新分数
            highScores.push({
                name: playerName,
                score: score,
                date: new Date().toLocaleDateString()
            });
            
            // 按分数排序
            highScores.sort((a, b) => b.score - a.score);
            
            // 只保留前3名
            highScores = highScores.slice(0, MAX_HIGH_SCORES);
            
            // 保存到本地存储
            localStorage.setItem('tetrisHighScores', JSON.stringify(highScores));
            
            // 更新显示
            displayHighScores();
            
            // 显示重新开始按钮，隐藏输入相关元素
            restartButton.style.display = 'block';
            saveScoreBtn.style.display = 'none';
            playerNameInput.parentElement.style.display = 'none';
            
            // 清空输入框
            playerNameInput.value = '';
        };
    } else {
        // 如果不能进入前三名，直接显示重新开始按钮
        playerNameInput.parentElement.style.display = 'none';
        saveScoreBtn.style.display = 'none';
        restartButton.style.display = 'block';
    }
}

// 添加判断是否能进入前三名的函数
function isTopThreeScore(score) {
    if (highScores.length < MAX_HIGH_SCORES) {
        return true;  // 如果记录不足3个，直接可以进入
    }
    
    // 获取当前最低分
    const lowestScore = highScores[highScores.length - 1].score;
    
    // 如果当前分数高于最低分，可以进入排行榜
    return score > lowestScore;
}

// 修改显示排行榜的函数
function displayHighScores() {
    const scoreList = document.querySelector('.score-list');
    scoreList.innerHTML = '';
    
    highScores.forEach((score, index) => {
        const li = document.createElement('li');
        li.className = 'score-item';
        li.innerHTML = `
            <span>第${index + 1}名: ${score.name} - ${score.score}分</span>
            <span>${score.date}</span>
        `;
        scoreList.appendChild(li);
    });
}

// 修改 endGame 函数
function endGame() {
    gameOver = true;
    gameStarted = false;
    finalScoreElement.textContent = player.score;
    gameOverScreen.style.display = 'flex';
    
    // 如果是计时模式，清除计时器
    if (isTimerMode) {
        clearInterval(timerInterval);
        isTimerMode = false;
        document.getElementById('timer').style.display = 'none';
    }
    
    // 更新排行榜
    updateHighScores(player.score);
}

// 在游戏初始化时添加保存按钮的样式
document.addEventListener('DOMContentLoaded', () => {
    const saveScoreBtn = document.getElementById('save-score');
    saveScoreBtn.style.display = 'none';
    displayHighScores();
});

// 不要自动开始游戏，等待玩家点击开始按钮

// 修改 HTML 中的默认激活按钮
document.addEventListener('DOMContentLoaded', () => {
    // 移除慢速按钮的 active 类
    document.getElementById('slow-speed').classList.remove('active');
    // 为正常速度按钮添加 active 类
    document.getElementById('normal-speed').classList.add('active');
}); 