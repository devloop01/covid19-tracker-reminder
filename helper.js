function clearAndCreateAlarm(delayInMins, periodInMins) {
	let delayInMS = delayInMins * 60000;
	chrome.storage.local.get("date", storage => {
		chrome.alarms.get("alarm" + storage.date, alarm => {
			if (alarm) {
				chrome.alarms.clear("alarm" + storage.date);
			}
			chrome.alarms.create("alarm" + storage.date, {
				delayInMinutes: delayInMins,
				periodInMinutes: periodInMins,
			});
			chrome.storage.local.set({ nextAlarmTime: Date.now() + delayInMS });
		});
	});
}

function clearAlarm() {
	chrome.storage.local.get("date", storage => {
		chrome.alarms.clear("alarm" + storage.date);
	});
}
