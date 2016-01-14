var allCards = require('../entities/cardEntities.js').allCards;
var GenerateDeck = require('../entities/cardEntities.js').GenerateDeck;
var distributeCards = require('../server/serverUtilities.js').server.distributeCards;
var DiscardPile = require('../entities/cardEntities.js').DiscardPile;
var DrawPile = require('../entities/cardEntities.js').DrawPile;
var InitializePlayers = require('../entities/playerEntities.js').InitializePlayers;
var canPlayerPlayTheCard = require('../entities/rulesEntities.js').canPlayerPlayTheCard;
var lodash = require('lodash');

exports.genrateId = function(games) {
	return "game_"+ Object.keys(games).length;
};

exports.addUser = function(name,game){
	game.usersInformation.push({name : name});
};

var startUno = function(game){
	game.said_UNO_registry = [];

  	var shuffledCards = lodash.shuffle(allCards);
  	var deck = new GenerateDeck(shuffledCards);

  	game.user_names = getUserName(game.usersInformation);
  	game.players = new InitializePlayers(game.user_names);

  	game.currentPlayer = game.players.currentPlayer;
  	var dataAfterDistribution = distributeCards(game.user_names,shuffledCards);
  	
  	game.user_cards = dataAfterDistribution[0];
  	var remainingCards = dataAfterDistribution[1];

  	var cardForDiscardPile = remainingCards.shift();
  	game.discard_pile = new DiscardPile([cardForDiscardPile]);

  	game.runningColour = (game.discard_pile.getTopMostCard().colour) ? (game.discard_pile.getTopMostCard().colour) : '';
  	game.draw_pile = new DrawPile(remainingCards);

  	game.user_names.forEach(function(user){
    	game.said_UNO_registry.push({name : user, said_uno : false});
  	});
};

exports.sendUpdatedData = function(request, response, game){
	startUno(game);	
	response.send('/htmlFiles/unoTable.html');
};

exports.createdNewGameId = function(userInfo, gameId, listOfGame, game){
	listOfGame[gameId] = new game(gameId,userInfo.setNoOfPlayer);
	exports.addUser(userInfo.name, listOfGame[gameId]);
};

exports.gameStarted = function(game){
		if(game.usersInformation.length == game.no_of_players){
	  		game.isGameStarted = true;
		}
		else{
			game.isGameStarted = false;
		}
};

var getUserName = function(allInformation){
	return allInformation.map(function(user){
    	return user.name;
  	});
};

var getUserCards = function(cookie, game){
 	return game.user_cards[cookie];
};

var getAllUserCardsLength = function(game){
    var cardInfo = [];
    game.user_names.forEach(function(userName){
      cardInfo.push({name : userName, noOfCards : game.user_cards[userName].length});
    });
    return cardInfo;
  };

var setCookie = function(cookieHeader){
  var cookie = cookieHeader.split(";");
  return cookie[0].substr(10) 
};

exports.sendAllInformationOfTable = function(request, response, game){
  var dataToSend = {};
  dataToSend.cardOnTable = game.discard_pile.getTopMostCard();
  dataToSend.userCards = getUserCards(setCookie(request.headers.cookie), game);
  dataToSend.allUsersCardsLength = getAllUserCardsLength(game); 
  dataToSend.currentPlayer = game.players.currentPlayer;
  dataToSend.nextPlayer = game.players.nextPlayer;
  dataToSend.previousPlayer = game.players.previousPlayer;
  dataToSend.runningColour = game.runningColour;	
  response.send(JSON.stringify(dataToSend));
};

//=============================handle post request===========================================//


  //============================play_card request=================================//

var removeSelectedCard = function(card, allCards){
  for(var i = 0; i < allCards.length; i++){
    if(JSON.stringify(allCards[i]) == JSON.stringify(card)){
      allCards.splice(i,1);
      return allCards;
    };
  };
};

var givePenaltyCardsTwoNextPlayer = function(penalty, game){
  game.user_cards[game.players.nextPlayer] = game.user_cards[game.players.nextPlayer].concat(drawCardsFromDeck(penalty, game));
};

var doesNextPlayerHavePlustwo = function(game){
  return game.user_cards[game.players.nextPlayer].some(function(card){
    return (card.speciality == 'DrawTwo');
  });
};

var giveFourCardsToNextPlayer = function(game){
  var nextPlayer = game.players.nextPlayer;
  game.user_cards[nextPlayer] = game.user_cards[nextPlayer].concat(drawCardsFromDeck(4, game));
};

var playTheCardThatUserRequested = function(cardPlayed, request, game){
  var userName = setCookie(request.headers.cookie);
  var userHand = game.user_cards[userName];
  game.user_cards[userName] = removeSelectedCard(cardPlayed.playedCard, userHand);
  game.discard_pile.addCard(cardPlayed.playedCard);
  switch (cardPlayed.playedCard.speciality){
    case 'Wild':
      game.runningColour = cardPlayed.colour;
      game.players.changePlayersTurn();
      game.currentPlayer = game.players.currentPlayer;
      break;
    case 'WildDrawFour':
      game.runningColour = cardPlayed.colour;
      giveFourCardsToNextPlayer(game);
      game.players.changePlayersTurn();
      game.players.changePlayersTurn();
      game.currentPlayer = game.players.currentPlayer;
      break;
    case 'DrawTwo':
      game.plus_two_cards_count += 2;
      if(!doesNextPlayerHavePlustwo(game)){
        givePenaltyCardsTwoNextPlayer(game.plus_two_cards_count, game);
        game.players.changePlayersTurn();
        game.plus_two_cards_count = 0;
      };
      game.players.changePlayersTurn();
      game.currentPlayer = game.players.currentPlayer;
      game.runningColour = cardPlayed.colour;
      break;
    case null:
      game.players.changePlayersTurn();
      game.currentPlayer = game.players.currentPlayer;
      game.runningColour = cardPlayed.colour;
      break;
    case 'Skip':
      game.runningColour = cardPlayed.colour;
      game.players.changePlayersTurn();
      game.players.changePlayersTurn();
      game.currentPlayer = game.players.currentPlayer;
      break;
    case 'Reverse':
      game.runningColour = cardPlayed.colour;
      game.players.changeDirection();
      game.players.changePlayersTurn();
      game.currentPlayer = game.players.currentPlayer;
  };
};


exports.handle_play_card_request = function(request, response, game, cardPlayed){
  if(game.currentPlayer == setCookie(request.headers.cookie)){
    var discardedCard = game.discard_pile.getTopMostCard();
    if(canPlayerPlayTheCard(cardPlayed.playedCard, discardedCard, game.runningColour, game.plus_two_cards_count)){
      playTheCardThatUserRequested(cardPlayed, request, game);
      response.statusCode = 200;
      response.send('successful');
    } 
    else{
      response.statusCode = 200;
      response.send('can_not_play_the_card');
    }
  }else{
    response.statusCode = 200;
    response.send('not_your_turn');
  }
};

//===================================draw_card request==========================================//
 
var drawCardsFromDeck = function(noOfCards, game){
  var cards = game.draw_pile.drawCards(noOfCards);
  if(game.draw_pile.isEmpty()){
    var topMostCard = game.discard_pile.cards.shift();
    var allDeckCards = game.discard_pile.cards;
    game.draw_pile = new DrawPile(lodash.shuffle(allDeckCards));
    game.discard_pile = new DiscardPile([topMostCard]);
  };
  return cards;
};

exports.handle_draw_card_request = function(request, response, game){
  var userName = setCookie(request.headers.cookie);
  if(game.currentPlayer == userName){
    var card = drawCardsFromDeck(1, game);
    if(card[0] == undefined){
      response.send('out_of_cards');
      return;    
    };
    game.user_cards[userName] = game.user_cards[userName].concat(card);
    response.statusCode = 200;
    response.send();
      
  }
  else{
    response.statusCode = 200;
    response.send('not_your_turn');   
  };
};

//===================================pass turn request============================================//
exports.handle_pass_turn_request = function(request, response, game){
  game.players.changePlayersTurn();
  game.currentPlayer = game.players.currentPlayer;
  response.statusCode = 200;
  response.end('turn_passed');
};
