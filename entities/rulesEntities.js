var allRules = {};

allRules.areSameColouredCards = function(cardPlayed, discardedCard, colour, penalty){
	return ((cardPlayed.colour == discardedCard.colour) 
		&& (cardPlayed.colour != null)
		&& (penalty == 0));
};

allRules.areSameNumberedCards = function(cardPlayed, discardedCard){
	return ((cardPlayed.number == discardedCard.number) && (cardPlayed.number != null));	
};

allRules.isWildCardPlayed = function(cardPlayed, discardedCard){
	return ((cardPlayed.speciality == 'Wild') || (cardPlayed.speciality == 'WildDrawFour'));
};

allRules.isWildCardOnDeck = function(cardPlayed, discardedCard, runningcolour){
		return (((discardedCard.speciality == 'Wild')
		|| (discardedCard.speciality == 'WildDrawFour')) 
		&& (cardPlayed.colour == runningcolour));
};

allRules.isReverseCardPlayed = function(cardPlayed, discardedCard){
	return ((cardPlayed.speciality == 'Reverse') && (discardedCard.speciality == 'Reverse'));
};

allRules.isSkipCardPlayed = function(cardPlayed, discardedCard){
	return ((cardPlayed.speciality == 'Skip') && (discardedCard.speciality == 'Skip'));
}

allRules.canPlayerPlayPlusTwo = function(cardPlayed, discardedCard){
	return ((cardPlayed.speciality == discardedCard.speciality) 
		&& (cardPlayed.speciality != null));
};

exports.allRules = allRules;

// var all_rules = [ allRules.areSameColouredCards, 
// 			   	  allRules.areSameNumberedCards,
// 			   	  allRules.isWildCardPlayed,
// 			   	  allRules.isWildCardOnDeck,
// 			   	  allRules.isSkipCardPlayed,

// 			   	  allRules.canPlayerPlayPlusTwo
// 			   ];


exports.canPlayerPlayTheCard = function(cardPlayed, discardedCard, runningcolour, penalty){
	for(i in allRules){
		if(allRules[i](cardPlayed, discardedCard, runningcolour, penalty)){
			return true;
		};
	};
	return false;
};
