console.clear();

const textContainers = document.querySelectorAll(".text-container");

textContainers.forEach(textContainer => {
	let totalTextCount = textContainer.getAttribute("data-text-count");
	let elText = textContainer.getAttribute("data-text");
	for (let i = 0; i < totalTextCount; i++) {
		let textEl = document.createElement("span");
		textEl.className = "text";
		textEl.setAttribute("style", `--animation-delay: ${i == totalTextCount ? (i = 0) : i * 400}ms`);
		let textLength = elText.length;
		for (let j = 0; j < textLength; j++) {
			let charEl = document.createElement("span");
			charEl.className = "char";
			charEl.innerHTML = elText[j];
			if (elText[j] == " ") charEl.style.width = textLength / 18 + "vw";
			textEl.append(charEl);
		}
		textContainer.append(textEl);
	}
});

const background = document.querySelector(".background");
const timerEl = document.getElementById("timer");
const infoEl = document.querySelector(".info");
const startButton = document.getElementById("start-btn");
const continueButton = document.getElementById("continue-btn");
const virusContainer = document.querySelector(".virus-container");

continueButton.addEventListener("click", () => {
	chrome.storage.local.get(["tabMode", "totalTimesWashed"], storage => {
		if (storage.tabMode == true) {
			chrome.tabs.getCurrent(tab => {
				chrome.tabs.remove(tab.id);
			});
		} else {
			chrome.windows.getCurrent(win => {
				chrome.windows.remove(win.id);
			});
		}
		chrome.storage.local.set({ totalTimesWashed: storage.totalTimesWashed + 1 });

		const port = chrome.runtime.connect({ name: "timer" });
		port.postMessage({ resetTime: true });
	});
});

let sortedChildsFromBottom;
function sortChildsFromBottom() {
	sortedChildsFromBottom = [...virusContainer.children].sort(
		(a, b) => parseInt(getComputedStyle(b).top.split(".")[0]) - getComputedStyle(a).top.split(".")[0]
	);
}

function removeVirus(remainingHeight, viruses) {
	viruses.forEach(virus => {
		let y = parseInt(getComputedStyle(virus).top.split(".")[0]);
		let r = parseInt(virus.style.getPropertyValue("--size").split(".")[0]) / 2;
		if (remainingHeight - 40 < y + r) {
			setTimeout(function() {
				virus.classList.add("remove");
				virus.classList.remove("shake");
			}, 500);
		}
	});
}

let progressBarPercentage;
function updateProgressBackground(element, timePassed, timeTotal) {
	progressBarPercentage = timePassed / timeTotal;
	element.style.transform = `scaleY(${progressBarPercentage})`;
}

startButton.addEventListener("click", () => {
	infoEl.classList.add("hide");
	startTimer();
});

function startTimer() {
	const minutes = 1;
	const seconds = minutes * 60;
	let time = seconds;
	let setTime = function() {
		let mins = Math.floor(time / 60);
		let secs = time % 60;
		timerEl.innerHTML = secs == 0 ? `${mins}:00` : `${mins}:${secs < 10 ? "0" + secs : secs}`;
		updateProgressBackground(background, seconds - time, seconds);
		background.style.opacity = "1";
		sortedChildsFromBottom.forEach(c => c.classList.add("shake"));
		if (time === 0) {
			clearInterval(timerFunc);
			timerFinished();
		}
		time--;
	};
	setTime();
	let timerFunc = setInterval(setTime, 1000);

	setInterval(function() {
		let progressBarHeight = progressBarPercentage * document.body.clientHeight;
		removeVirus(Math.abs(progressBarHeight - document.body.clientHeight), sortedChildsFromBottom);
	}, 100);
}

function timerFinished() {
	continueButton.classList.remove("hide");
}

function pushViruses(el, n) {
	for (let i = 0; i < n; i++) {
		let randX = Math.random() * el.clientWidth;
		let randY = Math.random() * el.clientHeight;
		let randSize = 50 + Math.random() * 100;

		let virusImage = document.createElement("img");
		virusImage.src = "images/virus.svg";
		virusImage.style.position = "absolute";
		virusImage.setAttribute("style", `--size: ${randSize}px`);
		virusImage.style.transform = `rotate(${Math.random() * 360}deg)`;
		virusImage.style.top = `${randY}px`;
		virusImage.style.left = `${randX}px`;
		el.appendChild(virusImage);
		if (i == n - 1) sortChildsFromBottom();
	}
}
pushViruses(virusContainer, 70);
