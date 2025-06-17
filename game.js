document.addEventListener('DOMContentLoaded', () => {
    // ゲーム設定
    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 15;
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
                
                cellElement.addEventListener('click', () => handleCellClick(x, y));
                
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
            await animateCellRemoval(connectedCells);
            removeCells(connectedCells);
            updateScore(score + Math.pow(connectedCells.length, 2));
            
            // ブロックの再配置は行わない
            renderBoard();
            
            // ゲームクリアチェック（全てのブロックが消えたか）
            if (isBoardEmpty()) {
                endGame(true);
            }
            // 有効な手が残っているかチェック
            else if (isGameFinished()) {
                endGame(false);
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
        
        // 4方向をチェック
        result = result.concat(findConnectedCells(x + 1, y, color, checked));
        result = result.concat(findConnectedCells(x - 1, y, color, checked));
        result = result.concat(findConnectedCells(x, y + 1, color, checked));
        result = result.concat(findConnectedCells(x, y - 1, color, checked));
        
        return result;
    }
    
    // セルを削除
    function removeCells(cells) {
        cells.forEach(cell => {
            if (cell && board[cell.y][cell.x]) {
                board[cell.y][cell.x] = null;
            }
        });
    }
    
    // セルを下に詰める（使用しないが、念のため残しておく）
    function shiftCellsDown() {
        // この関数は使用しないが、他の場所で呼び出されている可能性があるので空の実装に
        console.log('shiftCellsDown is disabled in this version');
    }
    
    // 空の列を削除（使用しないが、念のため残しておく）
    function removeEmptyColumns() {
        // この関数は使用しないが、他の場所で呼び出されている可能性があるので空の実装に
        console.log('removeEmptyColumns is disabled in this version');
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
    
    // ゲームが終了したかチェック
    function isGameFinished() {
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
    
    // ボードが空かどうかをチェック
    function isBoardEmpty() {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x] !== null) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // ゲーム終了処理
    function endGame(isClear) {
        isGameOver = true;
        playSound('success');
        
        // お祝いアニメーション
        const celebration = document.getElementById('celebration');
        celebration.style.display = 'block';
        
        // 花火エフェクト
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                createFirework();
            }, i * 200);
        }
        
        // スコア表示
        setTimeout(() => {
            const message = isClear 
                ? `🎉 おめでとう！全てのブロックを消しました！ 🎉\nスコア: ${score}`
                : `ゲームオーバー！\nスコア: ${score}\n\nもっと消せるブロックがありません`;
                
            if (confirm(`${message}\n\nもう一度遊びますか？`)) {
                celebration.style.display = 'none';
                initGame();
            }
        }, 1500);
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
    
    // 新しいゲームボタンのイベントリスナー
    newGameButton.addEventListener('click', initGame);
    
    // タッチイベントのサポート
    document.addEventListener('touchstart', function(e) {
        // タッチ時のハイライトを無効化
        if (e.target.classList.contains('cell')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // スワイプ操作のサポート
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', function(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
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
    });
    
    // ゲームを開始
    initGame();
});
