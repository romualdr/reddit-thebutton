window.actions = {};
// Analytics
var _gaq = window._gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-61700114-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
// !Analytics
var state = {};


/*
	Update GUI with new data
*/
function updateGUI(_state) {
	if (_state.left !== state.left)
		document.querySelector('#time-count').innerHTML = _state.left - 1;
	if (_state.participants !== state.participants)
		document.querySelector('#participants-count').innerHTML = _state.participants;
	if (_state.connected !== state.connected) {
		var el = document.querySelector('#restartscreen');
		if (!_state.connected)
			el.style.display = "block";
		else
			el.style.display = "none";
	}
	state = _state;
}

/*
	@desc: Listen to message from background
*/
chrome.runtime.onMessage.addListener(function (message, sender, reponse) {
	if (message.action) {
		if (window.actions[message.action])
			return window.actions[message.action](message);
		return;
	}
	updateGUI(message);
});

/*
	@desc: Bind buttons - Invoke tab creation when clicked
	2 links : My twitter + sub-reddit /thebutton
*/
document.addEventListener("DOMContentLoaded", function(event) { 
	var links = document.querySelectorAll('._link');
	for (var i = 0; i < links.length; i++) {
		links[i].onclick = (function (el) {
			var href = el.attributes.href.value;
			return function (e) {
				window._gaq.push(['_trackEvent', href, 'clicked']);
				chrome.tabs.create({ url: href });
			}
		})(links[i]);
	};

	var restart = document.querySelector('.restart');
	restart.onclick = function () {
		chrome.runtime.sendMessage({ action: "restart" });
	}
});

window.actions['restart'] = function () {
	window._gaq.push(['_trackEvent', 'restart', 'clicked']);
	var el = document.querySelector('#restartscreen');
	el.style.display = "block";
};

window.actions['started'] = function () {
	var el = document.querySelector('#restartscreen');
	el.style.display = "none";
};

// Get state
chrome.runtime.sendMessage({ action: "refresh" });