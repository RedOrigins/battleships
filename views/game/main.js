var player, turns, waiting = false;
var shotHit, otherLasts = []
var displayText = ['', 'WAITING FOR PLAYER 2...', 'YOU LOST!', 'YOU WON!']
var gameEnded = false;
var displayTextIndex = 0;
var badShot = false;
   
/**
* * Game State Comments
* TODO: Left Off Here
* ? Replace This At a Later Time
* ! Section
*/
 
//! ==================================================================================================================
 
// BUTTONS
 
// Lock In Ships
 
lockInBtn = new Clickable();
lockInBtn.text = 'Lock In!'; lockInBtn.locate(575, 225);  
 
lockInBtn.onPress = function() {
    player.lockedIn = true;
    turns = 0;
   
    //? Send server the board packet
    socket.emit('ships-placed', {board: board.board, id:gameId})
    console.log("Sending Ships Placed Packet")
    wating = true;
}
lockInBtn.onHover = function() {this.color = '#b30000';}; lockInBtn.onOutside = function() {this.color = '#070707';}
 
// Fire Shot
 
shotBtn = new Clickable();
shotBtn.text = 'FIRE!'; shotBtn.locate(575, 225); shotBtn.textSize = 40;
 
shotBtn.onPress = function(){
    turns += 1;
   
    player.shot = [hitSquare.x-17, hitSquare.y, false];
    player.playerLasts.push(player.shot);
    
    
 
    console.log('Turn ' +turns+ ', you shot here --> ' + (player.shot[0]+1) + ',' + (player.shot[1]+1));
 
    //? Send server the shot packet
    socket.emit('fire-shot', {x:player.shot[0], y:player.shot[1], id:gameId})
    console.log("Sending fire shot packet!")
    waiting = true;
   
    player.isGo = false;
}
shotBtn.onHover = function() {this.color = '#b30000';}; shotBtn.onOutside = function() {this.color = '#070707';}
 
 
//! ==================================================================================================================
 
function setup() {
    // Create the canvas and display grid
    createCanvas(1350, 500);
    board = new Gameboard(10, 500);
    board.create();
 
    // Initialise player object
    player = new Player();
 
    // Create a square for use when firing shots
    hitSquare = new hitSquare(20, 5);
   
   
    // CLIENT --> SERVER
 
    socket.on('start-turn', data => {
        player.isGo = true;
        waiting = false;
        displayTextIndex = 0;
        hitSquare.moving = true;
        console.log("Start Turn Packet : " + data);
    });
 
    socket.on('shot-fired', data => {
        let otherPlayerShot = [];
        otherPlayerShot.push(data.x); otherPlayerShot.push(data.y); otherPlayerShot.push(false);
        otherLasts.push(otherPlayerShot);
    });
 
    socket.on('game-over', data => {
        console.log("Game Over Packer : " + data);
        if(data.winner == false) {
            displayTextIndex = 2;
        }
        else {
            displayTextIndex = 3;
        }
        player.isGo = false;
        gameEnded = true;
    });
 
    socket.on('shot-result', data => {
        if(data.hit == true) {
            player.playerLasts[player.playerLasts.length-1][2] = true;
        }
    });
}
 
//! ==================================================================================================================
 
function draw() {
 
    //* DRAW ALWAYS...
        // Draw background (eventually an image) and display grid visuals
        background('#080808');
        board.display();
 
        for(let i=0; i<player.shipArray.length; i++) {
            player.shipArray[i].display();
        }
 
        if(otherLasts.length > 0) {
            displayX(otherLasts, 0);
        }
   
        if(player.playerLasts.length > 0) {
            displayX(player.playerLasts, 17*board.tileSize);
        }
 
        push();
        textSize(60); stroke('#eeeeee'); textAlign(CENTER, CENTER);
        text(displayText[displayTextIndex], 675, 250);
        pop();
 
    //* Waiting for Other Player
    if(waiting == true) {
        if(gameEnded == false) {
            displayTextIndex = 1;
        }
    }
    else{
        //* GAME STATE 1 - Placing Ships
        for(let i=0; i<player.shipArray.length; i++) {
            // If they being clicked on, drag them!
            if (player.shipArray[i].drag == true) {
                player.shipArray[i].dragging();
            }  
        }
   
        // If all the ships are in valid places display the button that allows the user to lock in there ships
        if(player.allPlaced == true && player.lockedIn == false) {    
            lockInBtn.draw();
        }
   
        //* GAME STATE 2 - Firing Shot
        // If the shot square is up, display it, will be replaced with  
        if(player.isGo == true) {
            hitSquare.display();
            if(hitSquare.moving == true) {
                hitSquare.move();
            }
            else {
                badShot = false;
                for(let i=0; i<player.playerLasts.length; i++) {
                    if(player.playerLasts[i][0] == hitSquare.x-17 && player.playerLasts[i][1] == hitSquare.y) {
                        badShot = true;
                    }
                }
                if(badShot == false) {
                    shotBtn.draw();
                }
            }
        }
    }  
}
 
//! ==================================================================================================================
 
// Display previous turn results
function displayX(array, offset) {
    for(let i=0; i<array.length; i++ ){
        push();
        if(array[i][2] == true) {
            stroke('#ff0000');
        }
        else{
            stroke('#ffffff');
        }
        strokeWeight(3);
        line(array[i][0]*board.tileSize +offset, array[i][1]*board.tileSize, (array[i][0]+1)*board.tileSize +offset, (array[i][1]+1)*board.tileSize);
        line(array[i][0]*board.tileSize +offset, (array[i][1]+1)*board.tileSize, (array[i][0]+1)*board.tileSize +offset, array[i][1]*board.tileSize );
        pop();
    }
}
   
//! ==================================================================================================================
 
function mousePressed() {
    if(player.lockedIn == false) {
        for(let i=0; i<player.shipArray.length; i++) {
            player.shipArray[i].click();
        }
    }
   
    if(player.lockedIn == true && player.isGo == true) {
        if(hitSquare.moving == false) {
            if(mouseX < width && mouseX > width-500 && mouseY < height && mouseY > 0) {
                hitSquare.moving = true;
            }
        }
        else {
            hitSquare.moving = false;
        }
    }
}
 
function mouseReleased() {
    player.allPlaced = true;
   
    for(let i=0; i<player.shipArray.length; i++) {
        if(player.shipArray[i].drag == true) {
            player.shipArray[i].snap();
        }
       
        if(player.shipArray[i].placed == false) {
            player.allPlaced = false;
        }  
    }  
   
    board.updateGameArray();
   
}
 
function keyReleased() {
    for(let i=0; i<player.shipArray.length; i++) {
        if (player.shipArray[i].drag == true) {
            if(keyCode === 32) {
                player.shipArray[i].rotateShip();
            }
        }
    }
}
