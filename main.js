const socket = require('socket.io');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const AppDAO = require('./dao');
const UserRepository = require('./user_repository');
const app = express();
const server = app.listen(3000);
const io = socket(server);
app.set('view engine', 'ejs')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(session({secret:"SausagePizzaRolls", saveUninitialized : true, resave : true}));
app.use(express.static(__dirname + '/views'));
const dao = new AppDAO('./battleship.db');
const userRepo = new UserRepository(dao);

let openGames = [];
let gameIdCounter = 1;
let activeGames = [];

function createGameObject(id) {
	return {
		creatorConn: undefined,
		joinerConn : undefined,
		id : id,
		creatorBoard : undefined,
		joinerBoard  : undefined,
		state : 1,
		creatorShipsRemaining : 17,
		joinerShipsRemaining  : 17,
		round : 1,
		currentTurn : 'creator'
	}
}

io.on('connection', function (socket) {

    // Handle game stuff here
    // Data is the gameid
    socket.on('play-game', id => {
		// Is in one of the game rooms
		let gameId = Number(id);
		let gameFound = false;
		for (let i=0; i<activeGames.length; i++) {
			if (activeGames[i].id == gameId) {
				gameFound = true;
                activeGames[i].joinerConn = socket.id;
                io.to(activeGames[i].creatorConn).emit("place-ships", "go");
                io.to(activeGames[i].joinerConn).emit("place-ships", "go");
			}
		}
		if (!gameFound) {
			let newGame = createGameObject(gameId);
			newGame.creatorConn = socket.id;
			activeGames.push(newGame);
        }
    });


    // data = {board : [[array here]], id:gameID}
    socket.on("ships-placed", data => {
        for (let i = 0; i < activeGames.length; i++) {
            if (activeGames[i].id == data.id && activeGames[i].state == 1) {
                // THIS IS THE GAME BEING PLAYED AND IT IS IN THE RIGHT STATE
                if (socket.id == activeGames[i].creatorConn && activeGames[i].creatorBoard == undefined) {
                    // IF THE PERSON IS THE CREATOR AND THEIR BOARD IS EMPTY
                    activeGames[i].creatorBoard = data.board;
                    console.log(activeGames[i]);
                } else if (socket.id == activeGames[i].joinerConn && activeGames[i].joinerBoard == undefined) {
                    // IF THE PERSON IS THE JOINER AND THEIR BOARD IS EMPTY
                    activeGames[i].joinerBoard = data.board;
                    console.log(activeGames[i]);
                }
                if (activeGames[i].creatorBoard && activeGames[i].joinerBoard) {
                    // IF BOTH BOARDS ARE PLACED
                    activeGames[i].state = 2;
                    io.to(activeGames[i].creatorConn).emit("start-game", "go");
                    io.to(activeGames[i].creatorConn).emit("start-turn", "go");
                    io.to(activeGames[i].joinerConn).emit("start-game",  "go");
                    console.log(activeGames[i]);
                }
            }
        }
    });

    // data = {x:0, y:5, id:gameID}
    socket.on("fire-shot", data => {
        for (let i = 0; i < activeGames.length; i++) {
            if (activeGames[i].id == data.id && activeGames[i].state == 2) {
                // ! IF SHOT FIRED BY CREATOR
                if (socket.id == activeGames[i].creatorConn && activeGames[i].currentTurn == "creator") {
                    if (activeGames[i].joinerBoard[data.y][data.x] == true)  {
                        // If shot hit
                        activeGames[i].joinerBoard[data.y][data.x] = false;
                        activeGames[i].joinerShipsRemaining--;
                        io.to(activeGames[i].creatorConn).emit("shot-result", {hit: true});
                    } else {
                        // If shot missed
                        io.to(activeGames[i].creatorConn).emit("shot-result", {hit: false});
                    }
                    io.to(activeGames[i].joinerConn).emit("shot-fired",  {x:data.x, y:data.y});
                    io.to(activeGames[i].joinerConn).emit("start-turn", "go");
                    activeGames[i].currentTurn = "joiner";
                } else if (socket.id == activeGames[i].joinerConn && activeGames[i].currentTurn == "joiner") {
                    //! Shot fired by joiner
                    if (activeGames[i].creatorBoard[data.y][data.x] == true)  {
                        // If shot hit
                        activeGames[i].creatorBoard[data.y][data.x] = false;
                        activeGames[i].creatorShipsRemaining--;
                        io.to(activeGames[i].joinerConn).emit("shot-result", {hit: true});
                    } else {
                        // If shot missed
                        io.to(activeGames[i].joinerConn).emit("shot-result", {hit: false});
                    }
                    io.to(activeGames[i].creatorConn).emit("shot-fired",  {x:data.x, y:data.y});
                    io.to(activeGames[i].creatorConn).emit("start-turn", "go");
                    activeGames[i].currentTurn = "joiner";
                    activeGames[i].round++;
                }
                if (activeGames[i].joinerShipsRemaining <= 0) {
                    //! Creator Wins
                    io.to(activeGames[i].creatorConn).emit("game-over",  {rounds: activeGames[i].round, winner:true});
                    io.to(activeGames[i].joinerConn).emit("game-over",  {rounds: activeGames[i].round, winner:false});
                } else if (activeGames[i].creatorShipsRemaining <= 0) {
                    //! Joiner Wins
                    io.to(activeGames[i].creatorConn).emit("game-over",  {rounds: activeGames[i].round, winner:false});
                    io.to(activeGames[i].joinerConn).emit("game-over",  {rounds: activeGames[i].round, winner:true});
                }
            }
            
        }
    });

    socket.on('mouse', data => {
        socket.to(data.id).emit("mouse", {x:data.x, y:data.y});
    });

    // Lobby room is the playindex page
    socket.on("join-room", room => {
        socket.join(room);
        console.log("Socket with id : "+ socket.id + " joined room : " + room);
        if (room == 'lobby') {
            for (let i=0; i<openGames.length; i++) {
                socket.emit("new-game", {creator:openGames[i].creator, id:openGames[i].id})
            }
        }
    });

    socket.on("message", data => {
        // {room:"1", content:"message content here., sender:username"}
        if (data.content && !data.content.includes("<")) {
			socket.to(data.room).emit("message", data);
		}
        
    });

    socket.on("leave-room", room => {
        socket.leave(room);
    });

    socket.on("new-game", creator => {
        openGames.push({creator:creator, id:gameIdCounter})
        socket.to('lobby').emit("new-game", {creator:creator, id:gameIdCounter});
        gameIdCounter++;
    });

    socket.on("joined-game", id => {
        for (let i=0; i<openGames.length; i++) {
            if (openGames[i].id == id) {
                openGames.splice(i, 1);
            }
        }
        socket.to('lobby').emit("joined-game", id);
    });

});


app.get('/',(req,res) => {
    res.render('pages/index', {username:req.session.username});
});
app.get('/register',(req,res) => {
    res.render('pages/register');
});
app.get('/login',(req,res) => {
    res.render('pages/login');
});
app.get('/play',(req,res) => {
    if (!req.session.username) {
        res.render('pages/login');
    } else {
		let username = req.session.username;
        if (req.query.game) {
            res.render("pages/play", {username:username});
        } else {
            res.render("pages/playindex", {username:username});
        }
    }
});
app.get('/logout',(req,res) => {
	req.session.username = "";
	req.session.id = "";
    res.end("Done");
});
app.get('/currentGameID',(req,res) => {
    res.end(String(gameIdCounter));
})

app.post('/register', (req,res) => {
	if(req.body) {
		let username = req.body.username;
		let password = req.body.password;
		if (username.length > 18 || password.length > 18) {
			res.end("Error Creating User")
		} else {
		registerUser(username, password)
			.then((createStatus) => {
				if (createStatus == "err") {
					res.end("Error Creating User")
				} else {
					res.end("Sucessfully created user : " + username); 
				}
			});
		}
	} else {
		res.render('pages/register');
	}
});

app.post('/login', (req,res) => {
	let username = req.body.username;
	let password = req.body.password;
	loginUser(username, password)
		.then((userInfo) => {
			if (userInfo === "incorrect-password") {
                res.end("incorrect-password");
            } else if (userInfo === "unknown-username") {
                res.end("unknown-username");
            } else {
                req.session.username = userInfo.username;
                req.session.userId   = userInfo.id;
                res.end(JSON.stringify(userInfo));
            }
		});
});

function registerUser(username, password) {
	let registerDate = getDateTime();
	let userData = { username: username,
					 password: password,
					 register_date: registerDate };
	return userRepo.createTable()
		.then(() => userRepo.create(userData))
		.catch((err) => {
			return "err";
		});
}

function loginUser(username, password) {
	return userRepo.getByName(username)
        .then((result) => {
            if (password === result.password){
                return {id:result.id, username:result.username};
            } else { return "incorrect-password" }
        })
        .catch((err) => {
            return "unknown-username"
        })
}

function getDateTime() {
    let date_ob = new Date();
    let year = date_ob.getFullYear();
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let day = ("0" + date_ob.getDate()).slice(-2);
    let hour = ("0" + date_ob.getHours()).slice(-2);
    let minute = ("0" + date_ob.getMinutes()).slice(-2);
    return registerDate = year + "-" + month + "-" + day + " " + hour + ":" + minute;
}
