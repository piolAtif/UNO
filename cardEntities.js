var lodash = require('lodash');

var Card = function (colour,number,speciality,points) {
	this.colour = colour;
	this.number = number;
	this.speciality = speciality;
	this.points = points;
};

var generateNumberedCard = function (colour) {
	var pilesOfCard = [];
	for (var index = 0; index < 10; index++) {
		pilesOfCard.push(new Card(colour,index,null,index));
		if (index)
			pilesOfCard.push(new Card(colour,index,null,index));
	};
	return pilesOfCard;
};

var genrateSpecialCard = function(colour,specialities,points) {
	return specialities.map(function(speciality){
		var array = [];
		for (var i = 0; i < 2; i++) {
			array.push(new Card(colour,null,speciality,points));
		};
		return array;
	});
};

var genrateWildCard = function (speciality,points) {
	var pilesOfCard = [];
	for (var i = 0; i < 4; i++) {
		pilesOfCard.push(new Card(null,null,speciality,points));
	};
	return pilesOfCard;
};

var genrateAllCard = function (cardsInfo) {
	var collectionOfAllCards = [];

	cardsInfo.coloursOfCard.forEach(function (colour) {
		collectionOfAllCards.push(generateNumberedCard(colour));
	})

	cardsInfo.coloursOfCard.forEach(function (colour) {
			collectionOfAllCards.push(genrateSpecialCard(colour,cardsInfo.specialCard.speciality,cardsInfo.specialCard.points))
	});

	cardsInfo.wildCard.speciality.forEach(function (wildName) {
		collectionOfAllCards.push(genrateWildCard(wildName,cardsInfo.wildCard.points));
	});

	return lodash.flattenDeep(collectionOfAllCards);
};

var cardsInfo = {
	coloursOfCard:['Red','Blue','Green','Yellow'],
	specialCard:{speciality:['Reverse','Skip','DrawTwo'],points:20},
	wildCard:{speciality:['Wild','WildDrawFour'],points:50}
};

exports.allCards = genrateAllCard(cardsInfo);