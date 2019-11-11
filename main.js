// Node Modules
const Promise = require('bluebird');
const socket = require('socket.io');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const AppDAO = require('./dao');
const UserRepository = require('./user_repository');
// Web server
const app = express();
const server = app.listen(3000);
const io = socket(server);
// Routing and sessions
app.set('view engine', 'ejs')
app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(session({secret:"SausagePizzaRolls", saveUninitialized : true, resave : true}));
app.use(express.static(__dirname + '/views'));
// Database interaction
const dao = new AppDAO('./battleship.db');
const userRepo = new UserRepository(dao);
// Active Games Data
var activeGames = [];
const maxGames = 50;

function createGameObject(id) {
    return {
        id: id,
        creatorName   : undefined,
        creatorConnId : undefined,
        joinerName    : undefined,
        joinerConnId  : undefined,
        creatorBoard  : undefined,
        joinerBoard   : undefined,
        creatorShipsRemaining : 17,
        joinerShipsRemaining  : 17,
        creatorShotsFired : 0,
        joinerShotsFired  : 0,
        currentTurn : 'creator',
        state : 1
    }
}

// On incoming socket connection from /play
// Assumes existance of game ID and username
// Checks for creator=true tag in URL
// IF exists attempts to create game with that id
// if doesn't exist, attempts to join game with that id
// By joining a game, the socket id associated with that connection
// Is linked to the game object.
// Messages can then be send within these games by specifying the ID of the socket
io.use(function(socket, next) {
    // Incoming socket connection, assumes game ID, username exists
    if (socket.handshake.query.creator == 'true') {
        // If creating the game
        // Check for existing game with id in list
        // Check if id is in range of max games
        let validGameId = true;
        // IF game ID In range, check for game existance
        if (socket.handshake.query.gameId <= 50) {
            for (let i=0; i<activeGames.length; i++) {
                if (activeGames[i].id == socket.handshake.query.gameId) {
                    next(new Error('Game Exists Error'));
                    validGameId = false;
                }
            }
        } else {
            // IF ID is above 50
            next(new Error('Game Id Out of Range'));
            validGameId = false;
        }

        if (validGameId) {
            let newGame = createGameObject(socket.handshake.query.gameId);
            newGame.creatorName = socket.handshake.query.username;
            newGame.creatorConnId = socket.id;
            activeGames.push(newGame);
            console.log(socket.handshake.query.username + " has created a game with ID : " + socket.handshake.query.gameId);
            console.log("There are currently " + activeGames.length + " running games!");
        }

    } else {
        // If joining the game
        let validGameId = false;
        if (socket.handshake.query.gameId <= 50) {
            // If game ID within range
            // Check that game exists and only has one person in it
            for (let i=0; i<activeGames.length; i++) {
                if (activeGames[i].id == socket.handshake.query.gameId && activeGames[i].joinerName == undefined) {
                    validGameId = true;
                }
            }
        }
        
        if (validGameId) {
            for (let i=0; i<activeGames.length; i++) {
                if (activeGames[i].id == socket.handshake.query.gameId) {
                    activeGames[i].joinerName = socket.handshake.query.username;
                    activeGames[i].joinerConnId = socket.id;
                    console.log(socket.handshake.query.username + " has joined a game with ID : " + socket.handshake.query.gameId);

                    // SEND MESSAGE TO START GAME
                    io.to(activeGames[i].creatorConnId).emit("place-ships", "go");
                    io.to(activeGames[i].joinerConnId).emit("place-ships",  "go");
                }
            }
        }  
    }
    return next(); 
});

// Add socket event handlers

io.sockets.on('connection', function(socket) {
    
    // Demo of drawing within the game 'rooms'
    socket.on('mouse', function(data) {
        gameId = data.gameId;
        for (let i=0; i<activeGames.length; i++) {
            if (activeGames[i].id == gameId) {
                io.to(activeGames[i].creatorConnId).emit("mouse", data);
                io.to(activeGames[i].joinerConnId).emit("mouse", data);
            }
        }
    });
    
    // Sent when all of the ships have been placed. Is in the form
    // { board : [[ array of board]], username: 'username', gameId : 16}
    socket.on('ships-placed', function(data) {
        for (let i=0; i<activeGames.length; i++) {
            // Find index of game with id and check for the game state being in placing mode.
            if (activeGames[i].id == data.gameId && activeGames[i].state == 1) {
                // Active game is now activeGames[i]
                // Checking is user is creator
                if (data.username == activeGames[i].creatorName) {
                    activeGames[i].creatorBoard = data.board;
                } else {
                    // If user is not the creator (joiner)
                    activeGames[i].joinerBoard = data.board;
                }
                // Checking if both boards have been placed
                if (activeGames[i].creatorBoard != undefined && activeGames[i].joinerBoard != undefined) {
                    // Send message to start the game
                    state = 2;
                    io.to(activeGames[i].creatorConnId).emit("start-game", "go");
                    io.to(activeGames[i].creatorConnId).emit("start-turn", "go");
                    io.to(activeGames[i].joinerConnId).emit("start-game",  "go");
                }
            }
        }
    });
    
    // Sent when a player fires a shot.
    // Checks that it is that players turn, then compares the location of their shot
    // To the corrosponding shot in their opponents board
    // If hit/miss, send message to user notifying that
    // Also send message to other user indicating the tile that was shot at.
    // { tile : {x:2,y:3}, username:'username', gameId : 15 }
    socket.on('fire-shot', function(data) {
        for (let i=0; i<activeGames.length; i++) {
            if (activeGames[i].id == data.gameId && activeGames[i].state == 2) {
                // activeGames[i] is now the current game being worked on
                // Identifying is sender is creator or joiner
                let senderPosition;
                let opposingBoard;
                let xindex = data.tile.y + 1;
                let yindex = data.tile.x + 1;

                if (data.username == activeGames[i].creatorName) {
                    senderPosition = 'creator';
                    opposingBoard = activeGames[i].joinerBoard;
                    // Increment creator shot count
                    activeGames[i].creatorShotsFired++;
                    if (activeGames[i].joinerBoard[xindex][yindex] == true) {
                        // If the creator fires a shot at the joiner and hits
                        // Decrement total ships of joiner ships remaining
                        activeGames[i].joinerShipsRemaining--;
                        // Set contents of space to false as does not contain ship
                        activeGames[i].joinerBoard[xindex][yindex] = false;

                        // SEND SOCKET DATA TO CLIENTS
                        io.to(activeGames[i].creatorConnId).emit("shot-result", {hit: true});
                        // if joiner has no ships remaining
                        if (activeGames[i].joinerShipsRemaining <= 0) {
                            io.to(activeGames[i].creatorConnId).emit("game-over", {turns: activeGames[i].creatorShotsFired, winner: activeGames[i].creatorName});
                            io.to(activeGames[i].joinerConnId).emit("game-over",  {turns: activeGames[i].creatorShotsFired, winner: activeGames[i].creatorName});
                            // remove game from active games array
                            activeGames.splice(i, 1);
                        }
                        

                    } else {
                        // If the creator fires a shot at the joiner and misses
                        // SEND SOCKET DATA TO CLIENTS
                        io.to(activeGames[i].creatorConnId).emit("shot-result", {hit: false});
                    }
                    io.to(activeGames[i].joinerConnId).emit("shot-fired",  {x:data.tile.x, y:data.tile.y});
                    activeGames[i].currentTurn = "joiner";
                } else {
                    senderPosition = 'joiner';
                    opposingBoard = activeGames[i].creatorBoard;
                    // Increment joiner shot count
                    activeGames[i].joinerShotsFired++;
                    if(activeGames[i].creatorBoard[xindex][yindex] == true) {
                        // If the joiner fires a shot at the creator and hits
                        // Decrement total ships of creator remaining
                        activeGames[i].creatorShipsRemaining--;
                        // Set contents of space to false
                        activeGames[i].creatorBoard[xindex][yindex] = false;

                        // SEND SOCKET DATA TO CLIENTS
                        io.to(activeGames[i].joinerConnId).emit("shot-result", {hit: true});
                        // if creator has no ships remaining
                        if (activeGames[i].creatorShipsRemaining <= 0) {
                            io.to(activeGames[i].creatorConnId).emit("game-over", {turns: activeGames[i].joinerShotsFired, winner: activeGames[i].joinerName});
                            io.to(activeGames[i].joinerConnId).emit("game-over",  {turns: activeGames[i].joinerShotsFired, winner: activeGames[i].joinerName});
                            // remove game from active games array
                            activeGames.splice(i, 1);
                        }

                    } else {
                        // If the joiner fires a shot at the creator and misses
                        // SEND SOCKET DATA TO CLIENTS
                        io.to(activeGames[i].joinerConnId).emit("shot-result", {hit: false});
                    }
                    io.to(activeGames[i].creatorConnId).emit("shot-fired",  {x:data.tile.x, y:data.tile.y});
                    activeGames[i].currentTurn = "creator";
                }
                


                
            }
        }
    });
    
});

console.log("Server is running...");

// Handling static pages
app.get('/',(req,res) => {
    res.render('pages/index', {username:req.session.username});
});
app.get('/register',(req,res) => {
    res.render('pages/register');
});
app.get('/login',(req,res) => {
    res.render('pages/login');
});

// Checks for existance of username and game id when showing this page
app.get('/play', function(req, res) {
    if (!req.session.username) {
        // If not logged in show login page
        res.render('pages/login');
    } else {
        if (req.query.game) {
            // If 'game' param exists in URL. E.g. ip/play?game=10
            res.render("pages/play", {username:req.session.username});
        } else {
            // Game index page is game param doesn't exist
            res.render("pages/play-index", {username:req.session.username});
        }
    }

});

// Registering users
app.post('/register',(req,res) => {
    registerUser(req.body)
        .then((fres) => {
            if(fres==="Err") {
                res.end("error")
            } else {
                res.end("done")
            }
        })
});

// Logging in users, returns the username or an error
app.post('/login', (req,res) => {
    loginUser(req.body)
        .then((userInfo) => {
            if (userInfo === "No") {
                res.end("No");
            } else if (userInfo === "Error") {
                res.end("Error");
            } else {
                req.session.username = userInfo.username;
                res.end(userInfo.username)
            }
        })
})

// Ends the session
app.get('/logout', (req, res) => {
    req.session.username = "";
    res.end("Done");
})

// Returns datetime in format dd-mm-yy HH:MM
function getDateTime() {
    let date_ob = new Date();
    let year = date_ob.getFullYear();
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let day = ("0" + date_ob.getDate()).slice(-2);
    let hour = ("0" + date_ob.getHours()).slice(-2);
    let minute = ("0" + date_ob.getMinutes()).slice(-2);
    return registerDate = year + "-" + month + "-" + day + " " + hour + ":" + minute;
}

// Adds a user to the database
function registerUser(user) {

    let registerDate = getDateTime()

    var userData = {username: user.username,
                    password: user.password,
                    register_date: ""}

    userData.register_date = registerDate;
    
    return userRepo.createTable()
        .then(() => userRepo.create(userData))
        .catch((err) => {
            return "Err";
        });
}

// Checks if user exists in database
function loginUser(user) {
    return userRepo.getByName(user.username)
        .then((result) => {
            if (user.password === result.password){
                return {id:result.id, username:result.username};
            } else { return "No" }
        })
        .catch((err) => {
            return "Error"
        })     
}

