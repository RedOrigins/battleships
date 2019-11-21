class Ship {
	constructor(X, Y, Length, Direction, id) {
		this.x = X;
		this.y = Y;
		this.defaultPos = [this.x, this.y];
		this.dir = Direction;
		this.drag = false;
		this.dimensions = [];
		this.len = Length
		this.placed = false;
		this.id = id;
		this.fill = 50;
	}
	
	rotation() {
		if(this.dir === 'H') {
			this.dimensions = [(this.len*board.tileSize)-5, (board.tileSize)-5];
		}
		if(this.dir === 'V') {
			this.dimensions = [(board.tileSize)-5, (this.len*board.tileSize)-5];
		}
	}
 
	display() {
		fill(this.fill);
		rect((this.x*board.tileSize)+1, (this.y*board.tileSize)+1, this.x+this.dimensions[0], this.y+this.dimensions[1]);
		
		if(this.id == 3 && turns > 60) {
				this.fill = '#f5de0f';
				console.log('Itsa yellow submarine');
		}
	}

	click() {
		if (mouseX > this.x*board.tileSize && mouseX < this.x*board.tileSize+this.dimensions[0] && 
		mouseY > this.y*board.tileSize && mouseY < this.y*board.tileSize+this.dimensions[1]) {     
			if (this.drag == false) {														   
				this.drag = true;
			}
			else {
				this.drag = false;
			}
		}
	}
	
	snap() {
		this.drag = false;
		this.x = Math.round(this.x); this.y = Math.round(this.y);
		this.placed = true;
		
		if(this.x < 0 || this.y < 0 || (this.x + (this.dimensions[0]/board.tileSize)) > board.numOfTiles ||
		  (this.y + (this.dimensions[1]/board.tileSize)) > board.numOfTiles) {
			this.rePos();
			console.log('Out of bounds!')
		}
		else{
			for(let i=0; i<this.len; i++) {
				if(this.dir == 'H') {
					if(board.board[this.y][this.x+i] == true) {
						this.rePos();
						console.log('Ship already placed here!')
						break
					}
				}
				else {
					if(board.board[this.y+i][this.x] == true) {
						this.rePos();
						console.log('Ship already placed here!')
						break
					}
				}
			}
		}		
	}
	
	dragging() {
		this.x = mouseX/board.tileSize; this.y = mouseY/board.tileSize;
	}
	
	rePos() {
		this.x = this.defaultPos[0]; this.y = this.defaultPos[1];
		this.placed = false;
		if(this.dir == 'V') {
			this.rotateShip()
		}
	}
	
	rotateShip() {
		if(this.dir == 'H') {
			this.dir = 'V';
		}
		else {
			this.dir = 'H';
		}
		this.rotation();
	}
}
