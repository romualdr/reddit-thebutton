(function () {
	"use strict";
	
    // Setting first values - in case reddit doesn't answer ...
	window.actions = {};


    // Update the label
    function updateIcon() {
        var time = StateMachine.get('left');
        if (!StateMachine.get('started'))
            return chrome.browserAction.setBadgeText({text: ""});
        if (!time)
            return;
        time = time - 1;
        chrome.browserAction.setBadgeText({text: " " + time + " "});

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

    /*
        @desc: State management
    */
    var StateMachine = (function () {
        var _state = {
            connected: false,
            time_left: NaN,
            participants: 0,
            started: true
        };
        var _methods = {};

        _methods.get = function (key) {
            if (key)
                return _state[key];
            return _state;
        };

        _methods.del = function (key) {
            delete _state[key];
        };

        _methods.set = function (key, value, dontUpdate) {
            _state[key] = value;
            if (!dontUpdate)
                this.update();
            return this.get(key);
        };

        _methods.bulk = function (state) {
            for (var key in state) {
                _methods.set(key, state[key], true);
            }
            this.update();
            return this.get();
        };

        _methods.update = function () {
            updateIcon();
            chrome.runtime.sendMessage({ action: "refresh", state: this.get() });
        };

        return _methods;
    })();

    /*
        @desc: Reddit connector
    */
    var RedditConnector = (function () {
        var URL = null;
        var SOCKET = null;
        var _methods = {};

        /*
            Private methods
        */

        function updateURL(callback) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "http://www.reddit.com/r/thebutton/", true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState == 4) {

                // Get the new thebutton websocket url and discard everything else
                if (xhr.responseText.indexOf('wss://wss.redditmedia.com/thebutton') !== -1) {
                    var url = xhr.responseText.substr(xhr.responseText.indexOf('wss://wss.redditmedia.com/thebutton'), 100);
                    url = url.substr(0, url.indexOf('",'));
                    URL = url;
                    StateMachine.del('error');
                    return callback(null, url);
                }
                StateMachine.set('error', 'errUnableToGetUrl');
                return callback(true);
              }
            }
            xhr.send();
        }

        /*
            Public methods
        */

        _methods.connect = function () {
            updateURL(function (err) {
                if (err)
                    return;
                var socket = new WebSocket(URL);
                socket.onopen = function(){
                    StateMachine.set('connected', true);
                };

                socket.onmessage = function(message){
                    var json = JSON.parse(message.data);
                    StateMachine.bulk({
                        connected: true,
                        left: json.payload.seconds_left,
                        participants: json.payload.participants_text
                    });
                };
                socket.onclose = function() {
                    StateMachine.set('connected', false);
                };
                SOCKET = socket;
            });
        };

        _methods.disconnect = function () {
            if (SOCKET)
                SOCKET.close();
            SOCKET = null;
            StateMachine.set('connected', false);
        };

        _methods.reload = function () {
            this.disconnect();
            this.connect();
        };
        return _methods;
    })();
    
    /*
        @desc:  Restart function
                Get a new socket URL
    */
    window.actions['doRestart'] = function () {
        StateMachine.set('started', true);
        return RedditConnector.reload();
    };

    window.actions['doStop'] = function () {
        StateMachine.set('started', false);
        return RedditConnector.disconnect();
    };

    window.actions['getState'] = function (message, callback) {
        callback(null, StateMachine.get());
    };

    window.actions['doRefresh'] = function () {
        return StateMachine.update();
    };

    /*
        @desc: Listen for popup action
        TODO: { popup: "action" } to be able to get only popup / action and action namespacing
    */
    chrome.runtime.onMessage.addListener(function (message, sender, cb) {
		if (message.action && window.actions[message.action]) {
			window.actions[message.action](message, cb);
		}
	});

    RedditConnector.connect();

})();