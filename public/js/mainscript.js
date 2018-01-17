$(function() {
			var socket = io.connect();
			var $messageForm = $('#sendMessageForm');
			var $messageBox = $('#messageInput');
			var $chat = $('#chat');
			var $nickForm = $('#setNick');
			var $nickError = $('#nickError');
			var $nickBox = $('#nicknameInput');
			var $users = $('#users');
			var $allusers = $("#allusers");
			var $usersinroom = $('#usersinroom');
			var $toggleRoomsB = $('#toggleRooms');
			var $roomsDiv = $('#roomsDiv');
			var $closeTabButton = $('#closeTabButton');
			var $createRoomButton = $('#createRoom');
			var $createRoomForm = $('#createRoomForm');
			var $createRoomInput = $('#createRoomInput');
			var $roomCreate = $('#roomCreate');
			var $roomListUl = $('#roomListUl');

			var $joinARoom = $('#joinARoom');
			var $createARoom = $('#createARoom');
			var $joinOrCreateWrap = $('#joinOrCreateWrap');
			var $joinARoomDiv = $('#joinARoomDiv');
			var $joinARoomForm = $('#joinARoomForm');
			var $joinARoomInput = $('#joinARoomInput');
			var $inRoomDiv = $('#inRoomDivWrap');

			// var questionCountdown = 10;
			// var betweenTimer = 10;
			///var questionnr = 1;

			//$createRoomForm.hide();
			$nickError.hide();

			/***********************************************************
			**Zodra er een naam ingevult is en gesubmit word,
			**word het ingevulde info opgestuurt naar de socket 'newUser'.
			**Als hij er iets terug komt van de socket,
			**word het nickname invoer veld gehide en het scherm om een kamer te maken of joinen laten zien.
			**Als er niets terug komt van de socket betekend dat er iets niet goed is ingevuld of dat de nickname al bestaat.
			**Dan word er een error message aan de gebruiker laten zien.
			************************************************************/
			$nickForm.submit(function(e)
			{
				e.preventDefault();
				socket.emit('newUser', $nickBox.val(), function(data)
					{
						if(data)
						{
							$('#nickWrap').hide();
							$('#joinOrCreateWrap').show();
						}
						else
						{
							$nickError.show();
							$nickError.html('That username is already taken, to long (15 chars max) or you didnt enter anything!');
						}
					});
				$nickBox.val('');
			});

			/************************************************************
			**Als er op "Join Room" knop word gedrukt.
			**Word het joinRoom form laten zien waar de gebruiker de kamer code kan invullen.
			************************************************************/
			$joinARoom.click(function(e)
			{
				e.preventDefault();
				$joinARoomDiv.show();
			});

			/************************************************************
			**Als het 'Join Room' form gesubmit word,
			**word de value opgestuurt naar de switchRoom functie.
			*************************************************************/
			$joinARoomForm.submit(function(e)
			{
				e.preventDefault();
				//alert($joinARoomInput.val());
				switchRoom($joinARoomInput.val());
			});


			/************************************************************
			**Als er op "Create Room" knop word gedrukt.
			**Word de functie makeRoomName aan geroepen
			**Waar een kamer naam gegenereerd word en gereturned word
			**Deze value word opgestuurt naar de socket 'createnemroom'.
			**************************************************************/ 

			$createARoom.click(function(e)
			{
				e.preventDefault();
				$createdRoom = makeRoomName();
				//alert($createdRoom)
				console.log($createdRoom);
				socket.emit('createnewroom', {room_name:$createdRoom});

			});

			/***************************************************************
			**Als 'switchrooms' aangeroepen word krijg hij rooms array mee en de huidige room
			**Maakt de roomlijst leeg waarna de rooms array door gelopen word en opnieuw opgebouwd word.
			**als de roomname gelijk aan de current_room word de class currentRoom aan de listitem gegeven zodat je kan zien in welke room je zit.
			**anders list opbouwen met onclick functions naar de functie switchroom met de value (roomnames)
			*****************************************************************/
				socket.on('switchingRooms', function(nickname, current_room) {
					if(current_room != "Lobby")
					{
						//alert(nickname);
						//alert(current_room);
						$('#RoomNameHead').html('Welcome to Room: '+current_room+'.');
						$joinOrCreateWrap.hide();
						$inRoomDiv.show();
					}
					else
					{
						$('#welcomeName').html(nickname);
					}

			});

			/**************************************************************
			**Zodra er een kamer aangemaakt word word de switchRoom functie aan geroepen met de nieuwe socketroom.
			**Het joinOrCreate scherm word gehide en een title word laten zien met het kammer nummer.
			**Omdat de geene die de kamer maakt ook de host is worden ook gelijk alle quizzes mee gegeven
			**en laten zien in een dropdown menu om een quiz te selecteren.
			***************************************************************/
			socket.on('createdroom', function(rooms, socketroom, madeByNickname, quizzesArray)
			{
				console.log(socketroom);
				console.log(madeByNickname);
				console.log(rooms);
				console.log(socketroom);
				console.log(socketroom.room_name);
				switchRoom(socketroom);
				$joinOrCreateWrap.hide();
				$('#RoomNameHead').html('Welcome to Room: '+socketroom+'.');
				
				console.log(quizzesArray);
				console.log(quizzesArray[0]);

				//Vult de dropdown met de array die je mee krijgt van alle quizzes
				var quizzes = quizzesArray;
				var option = '';
				for (var i=0;i<quizzes.length;i++){
				   option += '<option value="'+ quizzes[i].quizID + '">' + quizzes[i].quizName + '</option>';
				}
				$('#selectQuizDropdown').append(option);

				$('#selectingQuiz').show();
				$inRoomDiv.show();
				

			});

			/**************************************************************
			**Als er op quizConfirm word gedrukt word de value van de meegegeven,
			**in dit geval quizID die op de option staat
			**En deze word geemit naar de functie quizSelected
			***************************************************************/
			$('#quizDropdownConfirm').click(function(e)
			{
				e.preventDefault();
				//alert($('#selectQuizDropdown').val());
				var $selectedQuizID = $('#selectQuizDropdown').val();
				var $selectedQuizName = $("#selectingQuiz option[value='" +$selectedQuizID+ "']").text();
				console.log($selectedQuizName);
				//alert($("#selectingQuiz option[value='" +$selectedQuizID+ "']").text());
				////alert($selectedQuizID);
				//$("#selectingQuiz").html("<h2 id='selectedQuizName'>Selected Quiz: "+$("#selectingQuiz option[value='" +$selectedQuizID+ "']").text()+"</h2>");
				socket.emit('quizSelected', {quizID:$selectedQuizID, quizName:$selectedQuizName});
				//$("#selectingQuiz").hide();
	
			});

			/***************************************************************
			**Door de mee gegeven data (Een Array met alle users in een kamer)
			**word er door de array gelooped en aan alle gebruikers in de kamer
			**laten zien wie er alemaal in de kamer zit.
			****************************************************************/

			/*!!!NOTE!!!!
			Display van de usernames meer responsive maken in de HTML & CSS
			!!!!!NOTE!!!!*/
			socket.on('userinroom', function(data)
			{
				console.log(data);
				console.log(data.data.length);
				console.log(data.data[0]);
				//console.log(data.data[0]);
				//console.log(data.data[0].nickname);
				//console.log(data.data[0].room);
				//console.log(data.data.length);
				var html = '';
				for(i = 0; i < data.data.length; i++)
				{
					console.log(data.data[i]);
					html += data.data[i]+'<br/>';
				}
				$usersinroom.html(html);
				
			});

			/**************************************************************
			**Word aangeroepen zodra de host disconnect.
			**In de data zit de message dat de host de kamer is geleaved.
			**De hostLeftSwitch functie word aangeroepen met 'Lobby' als argument (Alle members terug naar lobby)
			**Het joinOrCreate scherm word laten zien en het inRoom of inGame scherm word weggehaalt.
			***************************************************************/

			/*!!!NOTE!!!!
			Alert vervangen met een Modal
			!!!!!NOTE!!!!*/

			socket.on('hostleftroom', function(data)
			{
				console.log(data);
				//switchRoom('Lobby');
				hostLeftSwitch('Lobby');
				$joinOrCreateWrap.show();
				$inRoomDiv.hide();
				$('#inGameDivWrap').hide();
				alert(data.msg);
			});

			/***************************************************************
			**Word aangeroepen zodra iemand een room probeert te joinen die niet bestaat
			**of als de quiz in de room al begonnen is.
			**Met de error message in de meegegeven data.
			****************************************************************/

			/*!!!NOTE!!!!
			HTML & CSS beter zichtbaar maken.
			!!!!!NOTE!!!!*/
			socket.on('roomDoesntExist', function(data)
			{
				var $roomJoinError = $("#roomJoinError");
				$roomJoinError.html(data.msg);
				console.log(data.msg);
				//$inRoomDiv.hide();
				//$joinOrCreateWrap.show();
			});

			//Array waar alle Questions en bijbehoorende Answers ingepushed worden.
			var QnA = [];

			/***************************************************************
			**Als er een quiz geselect is door de host worden alle Questions en bijbehoorende
			**Antwoorden opgehaalt en in de QnA array gepushed.
			**Alle Members in de kamer krijgen tezien welke quiz geselect is en de host krijgt ook een Start knop
			****************************************************************/
			socket.on('roomQnA', function(data)
			{
				console.log(data.isHost);
				if(data.isHost != "Yes")
				 {
					$("#selectingQuiz").html("<h2 id='selectedQuizName'>Selected Quiz: "+data.quizName+"</h2>");
					$("#selectingQuiz").show(); //Showed de div voor de non host users
				 }
				else
				 {
				 	$("#selectingQuiz").html("<h2 id='selectedQuizName'>Selected Quiz: "+data.quizName+"</h2><button id='startQuizButton'>Start Quiz</button>");
				 	$("#selectingQuiz").show(); //Showed de div voor de host met start button
				 }

				QnA.push(data);
				console.log(QnA);
			});

			//Document on inplaats van normale click omdat het een dynamic gemaakte button is
			//Normale onclick werkt niet op dynamic gemaakte buttons.
			$(document).on('click', '#startQuizButton', function(){
				var QnALeng = QnA.length;
			    socket.emit('startingQuiz', {QnALeng: QnALeng});
			 });

			//Nummer van de question waar de quiz op het moment is.
			var $currentQuestionNr;

			/***************************************************************
			**Als de quiz start is gedrukt word deze socket aangeroepen.
			**Het inRoom scherm word weg gehaalt en inGame scherm word laten zien.
			**De timer word gestart en de bovenstaande currentQuestionNr word aangepast.
			**Vervolgens word het inGame scherm opgevult met de eerste vraag en antwoorden.
			****************************************************************/
			socket.on('quizStarting', function(data)
			{
				$('#inRoomDivWrap').hide();
				$('#inGameDivWrap').show();
				socket.emit('startTimer');

				console.log("//////////////////"+data.currentQ+"//////////////////");
				$currentQuestionNr = data.currentQ;
				console.log("quizStarting Qnr: "+$currentQuestionNr);
				console.log("//////////////////"+data.currentQ+"//////////////////");

				//console.log(QnA);
				//console.log(QnA.length);
				/// console.log("qID: "+QnA[data.currentQ].data.questionID+" Q: "+QnA[data.currentQ].data.question);
				/// console.log(QnA[data.currentQ].data.answers.length);
				/// console.log("aID: "+QnA[data.currentQ].data.answers[0].answerID+" A: "+QnA[data.currentQ].data.answers[0].answer);
				/// console.log("aID: "+QnA[data.currentQ].data.answers[1].answerID+" A: "+QnA[data.currentQ].data.answers[1].answer);
				/// console.log("aID: "+QnA[data.currentQ].data.answers[2].answerID+" A: "+QnA[data.currentQ].data.answers[2].answer);
				/// console.log("aID: "+QnA[data.currentQ].data.answers[3].answerID+" A: "+QnA[data.currentQ].data.answers[3].answer);
				/// console.log(QnA[data.currentQ].data.questionIMG);


				$('#theQuestion').text(QnA[data.currentQ].data.question);
				$('#questionDiv').css('background-image', 'url("public/imgs/quiz/'+QnA[data.currentQ].data.questionIMG+'")');

				$('#answerOne').attr('value', QnA[data.currentQ].data.answers[0].answerID);
				$('#answerOne').text(QnA[data.currentQ].data.answers[0].answer);

				$('#answerTwo').attr('value', QnA[data.currentQ].data.answers[1].answerID);
				$('#answerTwo').text(QnA[data.currentQ].data.answers[1].answer);

				$('#answerThree').attr('value', QnA[data.currentQ].data.answers[2].answerID);
				$('#answerThree').text(QnA[data.currentQ].data.answers[2].answer);

				$('#answerFour').attr('value', QnA[data.currentQ].data.answers[3].answerID);
				$('#answerFour').text(QnA[data.currentQ].data.answers[3].answer);
				//nextQuestion();
			});


	/***************************************************************
	**Zodra er op een van de 4 antwoorden gedrukt word worden alle 4 de buttons gedisabled.
	**vervolgens word er aan de socket laten weten dat er een antwoord is gegeven.
	****************************************************************/
	$('#answerOne, #answerTwo, #answerThree, #answerFour').click(function(e) { 
		e.preventDefault();
		var $pressedID = $(this).attr('value');
		var $QnALeng = QnA.length;
		$('#answerOne, #answerTwo, #answerThree, #answerFour').attr("disabled", true);
		//alert($QnALeng);
		socket.emit('answerPressed', $pressedID, $QnALeng, $currentQuestionNr);
	});

	/***************************************************************
	**Zodra hij tijd is voor een nieuwe vraag word deze socket aangeroepen.
	**De currentQuestionNr word aangepast en word het inGame scherm
	**opnieuw ingevult met de nieuwe gegevens van de volgende vraag
	****************************************************************/
	socket.on("nextQuestion", function(data)
	{
		$currentQuestionNr = data.data;

		$('#answerOne, #answerTwo, #answerThree, #answerFour').attr("disabled", false);
		$('#theQuestion').text(QnA[data.data].data.question);
		$('#questionDiv').css('background-image', 'url("public/imgs/quiz/'+QnA[data.data].data.questionIMG+'")');

		$('#answerOne').attr('value', QnA[data.data].data.answers[0].answerID);
		$('#answerOne').text(QnA[data.data].data.answers[0].answer);

		$('#answerTwo').attr('value', QnA[data.data].data.answers[1].answerID);
		$('#answerTwo').text(QnA[data.data].data.answers[1].answer);

		$('#answerThree').attr('value', QnA[data.data].data.answers[2].answerID);
		$('#answerThree').text(QnA[data.data].data.answers[2].answer);

		$('#answerFour').attr('value', QnA[data.data].data.answers[3].answerID);
		$('#answerFour').text(QnA[data.data].data.answers[3].answer);
	});

	/***************************************************************
	**Zodra de quiz klaar is word deze socket aangeroepen.
	**inGame scherm word gehide en de scores worden laten zien.
	**Er word over de data(Scores met namen) heen gelooped en laten zien aan de rest van de kamer.
	****************************************************************/

	/*!!!NOTE!!!!
	!! De scores sorteren van hoog naar laag.
	!!!!!NOTE!!!!*/

	socket.on('quizDone', function(data)
	{
	//alert("QUIZ DONE");
		$('#answerOne, #answerTwo, #answerThree, #answerFour').attr("disabled", false);
		$("#inGameDivWrap").hide();
		$("#scoreboard").show();
		console.log(data.data);
		console.log(Object.keys(data.data));
		console.log(Object.keys(data.data).length);
		console.log(data.data["tester"]);

		var dataKeys = Object.keys(data.data);
		var dataLength = Object.keys(data.data).length;
		var $scores = $("#scores");
		var html = '';
			for(var i = 0; i < dataLength; i++)
			{
			 console.log(data.data[dataKeys[i]]);
			 html += data.data[dataKeys[i]].name+': '+data.data[dataKeys[i]].score+'<br/>';
			}
			$scores.html(html);

	});


	/***************************************************************
	**De timer loopt op de server side, de tijd word door gegeven via de data.
	**Het aantal seconden word laten zien in de timer bar.
	**Per seconden word het aantal aangepast en loopt de timerbar leeg.
	**Zodra de timer afgelopen is word de between timer aangeroepen
	****************************************************************/

socket.on('questionTimer', function(data)
{
			// function theTimer()
			// {
			    $("#timerBarTime").html(data.countdown + " Seconds Remaining!");//
			   	console.log("timer: "+data.countdown);
    			switch(data.countdown)
			   	{
			   	case 0:
			   	$("#timerBar").css({"width": "0%", "background": "rgba(82, 208, 83, 0.5)"});
			   	$('#betweenQuestions').css({"display": "block"});
			   	//socket.emit('resetTimers');
			   	socket.emit('startBetweenTimer', $currentQuestionNr);
			   	break;

			   	case 1:
			    $("#timerBar").css({"width": "10%", "background": "#52d053"});
			    break;

			    case 2:
			    $("#timerBar").css({"width": "20%", "background": "rgba(82, 208, 83, 0.5)"});
			    break;

			    case 3:
			    $("#timerBar").css({"width": "30%", "background": "#52d053"});
			    break;

			    case 4:
			    $("#timerBar").css({"width": "40%", "background": "rgba(82, 208, 83, 0.5)"});
			    break;

			    case 5:
			    $("#timerBar").css({"width": "50%"});
			    break;

			    case 6:
			    $("#timerBar").css({"width": "60%"});
			    break;

			    case 7:
			    $("#timerBar").css({"width": "70%"});
			    break;

			    case 8:
			    $("#timerBar").css({"width": "80%"});
			    break;

			    case 9:
			    $("#timerBar").css({"width": "90%"});
			    break;

			    case 10:
			    $("#timerBar").css({"width": "100%"});
			    break;

			    default:
			}
});

	/***************************************************************
	**betweentimer loop op de server side en word aangeroepen zodra
	**de questiontimer afgelopen is of iedereen antwoord heeft gegeven.
	**Zodra de betweentimer afgelopen is krijgt de host een knop on de next question te starten
	****************************************************************/
	/*!!!NOTE!!!!
	!! BetweenTimer display en timer beter uit laten zien.
	!!!!!NOTE!!!!*/
	
	socket.on('betweenTimer', function(data)
	{
	    $("#timebeforenext").html(data.betweencountdown + " seconds before the next Question!");
	    console.log("BetweenTimer: "+data.betweencountdown);

	    switch(data.betweencountdown)
				   	{
				   	case 0:
				   	$("#Timer").html("Done!");
				   	$("#timebeforenext").html("Next Question is ready, waiting for host to start!")

				   	break;

				   	 default:
			}
	});

	/***************************************************************
	**Zodra iedereen geantwoord heeft.
	**Betweenquestions display word laten zien en betweentimer word gestard
	****************************************************************/
	socket.on('allHaveAnswered', function()
	{
		$('#betweenQuestions').css({"display": "block"});
					   	//socket.emit('resetTimers');
		socket.emit('startBetweenTimer', $currentQuestionNr);
	});

	/***************************************************************
	**Zodra de between timer afgelopen is word de question nummer mee gegeven
	**en opgeslagen in timeUpNextQNr.
	**Er word gekeken of degene host is zoja word de next question knop laten zien.
	****************************************************************/
	var $timeUpNextQNr;
	var $betweenIsHost = false;
	socket.on('TimeOutNextQ', function(data)
	{
		$timeUpNextQNr = data.timeUpNextQ;
		$betweenIsHost = data.isTheHost;
		console.log("Current Question NR: "+$timeUpNextQNr);
		console.log("betweenIsHost: "+$betweenIsHost);

		if($betweenIsHost === true)
		{
			$('#toNextQuestionButton').css({"display": "block"});
		}

	});

	/***************************************************************
	**Zodra er op toNextQuestionButton gedrukt word
	**word de timerbar weer geupdate naar 10 seconden en gevult.
	**telt 1 bij de question nummer en submit deze naar toNextQuestion
	**De between timer word gecleared en reset en timer word weer gestart.
	****************************************************************/
	$('#toNextQuestionButton').click(function() {
		$("#timerBarTime").html("10 Seconds Remaining!");
		$("#timerBar").css({"width": "100%"});
		var $QnALeng = QnA.length;
		//$currentQuest++
		//alert($currentQuest);
		$timeUpNextQNr++;
		console.log("Next Question NR: "+$timeUpNextQNr);
		//alert($QnALeng);
		//alert($currentQuest)
		//alert($currentQuest++);
		socket.emit('toNextQuestion', $QnALeng, $timeUpNextQNr);
			socket.emit('clearBetween');
		socket.emit('startTimer');
	});

	/***************************************************************
	**Timers worden gereset en betweentimer display en knop worden gehide
	****************************************************************/
	socket.on('clearingBetween', function()
	{
		socket.emit('resetTimers');
		$('#betweenQuestions').css({"display": "none"});
		$('#toNextQuestionButton').css({"display": "none"});
	});

/***************************************************************
**Timers worden gereset
****************************************************************/
socket.on('resetTimer', function()
{
	socket.emit('resetTimers');
})


		}); //END FUNCTION


/***************************************************************
**Als er room geswitched word.
****************************************************************/
		function switchRoom(room)
		{
			var socket = io.connect();
			socket.emit('switchRoom', room);
		}

/***************************************************************
**Zodra de host leaved word iedereen terug naar de lobby gestuurt
****************************************************************/
		function hostLeftSwitch(backLobby)
		{
			var socket = io.connect();
			socket.emit('hostLeftSwitch', backLobby);
		}

/***************************************************************
**Zodra er op createRoom gedrukt word word er een roomnaam gegenereert en gereturned.
****************************************************************/
		function makeRoomName()
		{
		    var roomName = "";
			var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

		    for( var i=0; i < 8; i++ )
		    {
		        roomName += possible.charAt(Math.floor(Math.random() * possible.length));
		    }
		    //console.log(roomName);
		    return roomName;
		}