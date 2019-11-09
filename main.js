const Promise = require('bluebird');
const socket = require('socket.io');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const AppDAO = require('./dao');
const UserRepository = require('./user_repository');

const router = express.Router();
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

console.log("Server is running...");

router.get('/',(req,res) => {
    res.render('pages/index', {username:req.session.username});
});

router.get('/register',(req,res) => {
    res.render('pages/register', {username:req.session.username});
});


router.get('/login',(req,res) => {
    res.render('pages/login', {username:req.session.username});
});

router.get('/play',(req,res) => {
    res.render('pages/play', {username:req.session.username});
});

router.get('/scores',(req, res) => {
    res.render('pages/scores', {username:req.session.username});
});

router.post('/register',(req,res) => {
    registerUser(req.body)
        .then((fres) => {
            if(fres==="Err") {
                res.end("error")
            } else {
                res.end("done")
            }
        })
});

router.post('/login', (req,res) => {
    loginUser(req.body)
        .then((fres) => {
            if (fres === "No") {
                res.end("No");
            } else if (fres === "Error") {
                res.end("Error");
            } else {
                req.session.username = fres;
                res.end(fres)
            }
        })
})

router.get('/logout', (req, res) => {
    req.session.username = "";
    res.end("Done");
})


    
        

app.use('/', router)

function getDateTime() {
    let date_ob = new Date();
    let year = date_ob.getFullYear();
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let day = ("0" + date_ob.getDate()).slice(-2);
    let hour = ("0" + date_ob.getHours()).slice(-2);
    let minute = ("0" + date_ob.getMinutes()).slice(-2);
    return registerDate = year + "-" + month + "-" + day + " " + hour + ":" + minute;
}

function registerUser(user) {

    let registerDate = getDateTime()

    var userData = {username: user.username,
                    password: user.password,
                    register_date: ""}

    userData.register_date = registerDate;
    
    return userRepo.createTable()
        .then(() => userRepo.create(userData))
        .then(() => userRepo.getAll())
        .then((users) => {
            console.log(users);
        })
        .catch((err) => {
            return "Err";
        });
}

function loginUser(user) {
    return userRepo.getByName(user.username)
        .then((result) => {
            if (user.password === result.password){
                return user.username;
            } else { return "No" }
        })
        .catch((err) => {
            return "Error"
        }) 
    
}

