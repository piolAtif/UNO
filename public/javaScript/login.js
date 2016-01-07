var alreadyGameStarted = function(){
	return 'Sorry..!!! Game has already been started..!';
};

var playersInformation = function(comments){
	return '<h4> Number of Players in The Game :'+comments.numberOfPlayers+'</h4>';
};

var alreadyConnected = function(){
	return 'Already Connected Boss..!!';
};

var sendConnectionRequest = function(){
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {
	    if (req.readyState == 4 && req.status == 200) {
	        var comments = JSON.parse(req.responseText);
	        if(comments.isGameStarted == true){
		      	document.querySelector('#current_game_information').innerHTML = alreadyGameStarted();
	        }else if(comments.alreadyConnected == true){
	        	document.querySelector('#current_game_information').innerHTML = alreadyConnected();;
	    	}else{
	        	document.querySelector('#current_game_information').innerHTML = playersInformation(comments);
	        }
	    };
	};
	req.open('POST', 'login_user', true);
	req.send('name='+document.querySelector('input[name="user_name"]').value);
	document.querySelector('input[name="user_name"]').value = "";
};


var getUpdatedData = function(){
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {
	    if (req.readyState == 4 && req.status == 200) {
	    	try{
	        	var comments = JSON.parse(req.responseText);
		        if(comments.isGameStarted == true){
			      	document.querySelector('#current_game_information').innerHTML = alreadyGameStarted();
		        }else if(comments.alreadyConnected == true){
		        	document.querySelector('#current_game_information').innerHTML = alreadyConnected();;
		    	}else{
		        	document.querySelector('#current_game_information').innerHTML = playersInformation(comments);
		        }
	    	}catch(e){
	    		clearInterval(interval);
	    		window.location = req.responseText;
	    	};
	    };
	};
	req.open('GET', 'updated_login_data', true);
	req.send();
};

window.onload = function(){
	document.querySelector('button').onclick = sendConnectionRequest;
};

var interval = setInterval(getUpdatedData, 3000);