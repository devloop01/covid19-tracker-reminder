let countdownMaxInMin, countdownMaxInSec, countdownMaxInMS;

chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.local.clear(function() {
		let error = chrome.runtime.lastError;
		if (error) {
			console.error(error);
		}
	});
	chrome.alarms.getAll(data => {
		data.forEach(alarm => {
			chrome.alarms.clear(alarm.name);
		});
	});
	let date = Date.now();
	chrome.storage.local.set({
		date: date,
		isPaused: false,
		washDelay: 30,
		nextSelectedWashDelay: 30,
		totalTimesWashed: 0,
		finished: false,
		totalInfected: 0,
		totalRecovered: 0,
		totalDeaths: 0,
		tabMode: false,
	});
	chrome.storage.local.get(["washDelay", "isPaused"], storage => {
		countdownMaxInMin = storage.washDelay;
		countdownMaxInSec = countdownMaxInMin * 60;
		countdownMaxInMS = countdownMaxInSec * 1000;

		chrome.storage.local.set({
			countdownMaxInMin: countdownMaxInMin,
		});

		if (!storage.isPaused) clearAndCreateAlarm(countdownMaxInMin, countdownMaxInMin);
	});
});

chrome.runtime.onStartup.addListener(() => {
	chrome.storage.local.get(["nextSelectedWashDelay", "isPaused"], storage => {
		if (!storage.isPaused) clearAndCreateAlarm(storage.nextSelectedWashDelay, storage.nextSelectedWashDelay);
	});
});

chrome.alarms.onAlarm.addListener(alarm => {
	chrome.storage.local.get(["date", "nextSelectedWashDelay", "washDelay", "tabMode", "isPaused"], storage => {
		if (alarm.name == "alarm" + storage.date && storage.isPaused == false) {
			let nextAlarmTime = alarm.scheduledTime + countdownMaxInMS;
			chrome.storage.local.set({ nextAlarmTime: nextAlarmTime, finished: true });
			chrome.storage.local.set({ washDelay: storage.nextSelectedWashDelay }, () => {
				clearAndCreateAlarm(storage.nextSelectedWashDelay, storage.nextSelectedWashDelay);
			});
			if (storage.tabMode == true) {
				chrome.tabs.create({ url: "/timer.html" });
			} else if (storage.tabMode == false) {
				chrome.windows.create({
					type: "popup",
					url: "timer.html",
					width: window.screen.availWidth,
					height: window.screen.availHeight,
					left: 0,
					top: 0,
					focused: true,
				});
			}
		} else {
			chrome.alarms.getAll(alarms => {
				alarms.forEach(alarm => {
					if (alarm.name != "alarm" + storage.date) {
						chrome.alarms.clear(alarm.name);
					}
				});
			});
		}
	});
});

chrome.runtime.onConnect.addListener(port => {
	port.onMessage.addListener(response => {
		if (response.resetTime) {
			chrome.storage.local.get(["nextSelectedWashDelay", "isPaused", "pausedCount"], storage => {
				if (storage.isPaused) chrome.storage.local.set({ isPaused: false, pausedCount: 0 });
				clearAndCreateAlarm(storage.nextSelectedWashDelay, storage.nextSelectedWashDelay);
			});
		}
	});
});
