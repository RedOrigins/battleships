class Gameboard {
	constructor(tiles, boardSize) {
		this.numOfTiles = tiles;
		this.boardSize = boardSize;
		this.tileSize = (this.boardSize)/tiles;
    
		this.board = [];
		this.boardRow = [];
	}
  
  // MECHANICAL //
	create() {
		for(let i=0; i<this.numOfTiles; i++) {
			for(let j=0; j<this.numOfTiles; j++) {
				this.boardRow.push(false);
			}
			this.board.push(this.boardRow);
			this.boardRow = [];
		}
	}
	
	updateGameArray() {
		let shipCoord = [];
		let tileCoord = [];
		
		this.board = [];
		this.create();
		
		player.shipArray.forEach(function(updateShip) {
			if(updateShip.placed == true) {			
				for(let i=0; i<updateShip.len; i++) {
					if(updateShip.dir == 'H') {
						tileCoord.push(updateShip.x + i); tileCoord.push(updateShip.y);
						shipCoord.push(tileCoord);
					}
					else {
						tileCoord.push(updateShip.x); tileCoord.push(updateShip.y + i);
						shipCoord.push(tileCoord);
					}
					tileCoord = [];
				}
			}
		});
		
		for(let i=0; i<shipCoord.length; i++) {
			board.board[shipCoord[i][1]][shipCoord[i][0]] = true;
		}
		
	//	console.table(board.board)
	}
			
	
  // VISUAL //
    display() {
        strokeWeight(1);
        fill(30); rect(height, 0, 350, height);
        fill(255); stroke(255); textSize(25); text('Ships: ', 640, 25);
        textSize(15); text('<-- Your Board', 520, 60); text('Enemy Board -->', 715, 60);

        for(let i=0; i<this.numOfTiles+1; i++) {
            stroke('#b30000');
            line(i*this.tileSize, 0, i*this.tileSize, this.boardSize); line(0, i*this.tileSize, this.boardSize, i*this.tileSize);
            line(i*this.tileSize +850, 0, i*this.tileSize +850, this.boardSize); line(850, i*this.tileSize, this.boardSize +850, i*this.tileSize);
        }
    }
}

//console.log([updateShip.x, updateShip.y])