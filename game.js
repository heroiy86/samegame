document.addEventListener('DOMContentLoaded', () => {
    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 15;
    const COLORS = ['#FF5252', '#FFD740', '#69F0AE', '#40C4FF', '#E040FB', '#FF4081'];
    
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
        
        // ボードの初期化
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
        
        renderBoard();
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
    function handleCellClick(x, y) {
        if (isGameOver) return;
        
        const clickedCell = board[y][x];
        if (!clickedCell) return;
        
        const connectedCells = findConnectedCells(x, y, clickedCell.color);
        
        // 2つ以上つながっている場合のみ削除
        if (connectedCells.length >= 2) {
            removeCells(connectedCells);
            updateScore(score + Math.pow(connectedCells.length, 2));
            shiftCellsDown();
            removeEmptyColumns();
            renderBoard();
            
            // ゲームオーバーチェック
            if (isGameFinished()) {
                endGame();
            }
        }
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
    
    // セルを下に詰める
    function shiftCellsDown() {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            let writeIndex = BOARD_HEIGHT - 1;
            
            // 下から上にスキャンして、空でないセルを下に詰める
            for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
                if (board[y][x]) {
                    if (y !== writeIndex) {
                        board[writeIndex][x] = board[y][x];
                        board[y][x] = null;
                    }
                    writeIndex--;
                }
            }
        }
    }
    
    // 空の列を削除
    function removeEmptyColumns() {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (isColumnEmpty(x)) {
                // 空の列を削除して右から詰める
                for (let x2 = x + 1; x2 < BOARD_WIDTH; x2++) {
                    if (!isColumnEmpty(x2)) {
                        // 列を入れ替え
                        for (let y = 0; y < BOARD_HEIGHT; y++) {
                            if (board[y][x2]) {
                                board[y][x] = board[y][x2];
                                board[y][x2] = null;
                            }
                        }
                        break;
                    }
                }
            }
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
    
    // ゲームが終了したかチェック
    function isGameFinished() {
        // 有効な手が残っているかチェック
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x]) {
                    const connectedCells = findConnectedCells(x, y, board[y][x].color);
                    if (connectedCells.length >= 2) {
                        return false; // 有効な手がある
                    }
                }
            }
        }
        return true; // 有効な手がない
    }
    
    // スコアを更新
    function updateScore(newScore) {
        score = newScore;
        scoreElement.textContent = score;
    }
    
    // ゲームオーバー
    function endGame() {
        isGameOver = true;
        alert(`ゲームオーバー！ スコア: ${score}`);
    }
    
    // 新しいゲームボタンのイベントリスナー
    newGameButton.addEventListener('click', initGame);
    
    // ゲームを開始
    initGame();
});
