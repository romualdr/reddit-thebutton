(function () {
	"use strict";
	
	window.actions = {};


    function Message(json) {
        var update = {
            connected: true,
            left: json.payload.seconds_left,
            max_ttl: StateMachine.get('max_ttl') - 1
        };

        if (json.payload.participants_text) {
            var participants =  parseInt(json.payload.participants_text.split(',').join(''));
            var delta = participants - StateMachine.get('participants');
            if (StateMachine.get('participants') === 0) {
                update.participants = participants;
            }
            else if (delta) {
                update.participants = participants;
                update.non_pressers = StateMachine.get('non_pressers') - delta;
                update.pressers = StateMachine.get('pressers') + delta;

                update.max_ttl =  update.non_pressers * 59;
            }
            update.previous_time = StateMachine.get('left') - 1;
        }

        // Bulk the update
        StateMachine.bulk(update);
    }

    /*
        @desc: State management
    */
    var StateMachine = (function () {
        var _state = {
            connected: false,
            left: NaN,
            participants: 0,
            pressers: 0,
            non_pressers: 0,
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

        _methods.bulk = function (state, dontUpdate) {
            for (var key in state) {
                _methods.set(key, state[key], true);
            }
            if (!dontUpdate)
                this.update();
            return this.get();
        };

        _methods.silent = function (key, value) {
            if (value === undefined)
                return this.bulk(key, true);
            return this.set(key, true);
        };

        _methods.update = function () {
            var time = this.get('left');
            if (!StateMachine.get('started'))
                chrome.browserAction.setBadgeText({text: ""});
            else if (time) {
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

            // Notify
            chrome.runtime.sendMessage({ action: "update", state: this.get() });
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

        function getPage(callback) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "http://www.reddit.com/r/thebutton/", true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState == 4) {
                return callback(null, xhr.responseText);
              }
              return callback(true);
            }
            xhr.send();
        }

        function findURL(page) {
             var _index = page.indexOf('wss://wss.redditmedia.com/thebutton');
            // Get the new thebutton websocket url and discard everything else
            if (_index !== -1) {
                var url = page.substr(_index, 100);
                url = url.substr(0, url.indexOf('",'));
                URL = url;
                return URL;
            }
            return null;
        }
        function findUnpressed(page) {
            var _tofind = '<span class="flair flair-no-press">.</span>~';
            var _index = page.indexOf(_tofind);
            // Get the new thebutton websocket url and discard everything else
            if (_index !== -1) {
                var number = page.substr(_index + _tofind.length, 15);
                number = parseInt(number);
                return StateMachine.set('non_pressers', number);
            }
            return null;
        }

        /*

        */

        _methods.update = function (callback) {
            var that = this;
            getPage(function (err, page) {
                if (err) {
                    StateMachine.set('error', 'errUnableToContactReddit');
                    return callback(true);
                }

                findURL(page);
                findUnpressed(page);

                StateMachine.del('error');
                return callback(null, true);
            });
        };

        _methods.connect = function () {
            this.update(function (err) {
                if (err)
                    return;
                var socket = new WebSocket(URL);
                socket.onopen = function(){
                    StateMachine.set('connected', true);
                };

                socket.onmessage = function(message){
                    var json = JSON.parse(message.data);
                    Message(json);
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
        RedditConnector.reload();
        return;
    };

    window.actions['doStop'] = function () {
        StateMachine.set('started', false);
        return RedditConnector.disconnect();
    };

    window.actions['getState'] = function (message, callback) {
        callback(null, StateMachine.get());
    };

    window.actions['doUpdate'] = function () {
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

    window.actions['doRestart']();

})();