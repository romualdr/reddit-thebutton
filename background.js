(function () {
	"use strict";
	
	window.url = "wss://wss.redditmedia.com/thebutton?h=b915df7048013948fef513d53f58b38b3eecf7fc&e=1428579198";
	window.socket = null;
	window.state = {
		connected: false,
		left: NaN,
		participants: 0
	};
	window.actions = {};

    function updateState(key, value) {
    	window.state[key] = value;
    };

    function getState(key) {
    	return window.state[key];
    };

    function updateTime() {
    	var time = getState('left');
    	if (!time)
    		return;
    	chrome.browserAction.setBadgeText({text: " " + (time - 1) + " "});

    	var backgroundColor;

    	// 51+
    	if (time > 50) {
    		backgroundColor = "#820080";
    	} 
    	// 41 - 50
    	else if (time > 40) {
    		backgroundColor = "#0083C7";

    	}
    	// 31 - 40
    	else if (time > 30) {
    		backgroundColor = "#02be01";
    	}
    	// 21 - 30
    	else if (time > 20) {
    		backgroundColor = "#E5D900";
    	}
    	// 11 - 20
    	else if (time > 10) {
    		backgroundColor = "#e59500";
    	}
    	else if (time > 0) {
    		backgroundColor = "#e50000";
    	}
    	chrome.browserAction.setBadgeBackgroundColor({color: backgroundColor});
    }

    function start() {
    	if (window.socket)
    		window.socket.close();
    	var socket = new WebSocket(window.url);
    	socket.onopen = function(){
	        updateState('connected', true);
	      	chrome.runtime.sendMessage({action: "started"});
	    };

	    socket.onmessage = function(message){
	    	var json = JSON.parse(message.data);
	    	updateState('left', json.payload.seconds_left);
	    	updateState('participants', json.payload.participants_text);
	    	window.actions['refresh']();
	    };
	    socket.onclose = function() {
	    	updateState('connected', false);
	    };
	    window.socket = socket;
    }

    window.actions['restart'] = function () {
    	
    	var xhr = new XMLHttpRequest();
		xhr.open("GET", "http://www.reddit.com/r/thebutton/", true);
		xhr.onreadystatechange = function() {
		  if (xhr.readyState == 4) {
		  	if (xhr.responseText.indexOf('wss://wss.redditmedia.com/thebutton') !== -1) {
			    var url = xhr.responseText.substr(xhr.responseText.indexOf('wss://wss.redditmedia.com/thebutton'), 100);
			    url = url.substr(0, url.indexOf('",'));
			    window.url = url;
			}
			start();
		  }
		}
		xhr.send();
		return;
    };

    window.actions['refresh'] = function () {
    	updateTime();
    	chrome.runtime.sendMessage(window.state);
    };

    chrome.runtime.onMessage.addListener(function (message, sender, reponse) {
		if (message.action && window.actions[message.action]) {
			window.actions[message.action]();
		}
	});

    window.actions['restart']();

})();