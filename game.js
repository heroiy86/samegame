document.addEventListener('DOMContentLoaded', () => {
    // --- 設定 --- //
    const BOARD_WIDTH = 8;
    const BOARD_HEIGHT = 12;
    const COLORS = ['#FF6B9E', '#FFD166', '#06D6A0', '#118AB2', '#A05CDF', '#FF9E7D'];

    // --- DOM要素 --- //
    const boardElement = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const newGameButton = document.getElementById('new-game-button');
    const gameOverModal = document.getElementById('game-over-modal');
    const gameOverTitle = document.getElementById('game-over-title');
    const finalScoreElement = document.getElementById('final-score');
    const playAgainButton = document.getElementById('play-again-button');

    // --- ゲーム状態 --- //
    let board = [];
    let score = 0;
    let isProcessing = false;

    // --- 初期化 --- //
    function init() {
        score = 0;
        updateScore(0);
        isProcessing = false;
        gameOverModal.style.display = 'none';

        board = Array.from({ length: BOARD_HEIGHT }, () =>
            Array.from({ length: BOARD_WIDTH }, () => COLORS[Math.floor(Math.random() * COLORS.length)])
        );

        if (!hasValidMoves()) {
            init(); // 有効な手がない場合は再生成
            return;
        }

        renderBoard(true); // 初回描画時のみアニメーション
    }

    // --- 描画 --- //
    function renderBoard(isInitialRender = false) {
        boardElement.innerHTML = '';
        board.forEach((row, y) => {
            row.forEach((color, x) => {
                if (color) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    if (isInitialRender) {
                        cell.classList.add('cell-pop-in');
                        cell.style.animationDelay = `${(y * BOARD_WIDTH + x) * 0.01}s`;
                    }
                    cell.style.backgroundColor = color;
                    cell.dataset.x = x;
                    cell.dataset.y = y;
                    boardElement.appendChild(cell);
                }
            });
        });
    }

    // --- イベントリスナー --- //
    boardElement.addEventListener('click', handleCellClick);
    boardElement.addEventListener('mouseover', handleCellMouseover);
    boardElement.addEventListener('mouseout', clearHighlights);
    newGameButton.addEventListener('click', init);
    playAgainButton.addEventListener('click', init);

    // --- ゲームロジック --- //

    async function handleCellClick(event) {
        if (isProcessing) return;
        const cell = event.target.closest('.cell');
        if (!cell) return;

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        const connectedCells = findConnectedCells(x, y);

        if (connectedCells.length < 2) {
            cell.classList.add('shake');
            setTimeout(() => cell.classList.remove('shake'), 300);
            return;
        }

        isProcessing = true;
        clearHighlights();

        score += connectedCells.length * (connectedCells.length - 1);
        updateScore(score);

        await animateCellRemoval(connectedCells);

        removeCells(connectedCells);
        applyGravity();
        shiftColumns();

        renderBoard(false); // アニメーションなしで再描画

        if (!hasValidMoves()) {
            endGame();
        }

        isProcessing = false;
    }

    // 【改修】接続セル探索ロジック
    function findConnectedCells(startX, startY) {
        const targetColor = board[startY]?.[startX];
        if (!targetColor) return [];

        const connected = [];
        const queue = [{ x: startX, y: startY }];
        const visited = new Set([`${startX},${startY}`]);

        while (queue.length > 0) {
            const { x, y } = queue.shift();
            connected.push({ x, y });

            const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dx, dy] of neighbors) {
                const newX = x + dx;
                const newY = y + dy;
                const key = `${newX},${newY}`;

                if (newX >= 0 && newX < BOARD_WIDTH && newY >= 0 && newY < BOARD_HEIGHT && !visited.has(key) && board[newY][newX] === targetColor) {
                    visited.add(key);
                    queue.push({ x: newX, y: newY });
                }
            }
        }
        return connected;
    }

    function removeCells(cells) {
        cells.forEach(({ x, y }) => { board[y][x] = null; });
    }

    function applyGravity() {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            let writeY = BOARD_HEIGHT - 1;
            for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
                if (board[y][x]) {
                    if (y !== writeY) {
                        board[writeY][x] = board[y][x];
                        board[y][x] = null;
                    }
                    writeY--;
                }
            }
        }
    }

    // 【抜本的修正】安全で確実な列詰め処理
    function shiftColumns() {
        // 新しい盤面を一時的に作成
        const newBoard = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
        let newX = 0; // 新しい盤面の書き込み列インデックス

        // 元の盤面を左から右へ走査
        for (let x = 0; x < BOARD_WIDTH; x++) {
            // 現在の列が空かどうかを判定
            const isColumnEmpty = board.every(row => row[x] === null);

            // 空でなければ、新しい盤面にコピー
            if (!isColumnEmpty) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    newBoard[y][newX] = board[y][x];
                }
                newX++; // 書き込み先の列を一つ進める
            }
        }
        // 状態を新しい盤面で完全に置き換える
        board = newBoard;
    }

    // --- ヘルパー関数 --- //

    function updateScore(newScore) {
        score = newScore;
        scoreElement.textContent = score;
    }

    function hasValidMoves() {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x] && findConnectedCells(x, y).length >= 2) return true;
            }
        }
        return false;
    }

    function isBoardEmpty() {
        return board.every(row => row.every(cell => cell === null));
    }

    // --- ハイライト --- //
    function handleCellMouseover(event) {
        if (isProcessing) return;
        const cell = event.target.closest('.cell');
        if (!cell) return;
        clearHighlights();
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        const connected = findConnectedCells(x, y);
        if (connected.length >= 2) {
            connected.forEach(({ x, y }) => {
                const el = boardElement.querySelector(`[data-x='${x}'][data-y='${y}']`);
                el?.classList.add('highlight');
            });
        }
    }

    function clearHighlights() {
        boardElement.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    }

    // --- アニメーション --- //
    function animateCellRemoval(cells) {
        return new Promise(resolve => {
            cells.forEach(({ x, y }) => {
                const el = boardElement.querySelector(`[data-x='${x}'][data-y='${y}']`);
                if (el) el.classList.add('cell-pop-out');
            });
            setTimeout(resolve, 200);
        });
    }

    // --- ゲーム終了 --- //
    function endGame() {
        finalScoreElement.textContent = score;
        gameOverTitle.textContent = isBoardEmpty() ? 'パーフェクト！' : 'ゲームオーバー';
        gameOverModal.style.display = 'flex';
    }

    // --- ゲーム開始 --- //
    init();
});