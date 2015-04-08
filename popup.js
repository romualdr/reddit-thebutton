window.actions = {};
window.triggers = {};
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


var STATE = { connected: false };
var INTERNALS = { page: "ext" };
var ELS = {
	"#time-count": null,
	'#participants-count': null,
	'#startscreen': null,
	'body': null
};


/*
	Update GUI with new data
*/
function updateGUI() {
	ELS['#time-count'].innerHTML = (STATE.left ? STATE.left - 1 : "??");
	ELS['#participants-count'].innerHTML = (STATE.participants ? STATE.participants : "??");
	ELS['#startscreen'].style.display = (STATE.connected && STATE.started ? "none" : "block");
	ELS['#startscreen'].innerHTML = (STATE.started ? (STATE.connected ? "" : "Working ...") : "Stopped");
	ELS["body"].className = "page-" + INTERNALS.page + " " + (STATE.started ? "started" : "stopped");
}

/*
	@desc: Bind buttons - Invoke tab creation when clicked
	2 links : My twitter + sub-reddit /thebutton
*/
document.addEventListener("DOMContentLoaded", function(event) { 
	initializeLinks();
	initializeELS();

	chrome.runtime.sendMessage({ action: "doRefresh" });
});

function initializeLinks() {
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

	var _triggers = document.querySelectorAll('._trigger');
	for (var i = 0; i < _triggers.length; i++) {
		_triggers[i].onclick = (function (el) {
			var trigger = el.attributes['data-trigger'].value;
			if (!window.triggers[trigger])
				return undefined;
			return function (e) {
				var val = el.attributes['data-trigger-value'];
				window._gaq.push(['_trackEvent', trigger, 'clicked']);
				window.triggers[trigger]((val ? val.value : undefined));
			}
		})(_triggers[i]);
	};
}

function initializeELS() {
	for (var key in ELS) {
		ELS[key] = document.querySelector(key);
	}
}

/*
	@desc: I/O with background
		   User -> trigger
*/
window.triggers['restart'] = function () {
	chrome.runtime.sendMessage({ action: "doRestart" });
};

window.triggers['changePage'] = function (page) {
	INTERNALS.page = page;
	updateGUI();
};

window.triggers['stop'] = function () {
	chrome.runtime.sendMessage({ action: "doStop" });
};

window.triggers['start'] = function () {
	chrome.runtime.sendMessage({ action: "doRestart" });
}


/*
	@desc: I/O with background
	       Background -> actions
*/
window.actions['refresh'] = function (message) {
	STATE = message.state;
	updateGUI();
};

chrome.runtime.onMessage.addListener(function (message, sender, reponse) {
	if (message.action && window.actions[message.action])
		return window.actions[message.action](message);
});