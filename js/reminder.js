document.addEventListener(
	"DOMContentLoaded",
	function() {
		// -----------------------------------------------------------------------
		// --------------------- REMINDER SCRIPTS ---------------------------------------------
		// -------------------------------------------------------

		const totalTimesHandWashedEl = document.getElementById("times-washed");
		const remainingTimeForNextWashEl = document.getElementById("next-wash-timer");
		const timePassedEl = document.getElementById("passed-time");
		const progressBarEl = document.querySelector(".progress-bar");
		const selectedWashDelayTimerEl = document.getElementById("wash-delay");
		const washNowButton = document.querySelector(".reminder-content .app__body--actions .wash-now");
		const pauseButton = document.querySelector(".reminder-content .app__body--actions .pause");
		const infoIcon = document.querySelector(".icon.info");
		const tabModeInfoText = document.querySelector(".tab-info-text");
		const tabModeToggle = document.getElementById("tab-mode-toggle");

		let washDelayInMinutes;
		let colorPropertyNames = ["--green", "--yellow", "--red"];
		let count, countdownInterval;

		function initReminder() {
			chrome.storage.local.get(
				["washDelay", "isPaused", "nextSelectedWashDelay", "tabMode", "totalTimesWashed", "pausedCount"],
				storage => {
					washDelayInMinutes = storage.washDelay || parseInt(selectedWashDelayTimerEl.value);
					selectedWashDelayTimerEl.value = storage.nextSelectedWashDelay;
					remainingTimeForNextWashEl.innerHTML = `${washDelayInMinutes} minutes`;
					washDelayInSeconds = washDelayInMinutes * 60;
					totalTimesHandWashedEl.innerHTML = storage.totalTimesWashed;

					if (storage.tabMode) tabModeToggle.checked = true;
					else tabModeToggle.checked = false;

					changeDelayStatusDotColor(colorPropertyNames);
					if (!storage.isPaused) {
						isNotPausedDisplay();
						updateCountdown();
						countdownInterval = setInterval(updateCountdown, 100);
					} else {
						isPausedDisplay();
						remainingTimeForNextWashEl.innerHTML =
							secToMin(storage.pausedCount).minutes < 1
								? `${secToMin(storage.pausedCount).seconds} seconds`
								: `${secToMin(storage.pausedCount).minutes} minutes`;

						let secondsPassed = 60 - secToMin(storage.pausedCount).seconds;
						let minutesPassed = storage.washDelay - secToMin(storage.pausedCount).minutes - 1;
						minutesPassed = minutesPassed < 0 ? 0 : minutesPassed;

						timePassedEl.innerHTML = `${minutesPassed} minutes ${secondsPassed} seconds`;

						let timePassed = minutesPassed * 60 + secondsPassed;
						let timeTotal = storage.washDelay * 60;
						updateProgressBar(progressBarEl.querySelector(".bar"), timePassed, timeTotal);
					}
				}
			);
		}
		initReminder();

		infoIcon.addEventListener("mouseenter", () => {
			tabModeInfoText.classList.add("show");
		});
		infoIcon.addEventListener("mouseleave", () => {
			tabModeInfoText.classList.remove("show");
		});

		tabModeToggle.addEventListener("click", () => {
			if (tabModeToggle.checked) chrome.storage.local.set({ tabMode: true });
			else chrome.storage.local.set({ tabMode: false });
		});

		washNowButton.addEventListener("click", () => {
			chrome.storage.local.get(["tabMode"], storage => {
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
			});
		});

		selectedWashDelayTimerEl.addEventListener("change", () => {
			chrome.storage.local.set({ nextSelectedWashDelay: parseInt(selectedWashDelayTimerEl.value) });
			changeDelayStatusDotColor(colorPropertyNames);
		});

		pauseButton.addEventListener("click", () => {
			if (!pauseButton.classList.contains("is-paused")) {
				isPausedDisplay();
				chrome.storage.local.set({
					isPaused: true,
					pausedCount: count,
				});
				clearInterval(countdownInterval);
				clearAlarm();
			} else {
				isNotPausedDisplay();
				chrome.storage.local.set({ isPaused: false });
				chrome.storage.local.get(["pausedCount", "countdownMaxInMin"], storage => {
					clearAndCreateAlarm(storage.pausedCount / 60, storage.countdownMaxInMin);
				});
				countdownInterval = setInterval(updateCountdown, 100);
			}
		});

		function isPausedDisplay() {
			pauseButton.classList.add("is-paused");
			pauseButton.innerHTML = "Resume";
		}
		function isNotPausedDisplay() {
			pauseButton.classList.remove("is-paused");
			pauseButton.innerHTML = "Pause";
		}

		function secToMin(timeInSec) {
			let sec = timeInSec % 60;
			let min = (timeInSec - sec) / 60;
			return {
				minutes: min,
				seconds: sec,
			};
		}

		function updateCountdown() {
			chrome.storage.local.get(["nextAlarmTime", "finished", "washDelay"], storage => {
				if (storage.finished == true) {
					resetCountdown();
					chrome.storage.local.set({ finished: false });
				} else {
					count = Math.max(0, Math.ceil((storage.nextAlarmTime - Date.now()) / 1000));
					remainingTimeForNextWashEl.innerHTML =
						secToMin(count).minutes < 1 ? `${secToMin(count).seconds} seconds` : `${secToMin(count).minutes} minutes`;

					let secondsPassed = 60 - secToMin(count).seconds;
					let minutesPassed = storage.washDelay - secToMin(count).minutes - 1;
					minutesPassed = minutesPassed < 0 ? 0 : minutesPassed;

					timePassedEl.innerHTML = `${minutesPassed} minutes ${secondsPassed} seconds`;

					let timePassed = minutesPassed * 60 + secondsPassed;
					let timeTotal = storage.washDelay * 60;
					updateProgressBar(progressBarEl.querySelector(".bar"), timePassed, timeTotal);
				}
			});
		}

		function resetCountdown() {
			chrome.storage.local.get(["nextSelectedWashDelay", "washDelay"], storage => {
				washDelayInMinutes = storage.nextSelectedWashDelay;
				remainingTimeForNextWashEl.innerHTML = `${washDelayInMinutes} minutes`;
			});
		}

		function updateProgressBar(element, timePassed, timeTotal) {
			let progressBarPercentage = timePassed / timeTotal;
			let progressBarWidth = progressBarPercentage > 1 ? 0 : progressBarPercentage * progressBarEl.offsetWidth;
			if (progressBarPercentage < 0.35) element.style.background = "var(--green)";
			else if (progressBarPercentage > 0.35 && progressBarPercentage < 0.75) element.style.background = "var(--yellow)";
			else if (progressBarPercentage > 0.75) element.style.background = "var(--red)";
			document.documentElement.style.setProperty("--progress-width", `${progressBarWidth}px`);
		}

		function changeDelayStatusDotColor(listOfColorPropNames) {
			if (listOfColorPropNames.length != selectedWashDelayTimerEl.children.length) console.error("list length not matched");

			[...selectedWashDelayTimerEl.children].forEach(() => {
				document.documentElement.style.setProperty(
					"--selected-time-status-color",
					`var(${colorPropertyNames[selectedWashDelayTimerEl.selectedIndex]})`
				);
			});
		}
	},
	false
);
