class hitSquare {
	constructor(X, Y) {
		this.x = X;
		this.y = Y;
		this.shotSquareExists = false;
		this.moving = true;
		this.mouseWithinBounds = false;
	}
	
	display() {
		fill(255, 255, 255, 150);
		rect((this.x*board.tileSize), this.y*board.tileSize, board.tileSize, board.tileSize);
	}
	
	move() {
		this.mouseWithinBounds = false;
		
		if(mouseX > width) {this.x = (width/board.tileSize)-1;}
		else if(mouseX < width-500) {this.x = (width-500)/board.tileSize;}
		else if(mouseY > height) {this.y = (height/board.tileSize)-1;}
		else if(mouseY < 0) {this.y = 0;}
		else {
			this.x = Math.floor(mouseX/board.tileSize); this.y = Math.floor(mouseY/board.tileSize);
			this.mouseWithinBounds = true;
		}
	}
}

  

