var express = require('express');
var router = express.Router();
//Include files that are in .gitignore
var config = require('../config/config.js');
//Include mysql module so that node can talk to sql
var mysql = require('mysql'); 
// set up a connection to use over and over
var connection = mysql.createConnection({
	host: config.host,
	user: config.user,
	password: config.password,
	database: config.database
});

//After this line runs, we will have a connection to sql
connection.connect();

//Include Multer module. Makes it easier to upload files
var multer = require('multer');
//Upload is the multer module with a dest object passed to it
var upload = multer({ dest: 'public/images'});
//Specify type to use later. It comes from upload.
var type = upload.single('imageToUpload');
//We will need fs to read the file, it's part of core
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
	var getImageQuery = "SELECT * FROM images";
	//In SQL, we want different imageIDs so that you can't vote on the same images over and over. Everytime someone votes, we log their ip address so that the same ip address can't vote for the same image more than once. SELECT id FROM votes WHERE ip = "::1"; and SELECT * FROM images;

	//Search for all the images that the current user has voted on: SELECT * FROM images WHERE Id NOT IN (SELECT imageID FROM votes WHERE ip = "::1");
	//the NOT IN part is the dataset that should be excluded from query

	getImageQuery = "SELECT * FROM images WHERE id NOT IN (SELECT imageID FROM votes WHERE ip = '"+req.ip+"')";

	connection.query(getImageQuery, (error, results, fields)=>{
		// res.json(results);

		//grab a random image from the results:
		var randomIndex = (Math.floor(Math.random() * results.length));
		// res.json(results[randomIndex]);//This will print a random record from the images table
		if(results.length == 0){
			res.render('index', { title: "Cute or not?", msg: "noImages" });
		}else{
			res.render('index', { 
			title: 'Cute or not?' ,
			imageToRender: '/images/'+results[randomIndex].imageUrl,
			imageID: results[randomIndex].id,
			description: results[randomIndex].description
			});
		}
	})
});

router.get('/vote/:voteDirection/:imageID',(req,res,next)=>{
	// res.json(req.params.voteDirection);
	var imageID = req.params.imageID;
	var voteDirection = req.params.voteDirection;
	//Both options below work depending on whether you want to track votes with words or numbers in sequelpro.
	//if voteDirection is varchar, comment out below if/else statement so that voteDirection will be "up" or "down"
	//if voteDirection is int, comment in below if/else statement so that voteDirection will be "1" or "-1"

	// if(voteDirection == 'up'){
	// 	voteDirection = 1;
	// }else{
	// 	voteDirection = -1;
	// }

	//req.ip and voteDirection might be strings hence extra ''
	var insertVoteQuery = "INSERT INTO votes(ip, imageID, voteDirection) VALUES ('"+req.ip+"',"+imageID+",'"+voteDirection+"')"
	// res.send(insertVoteQuery);
	connection.query(insertVoteQuery, (error, results, fields)=>{
		if (error) throw error;
		res.redirect('/?vote=success');
	})
});

router.get('/standings', function(req, res, next) {

  res.render('standings', { title: 'Standings' });
});

router.get('/testQ',(req, res, next)=>{
	// var id1 = [1];
	// var id2 = [3];
	// var query = "SELECT * FROM images WHERE id > ? AND id < ?";
	// ? = 1 and 2
	//if you have a variable above (var id, [id] is that value. If not, you can directly put the number into [id] below. Both work.
	// connection.query(query, [id1, id2], (error, results, fields)=>{
		// res.json(results);
	// })

	// You would want to use something like this for safety (ex: input forms)
	var imageIDVoted = 3;
	var voteDirection = "up";
	var insertQuery = "INSERT INTO votes (ip, imageID, voteDirection) VALUES (?, ?, ?)"
	connection.query(insertQuery, [req.ip, imageIDVoted, voteDirection], (error, results, fields)=>{
		var query = "SELECT * FROM votes";
		connection.query(query, (error, results, fields)=>{
			res.json(results);
		});	
	})
});

//If you want to give option for users to upload their own images
router.get('/uploadImage', (req, res, next)=>{
	res.render('uploadImage', {});
});

router.post('/formSubmit', type, (req, res, next)=>{
	//save the path where the file is at temporarily
	var tmpPath = req.file.path;
	//Set up the target path + the originalname of the file
	var targetPath = 'public/images/'+req.file.originalname;
	//Use fs to read the file at req.file.path then write it to the correct place
	fs.readFile(tmpPath, (error, fileContents)=>{
		//3 arguments of writeFile: where, what, callback
		fs.writeFile(targetPath, fileContents, (error)=>{
			if (error) throw error; //handles read/write erros
			var insertQuery = "INSERT INTO images(imageUrl) VALUE (?)";
			connection.query(insertQuery, [req.file.originalname], (dberror, results, fields)=>{
					if(dberror) throw dberror;//handles sql errors
					res.redirect('/?file="uploaded');
			})
			// res.json("Upload successful")
		})
	})
	// res.json(req.file);
});

module.exports = router;
