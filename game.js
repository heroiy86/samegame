document.addEventListener('DOMContentLoaded', () => {
    // ゲーム設定 - 初期化時に一度だけ設定
    const isMobileDevice = () => {
        const userAgent = navigator.userAgent.toLowerCase();
        const isAndroid = userAgent.includes('android');
        const isIPhone = userAgent.includes('iphone');
        const isIPad = userAgent.includes('ipad');
        const isTablet = /(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(userAgent);
        const isSmallScreen = window.innerWidth <= 900;
        return (isAndroid || isIPhone || isIPad || isTablet) && isSmallScreen;
    };
    
    // 初期設定時に一度だけボードサイズを決定
    const INITIAL_IS_MOBILE = isMobileDevice();
    const BOARD_WIDTH = INITIAL_IS_MOBILE ? 8 : 10;
    const BOARD_HEIGHT = INITIAL_IS_MOBILE ? 12 : 15;
    
    // リサイズ時はレイアウトのみ調整する
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            adjustLayout();
        }, 200);
    });
    
    function adjustLayout() {
        // レイアウト調整のみ行い、ゲームのリセットは行わない
        const boardElement = document.getElementById('board');
        if (!boardElement) return;
        
        // 必要に応じてレイアウトを調整
        if (window.innerWidth < 600) {
            boardElement.style.maxWidth = '100%';
        } else {
            boardElement.style.maxWidth = '450px';
        }
    }
    const COLORS = [
        '#FF6B9E', // ピンク
        '#FFD166', // イエロー
        '#06D6A0', // グリーン
        '#118AB2', // ブルー
        '#A05CDF', // パープル
        '#FF9E7D'  // オレンジ
    ];
    
    // 効果音
    const sounds = {
        pop: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 'a'.repeat(1000)),
        success: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 'b'.repeat(1000))
    };
    
    // 効果音を再生する関数
    function playSound(sound) {
        if (sounds[sound]) {
            sounds[sound].currentTime = 0;
            sounds[sound].play().catch(e => console.log('音声再生エラー:', e));
        }
    }
    
    let board = [];
    let score = 0;
    let isGameOver = false;
    
    const boardElement = document.getElementById('board');
    const scoreElement = document.getElementById('score');
    const newGameButton = document.getElementById('new-game');
    
    // ゲームの初期化
    function initGame() {
        // ボードサイズは初期設定のまま変更しない
        board = [];
        score = 0;
        isGameOver = false;
        updateScore(0);
        
        // ボードの初期化（完全ランダム）
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            board[y] = [];
            for (let x = 0; x < BOARD_WIDTH; x++) {
                board[y][x] = {
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    x,
                    y,
                    element: null
                };
            }
        }
        
        // ゲームが遊べる状態かチェック（有効な手が全くない場合はやり直し）
        if (isGameFinished()) {
            console.log('ゲームが開始できません。再生成します。');
            initGame();
            return;
        }
        
        renderBoard();
        addCellEventListeners();
        
        // ゲーム開始アニメーション
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            cell.style.animation = `popIn 0.3s ease-out ${index * 0.01}s backwards`;
        });
        
        // アニメーション用のスタイルを追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes popIn {
                0% { transform: scale(0); opacity: 0; }
                80% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
            }
            @keyframes popOut {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(0); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // セル要素にイベントリスナーを追加
    function addCellEventListeners() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            // 既存のイベントリスナーを削除
            cell.removeEventListener('click', handleCellClick);
            cell.removeEventListener('mouseenter', handleMouseEnter);
            
            // クリック/タップイベント
            cell.addEventListener('click', handleCellClick);
            
            // マウスホバー時のハイライト
            cell.addEventListener('mouseenter', handleMouseEnter);
            cell.addEventListener('mouseleave', clearHighlights);
            
            // タッチイベント
            cell.addEventListener('touchstart', handleTouchStart, { passive: true });
            cell.addEventListener('touchend', handleTouchEnd, { passive: true });
            cell.addEventListener('touchmove', handleTouchMove, { passive: true });
        });
    }
    
    // ボードを描画
    function renderBoard() {
        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${BOARD_WIDTH}, 40px)`;
        
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cell = board[y][x];
                if (!cell) continue;
                
                const cellElement = document.createElement('div');
                cellElement.className = 'cell';
                cellElement.style.backgroundColor = cell.color;
                cellElement.dataset.x = x;
                cellElement.dataset.y = y;
                
                boardElement.appendChild(cellElement);
                cell.element = cellElement;
            }
        }
    }
    
    // セルがクリックされたときの処理
    async function handleCellClick(x, y) {
        if (isGameOver) return;
        
        const clickedCell = board[y][x];
        if (!clickedCell || !clickedCell.element) return;
        
        const connectedCells = findConnectedCells(x, y, clickedCell.color);
        
        // 2つ以上つながっている場合のみ削除
        if (connectedCells.length >= 2) {
            playSound('pop');
            
            // スコア計算: n*(n-1)点
            const points = connectedCells.length * (connectedCells.length - 1);
            updateScore(score + points);
            
            // ブロックを削除
            await animateCellRemoval(connectedCells);
            removeCells(connectedCells);
            
            // ブロックを下に落とす
            await applyGravity();
            
            // 空の列を左に詰める
            await shiftColumnsLeft();
            
            // ボードを再描画
            renderBoard();
            addCellEventListeners();
            
            // ゲームオーバーチェック
            if (isGameFinished()) {
                endGame();
            }
        } else if (connectedCells.length === 1) {
            // 1つしかつながっていない場合は軽いフィードバック
            const cell = connectedCells[0];
            if (cell && cell.element) {
                cell.element.style.animation = 'shake 0.5s';
                setTimeout(() => {
                    if (cell.element) {
                        cell.element.style.animation = '';
                    }
                }, 500);
            }
        }
    }
    
    // マウスがセルに乗ったときの処理
    function handleMouseEnter(e) {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        
        // セルが有効な場合にハイライト
        const clickedCell = board[y][x];
        if (clickedCell) {
            highlightConnectedCells(x, y);
        }
    }
    
    // セル削除のアニメーション
    function animateCellRemoval(cells) {
        return new Promise(resolve => {
            cells.forEach(cell => {
                if (cell && cell.element) {
                    cell.element.style.animation = 'popOut 0.3s forwards';
                }
            });
            setTimeout(resolve, 300);
        });
    }
    
    // セルが下に落ちるアニメーション
    function animateShiftDown() {
        return new Promise(resolve => {
            setTimeout(resolve, 200);
        });
    }
    
    // つながっているセルを探す（フラッドフィルアルゴリズム）
    function findConnectedCells(x, y, color, checked = new Set()) {
        const key = `${x},${y}`;
        if (
            x < 0 || x >= BOARD_WIDTH ||
            y < 0 || y >= BOARD_HEIGHT ||
            !board[y][x] ||
            board[y][x].color !== color ||
            checked.has(key)
        ) {
            return [];
        }
        
        checked.add(key);
        let result = [board[y][x]];
        
        // 4方向をチェック（上下左右のみ）
        const directions = [
            [0, 1],  // 下
            [1, 0],  // 右
            [0, -1], // 上
            [-1, 0]  // 左
        ];
        
        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            result = result.concat(findConnectedCells(newX, newY, color, checked));
        }
        
        return result;
    }
    
    // セルが選択可能かハイライト表示
    function highlightConnectedCells(x, y) {
        // 現在のハイライトをクリア
        clearHighlights();
        
        const cell = board[y][x];
        if (!cell) return;
        
        const connectedCells = findConnectedCells(x, y, cell.color);
        
        if (connectedCells.length >= 2) {
            connectedCells.forEach(cell => {
                if (cell && cell.element) {
                    cell.element.style.filter = 'brightness(1.2)';
                    cell.element.style.transform = 'scale(1.1)';
                    cell.element.style.transition = 'all 0.2s';
                }
            });
        }
    }
    
    // ハイライトをクリア
    function clearHighlights() {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x] && board[y][x].element) {
                    board[y][x].element.style.filter = '';
                    board[y][x].element.style.transform = '';
                }
            }
        }
    }
    
    // セルを削除
    function removeCells(cells) {
        cells.forEach(cell => {
            if (cell && board[cell.y][cell.x]) {
                board[cell.y][cell.x] = null;
            }
        });
    }
    
    // 重力を適用してブロックを下に落とす
    async function applyGravity() {
        let movement = false;
        
        // 下から上にスキャン
        for (let x = 0; x < BOARD_WIDTH; x++) {
            let emptyY = BOARD_HEIGHT - 1;
            
            for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
                if (board[y][x]) {
                    if (y !== emptyY) {
                        // ブロックを下に移動
                        board[emptyY][x] = board[y][x];
                        board[y][x] = null;
                        movement = true;
                    }
                    emptyY--;
                }
            }
        }
        
        // アニメーション用に少し待機
        if (movement) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    // 空の列を左に詰める
    async function shiftColumnsLeft() {
        let emptyCol = 0;
        let movement = false;
        
        for (let x = 0; x < BOARD_WIDTH; x++) {
            // 列が空かチェック
            let isEmpty = true;
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                if (board[y][x] !== null) {
                    isEmpty = false;
                    break;
                }
            }
            
            // 空でない列を左に詰める
            if (!isEmpty) {
                if (x !== emptyCol) {
                    // 列を移動
                    for (let y = 0; y < BOARD_HEIGHT; y++) {
                        board[y][emptyCol] = board[y][x];
                        board[y][x] = null;
                    }
                    movement = true;
                }
                emptyCol++;
            }
        }
        
        // アニメーション用に少し待機
        if (movement) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    // 列が空かどうかをチェック
    function isColumnEmpty(x) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            if (board[y][x]) {
                return false;
            }
        }
        return true;
    }
    
    // ボードが空かどうかをチェック
    function isBoardEmpty() {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x]) {
                    return false; // ブロックが残っている
                }
            }
        }
        return true; // ボードが空
    }

    // ゲームが終了したかチェック
    function isGameFinished() {
        // ボードが空ならクリア
        if (isBoardEmpty()) {
            console.log('クリア！おめでとうございます！🎉');
            return true;
        }
        
        // 有効な手が残っているかチェック
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x]) {
                    const connectedCells = findConnectedCells(x, y, board[y][x].color);
                    if (connectedCells.length >= 2) {
                        console.log(`有効な手があります: (${x},${y}) - ${connectedCells.length}個`);
                        return false; // 有効な手がある
                    }
                }
            }
        }
        console.log('ゲームオーバー：有効な手がありません');
        return true; // 有効な手がない
    }
    
    // スコアを更新
    function updateScore(newScore) {
        score = newScore;
        scoreElement.textContent = score;
    }
    
    // ゲーム終了処理
    function endGame() {
        isGameOver = true;
        const isPerfectClear = isBoardEmpty();
        playSound('success');
        
        // お祝いアニメーション
        const celebration = document.getElementById('celebration');
        celebration.style.display = 'block';
        
        // クリアメッセージを設定
        const message = document.createElement('div');
        message.className = 'celebration-message';
        if (isPerfectClear) {
            playSound('success');
            message.innerHTML = `
                <div class="celebration-content">
                    <h2>🎉 パーフェクトクリア！ 🎉</h2>
                    <p>すごい！全部のブロックを消しました！</p>
                    <p>スコア: <span class="score-highlight">${score}</span> 点</p>
                    <button id="play-again" class="rainbow-button">もう一度遊ぶ</button>
                </div>
            `;
            // スペシャルエフェクト
            for (let i = 0; i < 30; i++) {
                setTimeout(() => {
                    createFirework();
                    createConfetti();
                }, i * 150);
            }
        } else {
            message.innerHTML = `
                <div class="celebration-content">
                    <h2>ゲームオーバー</h2>
                    <p>スコア: <span class="score-highlight">${score}</span> 点</p>
                    <button id="play-again" class="rainbow-button">もう一度遊ぶ</button>
                </div>
            `;
            // 通常の花火エフェクト
            for (let i = 0; i < 20; i++) {
                setTimeout(() => {
                    createFirework();
                }, i * 200);
            }
        }
        
        celebration.innerHTML = '';
        celebration.appendChild(message);
        
        // もう一度遊ぶボタンのイベントリスナー
        document.getElementById('play-again').addEventListener('click', () => {
            celebration.style.display = 'none';
            initGame();
        });
    }
    
    // 紙吹雪エフェクトを追加
    function createConfetti() {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.animation = `confetti-fall ${2 + Math.random() * 3}s linear forwards`;
        document.body.appendChild(confetti);
        
        // アニメーション終了後に要素を削除
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
    
    // 花火エフェクトの作成
    function createFirework() {
        const colors = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'];
        const firework = document.createElement('div');
        firework.style.position = 'fixed';
        firework.style.width = '5px';
        firework.style.height = '5px';
        firework.style.borderRadius = '50%';
        firework.style.background = colors[Math.floor(Math.random() * colors.length)];
        firework.style.left = `${Math.random() * 100}%`;
        firework.style.top = `${Math.random() * 100}%`;
        firework.style.boxShadow = '0 0 10px 2px white';
        firework.style.transform = 'scale(0)';
        firework.style.transition = 'all 0.5s ease-out';
        
        document.body.appendChild(firework);
        
        // アニメーション開始
        setTimeout(() => {
            firework.style.transform = 'scale(15)';
            firework.style.opacity = '0';
        }, 10);
        
        // 要素を削除
        setTimeout(() => {
            firework.remove();
        }, 1000);
    }
    
    // タッチ開始時の処理
    function handleTouchStart(e) {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        touchTarget = cell;
        
        // タッチフィードバック
        cell.style.transform = 'scale(0.95)';
        
        // ハイライト表示
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        highlightConnectedCells(x, y);
        
        // タッチムーブイベントを追加
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
    }
    
    // タッチムーブイベントの処理
    function handleTouchMove(e) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        
        // タッチムーブイベントを削除
        document.removeEventListener('touchmove', handleTouchMove, { passive: true });
        
        // タッチエンドイベントを追加
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    
    // タッチエンドイベントの処理
    function handleTouchEnd(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // タッチエンドイベントを削除
        document.removeEventListener('touchend', handleTouchEnd, { passive: true });
        
        // スワイプのしきい値
        if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) {
            // タップとして処理
            const target = document.elementFromPoint(touchEndX, touchEndY);
            if (target && target.classList.contains('cell')) {
                const x = parseInt(target.dataset.x);
                const y = parseInt(target.dataset.y);
                handleCellClick(x, y);
            }
        }
    }
    
    // 新しいゲームボタンのイベントリスナー
    newGameButton.addEventListener('click', initGame);
    
    // ゲームを開始
    initGame();
});
