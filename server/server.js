var http = require('http');
var fs = require('fs');
var lodash = require('lodash');

//----------------------------------------------------------------------------------------//

var allCards = require('../entities/cardEntities.js').allCards;
var GenerateDeck = require('../entities/cardEntities.js').GenerateDeck;
var distributeCards = require('./serverUtilities.js').server.distributeCards;
var DiscardPile = require('../entities/cardEntities.js').DiscardPile;
var DrawPile = require('../entities/cardEntities.js').DrawPile;
var InitializePlayers = require('../entities/playerEntities.js').InitializePlayers;
var canPlayerPlayTheCard = require('../entities/rulesEntities.js').canPlayerPlayTheCard;
var calculatePoints = require('./serverUtilities.js').server.calculatePoints;

//-----------------------------------------------------------------------------------------//

var usersInformation = [];
var allUsersInTheGame = [];
var isGameStarted = false;

//-------------------------------------------------------------------------------------------//
var sendUpdatedData = function(request, response){
  if(usersInformation.length != game.no_of_players){
    var data =  { isGameStarted : isGameStarted,
            numberOfPlayers : usersInformation.length,
          };
    sendResponse(response, data);
  }else if(isUserExists(request)){
    startUno();
    response.statusCode = 200;
    response.end('public/htmlFiles/unoTable.html');
  }else{
    var data =  { isGameStarted : true};
    sendResponse(response, data);
  }
};

// var mapName = function(ip){
  // var name;
  // usersInformation.forEach(function(user){
    // if(user.ip.toString() == ip.toString()) name = user.name;
  // });
  // return name;
// };

var getUserCards = function(cookie){
  return user_cards[cookie];
};

var getAllUserCardsLength = function(){
  var cardInfo = [];
  user_names.forEach(function(userName){
    cardInfo.push({name : userName, noOfCards : user_cards[userName].length});
  });
  return cardInfo;
};

var generateTable  = function(userInfo) {
  var user_info = userInfo.map(function (eachUser) {
    return "<tr><td>"+eachUser.name+"</td><td>"+eachUser.points+"</td></tr>";
  });
  var greetText = '<tr><td colspan="2"><h1>Congratulation!!!!</h1></td></tr>';
  var tableHead = "<tr><th>Name</th><th>Points</th></tr>"
  var endData = '</body></html>';
  return "<table id='table'>"+greetText+tableHead+user_info.join('')+"</table>" + endData;
};

var storeRankOfPlayers = function(ranks){
  var dataToWrite = generateTable(ranks);
  var fileName = '../public/htmlFiles/winners.html';
  var data = fs.readFileSync(fileName,'UTF-8');
  var startIndex = data.indexOf('<table');
  var dataAfter = data.substring(0,startIndex) + dataToWrite;
  fs.writeFileSync(fileName, dataAfter);
};

var sendAllInformationOfTable = function(request,response){
  var dataToSend = {};
  dataToSend.cardOnTable = discard_pile.getTopMostCard();
  dataToSend.userCards = getUserCards(request.headers.cookie);
  dataToSend.allUsersCardsLength = getAllUserCardsLength(); 
  dataToSend.currentPlayer = players.currentPlayer;
  dataToSend.nextPlayer = players.nextPlayer;
  dataToSend.previousPlayer = players.previousPlayer;
  dataToSend.runningColour = runningColour;
  var end = isEndOfGame();
  if(end){
    dataToSend.isEndOfGame = isEndOfGame();
    dataToSend.ranks = calculateRanking();
    storeRankOfPlayers(dataToSend.ranks);
    //clear the variables..
    
    // user_names = undefined;
    // user_cards = undefined;
    // discard_pile = undefined;
    // draw_pile = undefined;

    // players = undefined;

    // runningColour = undefined;

    // currentPlayer = undefined;

    // plus_two_cards_count = 0;

    // said_UNO_registry = [];
    // allUsersInTheGame = allUsersInTheGame.concat(usersInformation);
    // usersInformation = [];
    // isGameStarted = false;
  };

  sendResponse(response, dataToSend);
};

var serveFile = function(filePath, request, response){
  fs.readFile(filePath, function(err, data){
    if(data){
      response.statusCode = 200;
      response.end(data);
    }else if(err){
      console.log('file not found..!',request.url);
      response.statusCode = 404;
      response.end('File Not Found..!');
    };
  });
};

var isValidUser = function(request){
  return allUsersInTheGame.some(function(user){
    return (user.name == request.headers.cookie);
  });
};

var handle_get_request = function(request, response){
  console.log('requested files', request.url);
  filePath = (request.url == '/') ? '../public/htmlFiles/login.html' : '..' + request.url;
  if(request.url == '/' && isGameStarted){
    response.statusCode = 404;
    response.end('Game has already been started..!');
  }else if(request.url == '/public/htmlFiles/all_information_on_table' && !isUserExists(request)){
    response.statusCode = 404;
    var info = [ 'Oops..!!',
           'Something went wrong..!!',
           ' GO TO ',
           '<a href="/"> LOGIN PAGE </a>'
          ].join('');
    response.end(info);
  }else if(request.url == '/updated_login_data'){
    sendUpdatedData(request, response);
  }else if(request.url == '/public/htmlFiles/winners.html' && !isUserExists(request)){
    response.statusCode = 404;
    var info = [ '<!DOCTYPE html><html><head><title></title></head><body>',
           'Sorry..',
           ' Login First..!!',
           ' go to ',
           '<a href="/"> LOGIN PAGE </a>',
           '</body></html>'
          ].join('');
    response.end(info);
  }else if(request.url == '/public/htmlFiles/all_information_on_table'){
    sendAllInformationOfTable(request,response);
  }else{
    serveFile(filePath, request, response);
  };
};

//-----------------------------------POST_HANDLER---------------------------------------//

var addUser = function(name){
  usersInformation.push({name : name});
};

var isUserExists = function(request){
  var cookies = request.headers.cookie;
  console.log('Checking for', cookies);
  return usersInformation.some(function(user){
    return (user.name == cookies);
  });
};

var isEndOfGame = function(){
  var end = false;
  user_names.forEach(function(name){
    if(user_cards[name].length == 0) end = true;
  });
  return end;
};

var calculateRanking = function(){
  var ranks = [];
  user_names.forEach(function(name){
    ranks.push({name : name, points : calculatePoints(user_cards[name])});
  });
  ranks.sort(function(player1, player2){
    return (player1.points > player2.points)
      ? 1
      : (player1.points < player2.points) ? -1 : 0
  });
  return ranks;
};

var checkForEndOfTheGameAndRespond = function(request, response){
  if(isEndOfGame()){
    var dataToSend = {};
    dataToSend.status = 'Game end';
    dataToSend.ranks = calculateRanking();
    sendResponse(response, dataToSend);	
  }else{
    var dataToSend = {};
    dataToSend.status = 'successful';
    sendResponse(response, dataToSend);	
  };
};

var sendResponse = function(response, data){
  response.end(JSON.stringify(data));
};

//---------------------------------LOGIN_USER_REQUEST---------------------------------//

var handle_login_user_request = function(request, response){
  if(isGameStarted){
      response.end('{"isGameStarted" : true}');
    }else{
      console.log('User requested to log in..!');
      var data = '';
      request.on('data', function(d){
        data += d;
      });
      request.on('end', function(){
        if(!isUserExists(request)){
          addUser(data.substr(5));
          var dataToBeSent =  { isGameStarted : isGameStarted,
                        numberOfPlayers : usersInformation.length,
                    };
          response.writeHead(200, {'Set-Cookie': data.substr(5)});
          sendResponse(response, dataToBeSent);
        }else{
          var dataToBeSent =  { alreadyConnected : true };
          sendResponse(response, dataToBeSent);
        };

        if(usersInformation.length == game.no_of_players) isGameStarted = true;
        console.log(usersInformation);
      });
    };
};

//---------------------------------PLAY_CARD_REQUEST---------------------------------//

var drawCardsFromDeck = function(noOfCards){
  var cards = draw_pile.drawCards(noOfCards);
  if(draw_pile.isEmpty()){
    var topMostCard = discard_pile.cards.shift();
    var allDeckCards = discard_pile.cards;
    draw_pile = new DrawPile(lodash.shuffle(allDeckCards));
    discard_pile = new DiscardPile([topMostCard]);
  };
  return cards;
};


var giveFourCardsToNextPlayer = function(){
  var nextPlayer = players.nextPlayer;
  user_cards[nextPlayer] = user_cards[nextPlayer].concat(drawCardsFromDeck(4))
};

var doesNextPlayerHavePlustwo = function(){
  return user_cards[players.nextPlayer].some(function(card){
    return (card.speciality == 'DrawTwo');
  });
};

var givePenaltyCardsTwoNextPlayer = function(penalty){
  user_cards[players.nextPlayer] = user_cards[players.nextPlayer].concat(drawCardsFromDeck(penalty));
};

var playTheCardThatUserRequested = function(userPlay, request){
  var cardPlayed = userPlay.playedCard;
  var userName = request.headers.cookie;
  var userHand = user_cards[userName];
  user_cards[userName] = removeSelectedCard(cardPlayed, userHand);
  discard_pile.addCard(cardPlayed);
  switch (cardPlayed.speciality){
    case 'Wild':
      runningColour = userPlay.colour;
      players.changePlayersTurn();
      currentPlayer = players.currentPlayer;
      break;
    case 'WildDrawFour':
      runningColour = userPlay.colour;
      giveFourCardsToNextPlayer();
      players.changePlayersTurn();
      players.changePlayersTurn();
      currentPlayer = players.currentPlayer;
      break;
    case 'DrawTwo':
      plus_two_cards_count += 2;
      if(!doesNextPlayerHavePlustwo()){
        givePenaltyCardsTwoNextPlayer(plus_two_cards_count);
        players.changePlayersTurn();
        plus_two_cards_count = 0;
      };
      players.changePlayersTurn();
      currentPlayer = players.currentPlayer;
      runningColour = cardPlayed.colour;
      break;
    case null:
      players.changePlayersTurn();
      currentPlayer = players.currentPlayer;
      runningColour = cardPlayed.colour;
      break;
    case 'Skip':
      runningColour = cardPlayed.colour;
      players.changePlayersTurn();
      players.changePlayersTurn();
      currentPlayer = players.currentPlayer;
      break;
    case 'Reverse':
      runningColour = cardPlayed.colour;
      players.changeDirection();
      players.changePlayersTurn();
      currentPlayer = players.currentPlayer;
  };
};

var checkAndResetTheUnoField = function(){
  said_UNO_registry.forEach(function(player){
    if(player.said_uno == true){
      if(user_cards[player.name].length != 1)
        player.said_uno = false;
    };
  });
};

var handle_play_card_request = function(request, response){
  if(currentPlayer == request.headers.cookie){
    var data = '';
    request.on('data', function(d){
      data += d;
    });
    request.on('end', function(){
      var userPlay = JSON.parse(data);
      var cardPlayed = userPlay.playedCard;
      var discardedCard = discard_pile.getTopMostCard();
        if(canPlayerPlayTheCard(cardPlayed, discardedCard, runningColour, plus_two_cards_count)){
          playTheCardThatUserRequested(userPlay, request);
          checkAndResetTheUnoField();
          response.statusCode = 200;
          response.end('successful');
        }else{
          response.end('can_not_play_the_card');
        }
    });
  }else{
    response.statusCode = 200;
    response.end('not_your_turn');
  };

};

var handle_draw_card_request = function(request, response){
  var userName = request.headers.cookie;
  if(currentPlayer == userName){
    var card = drawCardsFromDeck(1);
    if(card[0] == undefined){
      response.end('out_of_cards');
      return;		
    };
    user_cards[userName] = user_cards[userName].concat(card);
    response.statusCode = 200;
    response.end();
      
  }else{
    response.statusCode = 200;
    response.end('not_your_turn');		
  };
};

var handle_say_uno = function(request, response){
  var playerName = request.headers.cookie;
  said_UNO_registry.forEach(function(user){
    if(user.name == playerName) 
      console.log('uno is here',user);
      user.said_uno = true;
  });
  response.statusCode = 200;
  response.end('said_uno_sucessfully')
};

var handle_pass_turn_request = function(request, response){
  players.changePlayersTurn();
  currentPlayer = players.currentPlayer;
  response.statusCode = 200;
  response.end('turn_passed');
};

var givePenalty = function(player, noOfCards){
  user_cards[player] = user_cards[player].concat(drawCardsFromDeck(noOfCards));
  checkAndResetTheUnoField();
}
var handle_catch_uno = function(request, response){
  var playersCardInfo = getAllUserCardsLength();
  for(var i = 0; i < playersCardInfo.length; i++){
    if(playersCardInfo[i].noOfCards == 1){
      for(var j = 0; j < said_UNO_registry.length; j++){
        if(said_UNO_registry[j].said_uno == false && said_UNO_registry[j].name == playersCardInfo[i].name){
            givePenalty(said_UNO_registry[j].name,2);
            response.end("uno_catched_successfully");
            break;
          }
      }	
    }
  };
  response.statusCode = 200;
  response.end("no_one_to_catch_uno");
};

//-----------------------------------------------------------------------------//

var handle_post_request = function(request, response){
  console.log('post request', request.url, request.method);
  switch(request.url){
    case '/login_user':
      handle_login_user_request(request, response);
      break;
    case '/public/htmlFiles/play_card':
      handle_play_card_request(request, response);
      break;
    case '/public/htmlFiles/draw_card':
      handle_draw_card_request(request, response);
      break;
    case '/public/htmlFiles/pass_turn':
      handle_pass_turn_request(request, response);
      break;
    case '/public/htmlFiles/say_uno':
      handle_say_uno(request, response);
      break;
    case '/public/htmlFiles/catch_uno':
      handle_catch_uno(request, response);
    default :
      response.statusCode = 405;
      response.end('Method NOT allowed..!!');
  };
};

var removeSelectedCard = function(card, allCards){
  for(var i = 0; i < allCards.length; i++){
    if(JSON.stringify(allCards[i]) == JSON.stringify(card)){
      allCards.splice(i,1);
      return allCards;
    };
  };
};

//-------------------------------------------------------------------------------------------//

var requestHandler = function(request, response){
  console.log(request.method, request.url);
  if(request.method == 'GET')
    handle_get_request(request, response);
  else if(request.method == 'POST')
    handle_post_request(request, response);
};

//-------------------------------------------------------------------------------------------//
var getUserName = function(allInformation){
  return allInformation.map(function(user){
    return user.name;
  });
};

//-------------------------------------UNO_DECK DATA---------------------------------------------//
var game = {
  no_of_players : 2
};
var user_names;
var user_cards;
var discard_pile;
var draw_pile;

var players;

var runningColour;

var currentPlayer;

var plus_two_cards_count = 0;

var said_UNO_registry = [];

var startUno = function(){
  said_UNO_registry = [];
  var shuffledCards = lodash.shuffle(allCards);
  var deck = new GenerateDeck(shuffledCards);
  user_names = getUserName(usersInformation);
  players = new InitializePlayers(user_names);
  user_names = players.players;
  currentPlayer = players.currentPlayer;
  var dataAfterDistribution = distributeCards(user_names,shuffledCards);
  user_cards = dataAfterDistribution[0];
  var remainingCards = dataAfterDistribution[1];
  var cardForDiscardPile = remainingCards.shift();
  discard_pile = new DiscardPile([cardForDiscardPile]);
  runningColour = (discard_pile.getTopMostCard().colour) ? (discard_pile.getTopMostCard().colour) : '';
  draw_pile = new DrawPile(remainingCards);
  user_names.forEach(function(user){
    said_UNO_registry.push({name : user, said_uno : false});
  });
};

//-------------------------------------------------------------------------------------------//

var server = http.createServer(requestHandler);
server.listen(3000);

module.exports = requestHandler;
