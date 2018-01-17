var mysql = require("mysql");
var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	config = require('./config/config.js'),
	
	//Array voor de nicknames
	nicks = [],
	//Oject array voor alle Rooms
    rooms = {
		'Lobby':{
			host: 'Server',
			name: 'Lobby',
			users: {

			}
		}
	};
	io.set('log level', 1); // reduce logging
	var allHaveAnswered = false;

	//console.log(rooms);




//Connection info voor de database.
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "nodeconnect"
});

/***************************************************************
Verbinding maken met de database.
Als er een error is word die gethrowed naar de console.
****************************************************************/
con.connect(function(err){
  if(!err)
  {
    console.log('Connection established');
  }
  else
  {
    throw err;
  }
});

//Luistert naar alle connecties naar localhost:3000
server.listen(3000);

//app.use(express.static('public'));
app.use("/public", express.static(__dirname + '/public'));

//Haald de pagina op die hij moet laten zien, dit geval index.html
app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});


//Als er geconnect word vanaf de browser
io.sockets.on('connection', function(socket){


/***************************************************************
**Word aangeroepen zodra nickForm gesubmit word (Line #44)
**Als index van meegeven data (Mee gestuurde data vanuit nickForm) in nickname array niet gelijk is aan -1 (Bestaat de nickname al)
**of data is leeg of groter dan 15 karakters lang, is callback false
**Anders is callback true (Bestaat de nickname nog niet)
**De socket zijn nickname word gelijk gezet aan de data.
**De nickname word in de nicks array gezet zodat hij niet nog een keer gebruikt kan word
**De socket room word naar Lobby gezet en gejoined.
**In de Rooms Object Array word in het Lobby object users een nieuw Object aan gemaakt met de nickname
**In dit object heeft de title van de nickname en heeft de nickname, socketid en role van de user.
**Waarna switchingRooms word aangeroepen met de nickname en Lobby als room
***************************************************************/

socket.on('newUser', function(data, callback)
	{
		if(nicks.indexOf(data) != -1 || data == "" || data.length > 15)
		{
			console.log(data.length);
			callback(false);
		}
		else
		{
			callback(true);
			socket.nickname = data;
			nicks.push(socket.nickname);

			socket.room = 'Lobby';
			socket.join('Lobby');

			rooms['Lobby'].users[socket.nickname] = {
				socketid: socket.id,
				name: socket.nickname,
				role: 'Member',
			};
			console.log(rooms);
			console.log(nicks);
			socket.emit('switchingRooms', socket.nickname, 'Lobby');

		}

	});


/***************************************************************
**Zodra er gedisconnect word van word deze socket aangeroepen.
**Als er nog geen socket.nickname is gegeven (Gebruiker heeft nog geen naam ingevult).
**Word er gelijk gereturned want er hoeft niets gedaan te worden.
**Er word door de nicks array heen gelooped en er word gekeken of de user die disconnect de role van Host of Member heeft.
**Als de gebruiker de role van Host had betekent dat hij de kamer heeft gemaakt
**en de functie "hostleftroom" word gebroadcast naar alle deelnemers van die kamer, en zijn naam word uit de socket en nicks array verwijderd.
**Als de gebruiker de role van Member heeft is hij de kamer gejoined nadat hij gemaakt was.
**Zodra iemand met deze role disconnect word zijn naam uit de nicks array en de kamer gehaalt
**en de functie updateInRoomUsernames word aangeroepen om de rest van de deelnemers het te laten weten
****************************************************************/

socket.on('disconnect', function(data)
	{
		if(!socket.nickname)
		{
			return;
		}

			for(var i = 0; i < nicks.length; i++)
			{
				if(nicks[i] === socket.nickname && rooms[socket.room].users[socket.nickname].role == "Host")
				{
					//console.log("!!!!!!HOST LEFT!!!!!!");
					delete rooms[socket.room].users[socket.nickname];
					nicks.splice(i, 1);
					socket.broadcast.to(socket.room).emit('hostleftroom', {msg: 'Host has left the room'});
				}
			}

			//console.log("!!!!!Nickname DisconnectLoop!!!!!");
			for(var i = 0; i < nicks.length; i++)
			{
				if(nicks[i] === socket.nickname && rooms[socket.room].users[socket.nickname].role == "Member")
				{
					nicks.splice(i, 1);
					delete rooms[socket.room].users[socket.nickname];
					updateInRoomUsernames(socket.room);
					//console.log(nicks);
				}
			}
			//console.log("!!!!!Nickname DisconnectLoop!!!!!");

		// console.log(rooms);
		// console.log(nicks);
	});

/***************************************************************
**Word aangeroepen alsde host leaved word iedereen terug gegooit
**naar de lobby
****************************************************************/
socket.on('hostLeftSwitch', function(backLobby)
{
	socket.leave(socket.room);
	delete rooms[socket.room];
	socket.room = 'Lobby';
	socket.join('Lobby');

	rooms['Lobby'].users[socket.nickname] = {
				socketid: socket.id,
				name: socket.nickname,
				role: 'Member'
	};
	//console.log("////hostLeftSwitch////");
	//console.log(rooms);
	//console.log("////hostLeftSwitch////");
});


/***************************************************************
**Zodra er op de createRoom knop is gedrukt word er een naam gegenereert
**en die word hier mee gegeven om een nieuwe kamer te maken
****************************************************************/
socket.on('createnewroom',function(createdroom)
	{
		console.log("CreatedRoom: "+createdroom.room_name);
		rooms[createdroom.room_name] = {
				host: socket.nickname,
				name: createdroom.room_name,
				quizSelected: "None",
				quizQuestons: "",
				quizQnA: {

						 },
				started: false,
				answered: 0,
				users: {

					}
				};

		//console.log(rooms);
		socket.emit('createdroom', rooms, createdroom.room_name, socket.nickname, quizzesArray);
	});



/***************************************************************
**Word aangeroepen zodra iemand een kamer probeert te joinen.
**Eerst word er over alle rooms gelooped om te kijken of hij bestaat of al begonnen is.
**Als hij bestaat en niet gestart is word degene die probeert te joinen
**toegevoegd in het rooms object, maar eerst word er gecontroleerd of
**hij de kamer aangemaakt heeft of niet.
****************************************************************/
socket.on('switchRoom', function(newroom)
	{
		//console.log("LINE 140: "+newroom);

		//IF CHECK, IF ROOM EXSISTS
	var allRoomsLength = Object.keys(rooms).length;
	var allRooms = Object.keys(rooms);
	var roomExist = false;
	console.log(allRooms);
	//console.log(allRooms[0]);
		for(var i = 0; i < allRoomsLength; i++)
		{
			if(allRooms[i] === newroom)
			{
				roomExist = true;
			}
		}
			//console.log(allRooms[i])
			if(roomExist === true && rooms[newroom].started === false)
			{

			delete rooms[socket.room].users[socket.nickname];

			socket.leave(socket.room);
			socket.join(newroom);
			socket.room = newroom;

			if(rooms[newroom].host === socket.nickname)
			{
			rooms[newroom].users[socket.nickname] = {
					socketid: socket.id,
					name: socket.nickname,
					role: 'Host',
					score: 0,
					answered: false,
					answers: []
				};
			}
			else
			{
			rooms[newroom].users[socket.nickname] = {
					socketid: socket.id,
					name: socket.nickname,
					role: 'Member',
					score: 0,
					answered: false,
					answers: []
				};
			}


			socket.emit('switchingRooms', socket.nickname, newroom);

			console.log(rooms[newroom]);

	updateInRoomUsernames(newroom);
	}
	else
	{
		console.log("ROOM DOES NOT EXSIST");
		socket.emit('roomDoesntExist', {msg: 'Room does not Exist or has already started'});
	}

});


	/***************************************************************
	**Krijgt de room roomnaam mee en gebruikt het rooms object met die naam
	**om over alle usernames heen te loopen en aan iedereen te laten zien
	****************************************************************/
	function updateInRoomUsernames(theRoom)
	{
		//console.log("///////////////////updateInRoomUsernames//////////////////////");
		//console.log(rooms[theRoom].users);

		var roomsUsersLength = Object.keys(rooms[theRoom].users).length;
		var roomsUsers = Object.keys(rooms[theRoom].users);
		console.log(roomsUsersLength);
		//console.log(roomsUsers);
		//console.log(roomsUsers[0]);
		for(var i = 0; i < roomsUsersLength; i++)
		{
			console.log(roomsUsers[i]);
		}
			
		socket.emit('userinroom', {data: roomsUsers});
		socket.broadcast.to(theRoom).emit('userinroom', {data: roomsUsers});
		//console.log("///////////////////updateInRoomUsernames//////////////////////");
	}


	/***************************************************************
	**Als er een quiz geselect word door de host krijgt hij quiz naam en ID mee.
	**De room zijn status word naar started gezet zodat er niemand meer kan joinen.
	**Alle questions worden opgehaald met het meegegeven quizID.
	**Waarna er overheen word gelooped en in het questionObjects opgeslagen
	**met alle data en een leeg answers object voor de antwoorden.
	**Waarna getAnswers word aangeroepen om het answers object in te vullen.
	****************************************************************/
	socket.on('quizSelected', function(data)
	{
		//console.log("///////SELECTED QUIZID////////");
		var selectedQuizID = data.quizID;
		var selectedQuizName = data.quizName;
		//console.log(selectedQuizID);
		//console.log(selectedQuizName);
		//console.log("///////SELECTED QUIZID////////");
		var questionObjects = {};
		var questionResults;
		var answerResults;
		var questionsArray = [];
		rooms[socket.room].started = true;

	   var questionsQuery = con.query(
	  'SELECT * FROM quizquestions WHERE idQuiz = '+selectedQuizID+'', function(err, questionResult, fields){
	    if (err) throw err;

	for (var i in questionResult) 
	{
	   //console.log(questionResult[i]);
	    questionObjects[socket.room+"questionNr"+i] = {
						questionID: questionResult[i].questionID,
						question: questionResult[i].question,
						questionIMG: questionResult[i].questionIMG,
						answers: {

					}
				};
			//console.log(questionObjects);
	}
	getAnswers(questionResult, questionObjects, selectedQuizName);
	//console.log(questionsObject);
	  }); 

	});


	/***************************************************************
	**Per question worden er answers opgehaald en fuseQnA word aangeroepen.
	****************************************************************/
	function getAnswers(questionResults, questionObjects, selectedQuizName)
	{
		var qObjectsKeys = Object.keys(questionObjects);
		var qObjectsLength = Object.keys(questionObjects).length;
		var questionNr = 0;
		//console.log(questionResults.length);
		//console.log(questionObjects);
		//console.log(questionObjects[socket.room+"questionNr0"]);

		for(var a = 0; a < questionResults.length; a++)
		{

	   var questionsQuery = con.query(
	  'SELECT * FROM quizanswers WHERE idQuestion = '+questionObjects[socket.room+"questionNr"+a].questionID+'', function(err, answerResult, fields){
	    if (err) throw err;
	    
	  fuseQnA(questionResults, answerResult, questionObjects, questionNr, selectedQuizName);
	  questionNr++;
		});
		}// END FOR LOOP
	}// END FUNCTION


	/***************************************************************
	**Answers worden bij de bijbehoordende question object gefused zodat ze bij elkaar zitten.
	**En in het room object vast gezet.
	****************************************************************/
	function fuseQnA(questionResults, answerResults, questionObjects, questionNr, selectedQuizName)
	{
		var qObjectsKeys = Object.keys(questionObjects);
		var qObjectsLength = Object.keys(questionObjects).length;
		//console.log("~~~~~FUSE QUESTIONS~~~~~");
		////////////console.log(Object.keys(questionObjects).length);
		////////////console.log(Object.keys(questionObjects));
		//console.log(questionObjects[qObjectsKeys[questionNr]]);
		////////////console.log(questionResults);
		//console.log("~~~~~FUSE QUESTIONS~~~~~");

		//console.log("~~~~~FUSE ANSWERS~~~~~");
		//console.log(answerResults);
		////////////console.log(answerResults[0]);
		//console.log("~~~~~FUSE ANSWERS~~~~~");
		//console.log(questionNr);
		questionObjects[qObjectsKeys[questionNr]].answers = answerResults;
		//console.log(questionObjects[qObjectsKeys[questionNr]]);

		rooms[socket.room].quizQnA = questionObjects[qObjectsKeys[questionNr]];
		//console.log(rooms[socket.room]);


		socket.emit('roomQnA', {data: rooms[socket.room].quizQnA, quizName: selectedQuizName, isHost: "Yes"});
		socket.broadcast.to(socket.room).emit('roomQnA', {data: rooms[socket.room].quizQnA, quizName: selectedQuizName, isHost: "No"});
	}

	/***************************************************************
	**Het aantal questions word meegegeven en opgeslagen
	**currentQuestion word op 0 gezet (want 0 in array is het eerste result)
	**en word naar iedereen gestuurd
	****************************************************************/
	var currentQuest = 0;
	socket.on('startingQuiz', function(questionAmounts)
	{
		//console.log('!!!!!!!STARTING QUIZ!!!!!!!!');
		var questionAmount = questionAmounts.QnALeng;
		//console.log(questionAmount);
		rooms[socket.room].started = true;

		var currentQ = 0;

		socket.emit('quizStarting', {currentQ: currentQ});
		socket.broadcast.to(socket.room).emit('quizStarting', {currentQ: currentQ});
		//socket.emit('questionTimer');
		//socket.broadcast.to(socket.room).emit('questionTimer');
	});


/***************************************************************
**Als er op een van de answers gedrukt word door een van de deelnemers
**word het ID van het antwoord, de lengte van QnA object en currentQuestion mee gegeven.
**Het ID word opgezocht in de database en gecontroleerd of het antwoord goed is of niet.
**Als het antwoord goed is word er +1 bij de gebruikers score getelt.
**Bij iedereen word als er op een antwoord gedrukt is hun "answered" status op true gezet om bij te houden. 
****************************************************************/
	socket.on('answerPressed', function(answerPressedID, QnALeng, currentQuestionNr)
	{

	//console.log("AnswerID: "+answerPressedID+" Made by: "+socket.nickname);
	//rooms[socket.room].users[socket.nickname].answered = true;
	//rooms[socket.room].users[socket.nickname].answers.push(answerPressedID);
	//console.log("ANSWERPRESSED QAMOUNT:"+ QnALeng);

	var answerQuery = con.query(
	  'SELECT * FROM quizanswers WHERE answerID = '+answerPressedID+'', function(err, answerCorrect, fields){
	    if (err) throw err;
	    //console.log(answerCorrect[0].isTrue);
	    var userCurrentScore = rooms[socket.room].users[socket.nickname].score;
	    //console.log(userCurrentScore);
	     if(answerCorrect[0].isTrue === 1)
	     {
	     	userCurrentScore++;
	     	rooms[socket.room].users[socket.nickname].score = userCurrentScore;
	     	rooms[socket.room].users[socket.nickname].answered = true;
	     	rooms[socket.room].users[socket.nickname].answers.push(answerPressedID);
	     	//console.log("QuestionNR:"+currentQuestionNr);
	     	//console.log(socket.nickname+" Has Answered: "+rooms[socket.room].users[socket.nickname].answered+" In Room:"+rooms[socket.room].name);
	     	//console.log(socket.nickname+" Answer was correct and his current score is "+userCurrentScore);
	     	allAnsweredCheck(QnALeng, currentQuestionNr);
	     }
	     else
	     {
	     	rooms[socket.room].users[socket.nickname].answered = true;
	     	rooms[socket.room].users[socket.nickname].answers.push(answerPressedID);
	     	//console.log("QuestionNR:"+currentQuestionNr);
	     	//console.log(socket.nickname+" Has Answered: "+rooms[socket.room].users[socket.nickname].answered+" In Room:"+rooms[socket.room].name);
	     	//console.log(socket.nickname+" Answer was incorrect and his current score is "+userCurrentScore);
	     	allAnsweredCheck(QnALeng, currentQuestionNr);
	     }
	});

	});

	/***************************************************************
	**Controleren of iedereen in de room geantwoord heeft.
	**Zo ja word allHaveAnswered naar true gezet en de volgende socket aangeroepen.
	****************************************************************/

	function allAnsweredCheck(QnALeng, currentQuestionNr)
	{
		var roomUsers = rooms[socket.room].users;
		var roomUsersKeys = Object.keys(roomUsers);
		var confirmedAnswers = 0;
		//console.log("!!!!!!!!!!!!CHECK!!!!!!!!!!!!!");
		//console.log(roomUsersKeys.length);
		//console.log(roomUsersKeys[0]);
		for(var i = 0; i < roomUsersKeys.length; i++)
		{
			//console.log(rooms[socket.room].users[roomUsersKeys[i]].answered);
			if(rooms[socket.room].users[roomUsersKeys[i]].answered === true)
			{
				confirmedAnswers++;
				//console.log("Confirmed Answers: "+confirmedAnswers);
			}
		}

		if(roomUsersKeys.length === confirmedAnswers)
		{
			//console.log("ALL HAVE ANSWERED!");
			//currentQuestionNr++
			//console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
			//console.log("currentQuestionNr: "+currentQuestionNr);
			//console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
			// socket.emit('resetTimer');
			// socket.broadcast.to(socket.room).emit('resetTimer');
			// nextQuestion(QnALeng, currentQuestionNr);
			allHaveAnswered = true;
			socket.emit('allHaveAnswered');
			socket.broadcast.to(socket.room).emit('allHaveAnswered');
		}
	}


	/***************************************************************
	**Zodra je naar de volgende vraag gaat word currentQuestionNr +1 gedaan
	**en answered word terug naar false gezet bij iedereen.
	**Als currentQuestionNr niet gelijk is aan QnALeng naar de volgende vraag.
	**Zo wel is de quiz over en word het scoreboard laten zien.
	****************************************************************/
	function nextQuestion(QnALeng, currentQuestionNr)
	{
		currentQuestionNr++;
		allHaveAnswered = false;
		currentQuest = currentQuestionNr;
	    //console.log("////////CURRENTQ////////"+currentQuestionNr);
		var roomUsers = rooms[socket.room].users;
		var roomUsersKeys = Object.keys(roomUsers);


		for(var i = 0; i < roomUsersKeys.length; i++)
			{
				rooms[socket.room].users[roomUsersKeys[i]].answered = false;
			}

		//console.log("*****************NEXTQUESTION*****************");
		//console.log("currentQuestionNr: "+currentQuestionNr);
		//console.log("questionAmount: "+QnALeng);
		//console.log("*****************NEXTQUESTION*****************");
		if(currentQuestionNr !== QnALeng)
		{
			//console.log("NEXTQUESTION");
			socket.emit('nextQuestion', {data: currentQuestionNr});
			socket.broadcast.to(socket.room).emit('nextQuestion', {data: currentQuestionNr});
		}
		else
		{
			//console.log("!!!QUIZZZOV0R!!!");
			var scoreBoardArray = {};
			for(var i = 0; i < roomUsersKeys.length; i++)
			{
				//console.log("!!!QUIZZZOV0R LOOP!!!");
				scoreBoardArray[rooms[socket.room].users[roomUsersKeys[i]].name] = {
					"name": rooms[socket.room].users[roomUsersKeys[i]].name,
					"score": rooms[socket.room].users[roomUsersKeys[i]].score
				};
				//console.log(scoreBoardArray);
				//console.log("!!!QUIZZZOV0R LOOP!!!");
			}
			socket.emit('quizDone', {data: scoreBoardArray});
			socket.broadcast.to(socket.room).emit('quizDone', {data: scoreBoardArray});
		}

}



/***************************************************************
**Timer word gestart en om de seconden naar iedereen gestuurt.
**Als de countdown op 0 is of als iedereen geanswered heeft word hij stop gezet.
****************************************************************/
var countdown = 10;
var betweencountdown = 10;


socket.on('startTimer', function(data){
	var startTimer = setInterval(function() {  
		countdown--;
		//console.log("Countdown: "+countdown);
		socket.emit('questionTimer', { countdown: countdown });
		socket.broadcast.to(socket.room).emit('questionTimer', { countdown: countdown });
		//socket.emit('playingQuiz');
		//socket.broadcast.to(socket.room).emit('playingQuiz');

		if(countdown === 0 || allHaveAnswered === true)
		{
			clearInterval(startTimer);
			//console.log(socket.id+" !!TIMER DONE!!");
		}

	}, 1000);
});

/***************************************************************
**Alle timers worden gereset en laat het aan iedereen laten weten.
****************************************************************/
socket.on('resetTimers', function (data) {
  	//clearInterval(startTimer);
  	//console.log("RESETING TIMERS");
    countdown = 10;
    betweencountdown = 10;

    socket.emit('timer', { countdown: countdown });
    socket.broadcast.to(socket.room).emit('timer', { countdown: countdown });
    socket.emit('betweenTimer', { betweencountdown: betweencountdown });
    socket.broadcast.to(socket.room).emit('betweenTimer', { betweencountdown: betweencountdown });
  });

/***************************************************************
**Reset de BetweenTimer en laat iedereen het weten
****************************************************************/
socket.on('resetBetweenTimer', function (data) {
  	//clearInterval(startTimer);
    betweencountdown = 10;

    socket.emit('betweenTimer', { betweencountdown: betweencountdown });
    socket.broadcast.to(socket.room).emit('betweenTimer', { betweencountdown: betweencountdown });
  });

/***************************************************************
**BetweenTimer word gestart en om de seconden naar iedereen gestuurt.
**Als de countdown op 0 word er gecontroleerd of de gebruiker
**de Host is zoja krijgen zij de nextQuestion knop tezien.
****************************************************************/
socket.on('startBetweenTimer', function(data){
  	var betweenTimer = setInterval(function() {  
	betweencountdown--;
	//console.log("Betweencountdown: "+betweencountdown);
	//console.log("CurrentQuestion: "+data);
	socket.emit('betweenTimer', { betweencountdown: betweencountdown});
	socket.broadcast.to(socket.room).emit('betweenTimer', { betweencountdown: betweencountdown});

	if(betweencountdown <= 0)
	  {
	  	clearInterval(betweenTimer);
	  	//console.log(socket.id+" !!TIMER DONE!!");
	  	var timeUpNextQ = currentQuest;
	  	var isTheHost = false;


	  	for(var i = 0; i < nicks.length; i++)
			{
				if(nicks[i] === socket.nickname && rooms[socket.room].users[socket.nickname].role == "Host")
				{
					isTheHost = true;
					//console.log(socket.nickname+" is the host: "+isTheHost);
					socket.emit('TimeOutNextQ', {timeUpNextQ: timeUpNextQ, isTheHost: isTheHost});
				  	//socket.broadcast.to(socket.room).emit('TimeOutNextQ', {timeUpNextQ: timeUpNextQ, isTheHost: isTheHost});
				}
				else
				{
					isTheHost = false;
					socket.emit('TimeOutNextQ', {timeUpNextQ: timeUpNextQ, isTheHost: isTheHost});
				}
			}

	  	//socket.emit('TimeOutNextQ', {timeUpNextQ: timeUpNextQ, isTheHost: isTheHost});
	  	//socket.broadcast.to(socket.room).emit('TimeOutNextQ', {timeUpNextQ: timeUpNextQ, isTheHost: isTheHost});
	  }

	}, 1000);
 });


/***************************************************************
**Om de betweenTimer display weg te halen bij iedereen.
****************************************************************/
  socket.on('clearBetween', function()
  {
    socket.emit('clearingBetween');
    socket.broadcast.to(socket.room).emit('clearingBetween');
  });







socket.on('timesUp', function()
{

});

//socket.on('betweenQuestions', function()
//{
//socket.emit('betweenTimer');
//socket.broadcast.to(socket.room).emit('betweenTimer');
//});

socket.on('toNextQuestion', function(QnALeng, timeUpNextQNr)
{
//socket.emit('resetTimer');
//socket.broadcast.to(socket.room).emit('resetTimer');

timeUpNextQNr--;

 nextQuestion(QnALeng, timeUpNextQNr);
});

//socket.on('nextQuestionTimer', function()
//{
//socket.emit('questionTimer');
//socket.broadcast.to(socket.room).emit('questionTimer');
//});


/***************************************************************
**Haalt alle quizzes op zodat de host er een kan selecteren
****************************************************************/
allQuizzes();

var quizzesArray = [];

function allQuizzes()
{
   var query = con.query(
  'SELECT * FROM quiz', function(err, result, fields){
    if (err) throw err;

    //console.log('result: ', result);

    for (var i = 0; i < result.length; i++) 
    {
    //console.log(result[i].quizID);
    //console.log(result[i].quizName);
    quizzesArray.push(result[i]);
    //console.log(quizzesArray);

    //quizID = result[i].quizID;
    //console.log("quizID in Query "+quizID);
    }
    //getQuestions(quizID); 
  }); 
}



}); //END CONNECTION
