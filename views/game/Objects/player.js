class Player {
    constructor() {
      this.ships = [5, 4, 3, 3, 2];
      this.allPlaced = false;
      this.lockedIn = false;
      this.shot = [];
      this.isGo = undefined;
      this.playerLasts = [];
      
      this.shipArray = [];
      for(let i=0;i<5;i++) {
          this.ship = new Ship(11, (1.5*i)+2, this.ships[i], 'H', i+1);
          this.shipArray.push(this.ship)
      }
      
      for(let i=0; i<this.shipArray.length; i++) {
          this.shipArray[i].rotation();
      }
    }
  }
