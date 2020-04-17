document.addEventListener(
	"DOMContentLoaded",
	function () {
		// -----------------------------------------------------------------------
		// --------------------- TRACKER SCRIPTS ---------------------------------------------
		// -------------------------------------------------------

		const refreshButton = document.querySelector("button.refresh");
		const locationInputEl = document.querySelector(".tracker-content #location");
		const locationsListEl = document.querySelector(".tracker-content #locations-list");
		const trackerAppActionsContainerEl = document.querySelector(
			".tracker-content .app__body--actions"
		);
		const API_URL = "https://corona.lmao.ninja/v2";

		let animating = false;
		let allLocationNames = [];
		let dataLoaded = false;
		let dataObj = {
			infected: 0,
			recovered: 0,
			deaths: 0,
		};

		let mostInfectedCountryData, mostDeathsCountryData;

		let searchedLocation = locationInputEl.value;
		let isValidLocation = true;
		const counterStepAnimationDuration = 550;
		let lastUpdated,
			showedLastUpdatedTime = false;

		function initCoronaTracker() {
			chrome.storage.local.get(["searchedLocation"], (storage) => {
				if (storage.searchedLocation != undefined) {
					searchedLocation = storage.searchedLocation;
				}
				locationInputEl.value = searchedLocation;

				while (trackerAppActionsContainerEl.firstChild.tagName != "BUTTON") {
					trackerAppActionsContainerEl.removeChild(
						trackerAppActionsContainerEl.firstChild
					);
				}

				changeRefreshButtonAnimationState(dataLoaded == false);
				addLocationsToDatalist(locationsListEl);
				fetchLocationDetails(searchedLocation);
				updateLastUpdatedTime();
				updateMostEffected();
				refreshButton.style.background = "var(--btn-disabled-background)";
			});
		}
		initCoronaTracker();

		refreshButton.addEventListener("click", () => {
			if (locationInputEl.value.length == 0) {
				showInfoIfNoLocationIsEntered();
			} else if (!isValidLocation) {
				showInfoIfLocationIsNotValid();
			} else if (searchedLocation.toLowerCase() == locationInputEl.value.toLowerCase()) {
				showInfoIfDataIsUpdated();
			} else if (
				searchedLocation.toLowerCase() != locationInputEl.value.toLowerCase() &&
				isValidLocation
			) {
				fetchLocationDetails(locationInputEl.value);
			}
		});

		locationInputEl.addEventListener("keydown", (e) => {
			const ENTER_KEYCODE = 13;
			if (e.keyCode == ENTER_KEYCODE && isValidLocation == true) {
				if (searchedLocation.toLowerCase() != locationInputEl.value.toLowerCase()) {
					console.log("getting data for new location");
					fetchLocationDetails(locationInputEl.value);
				} else {
					showInfoIfDataIsUpdated();
				}
				searchedLocation = locationInputEl.value;
				chrome.storage.local.set({ searchedLocation: locationInputEl.value });
			} else if (
				e.keyCode == ENTER_KEYCODE &&
				isValidLocation == false &&
				!locationInputEl.value.length == 0
			) {
				showInfoIfLocationIsNotValid();
				locationInputEl.classList.add("shake");
				removeClassAfterAnimationCompletes(locationInputEl, "shake");
			} else if (e.keyCode == ENTER_KEYCODE && locationInputEl.value.length == 0) {
				showInfoIfNoLocationIsEntered();
			}
		});

		locationInputEl.addEventListener("input", () => {
			isValidLocation = checkIfitemExitsInList(locationInputEl.value, allLocationNames);
			if (isValidLocation) {
				locationInputEl.removeAttribute("data-not-valid", "");
				locationInputEl.setAttribute("data-valid", "");
			} else {
				locationInputEl.setAttribute("data-not-valid", "");
				locationInputEl.removeAttribute("data-valid", "");
			}
		});

		function fetchLocationDetails(location) {
			changeRefreshButtonAnimationState(dataLoaded == false || animating == false);
			showEffectedChange(location.toLowerCase() == "world" ? "world" : location);
			if (location.length == 0) return;

			let url =
				location.toLowerCase() == "world"
					? `${API_URL}/all`
					: `${API_URL}/countries/${location.toLowerCase()}`;
			console.log("fetching", url);
			fetch(url)
				.then((res) => res.json())
				.then((data) => {
					updateData(data);
					updateApp(dataObj);
					dataLoaded = true;
					if (location.toLowerCase() == "world") {
						chrome.storage.local.set({
							totalInfected: data.cases,
							totalRecovered: data.recovered,
							totalDeaths: data.deaths,
						});
					}
				})
				.catch(() => {
					failedToFetchData();
					console.log("Falied to fetch data!");
				});
		}

		function updateData(data) {
			dataObj.infected = data.cases;
			dataObj.recovered = data.recovered;
			dataObj.deaths = data.deaths;
		}

		function updateApp(data) {
			let confirmedCasesEl = document.querySelector("#infected"),
				recoveredEl = document.querySelector("#recovered"),
				deathsEl = document.querySelector("#deaths");

			console.log("updating App");

			animateValue(
				confirmedCasesEl,
				parseInt(confirmedCasesEl.innerHTML),
				data.infected,
				counterStepAnimationDuration
			);
			animateValue(
				recoveredEl,
				parseInt(recoveredEl.innerHTML),
				data.recovered,
				counterStepAnimationDuration
			);
			animateValue(
				deathsEl,
				parseInt(deathsEl.innerHTML),
				data.deaths,
				counterStepAnimationDuration
			);
		}

		function addLocationsToDatalist(dataList) {
			fetch(`${API_URL}/countries/`)
				.then((res) => res.json())
				.then((data) => data.map((d) => d.country))
				.then((countryNamesList) => {
					allLocationNames.push(...countryNamesList, "World");
				})
				.then(() => {
					removeChild(dataList);
					allLocationNames.forEach((country) => {
						let option = document.createElement("option");
						option.innerHTML = country;
						dataList.appendChild(option);
					});
				})
				.catch(() => {
					console.error("could not get locations");
				});
		}

		function updateMostEffected() {
			fetch(`${API_URL}/countries`)
				.then((res) => res.json())
				.then((data) =>
					data.map((d) => {
						return {
							country: d.country,
							cases: d.cases,
							deaths: d.deaths,
						};
					})
				)
				.then((listOfData) => {
					mostInfectedCountryData = listOfData.sort((a, b) => b.cases - a.cases)[0];
					mostDeathsCountryData = listOfData.sort((a, b) => b.deaths - a.deaths)[0];
				})
				.then(() => {
					const mostEffectedContainer = document.querySelector(".info.most-effected");
					const mostInfectedCountryEl = document.getElementById("most-infected-country");
					const mostDeathsCountryEl = document.getElementById("most-deaths-country");
					mostInfectedCountryEl.innerHTML = mostInfectedCountryData.country;
					mostDeathsCountryEl.innerHTML = mostDeathsCountryData.country;
					mostEffectedContainer.classList.add("show");
				});
		}

		function updateLastUpdatedTime() {
			return fetch(`${API_URL}/all`)
				.then((res) => res.json())
				.then((data) => data.updated)
				.then((updatedTime) => {
					let localeDate = new Date(updatedTime).toLocaleDateString(),
						localeTime = new Date(updatedTime).toLocaleTimeString(),
						timeIn12Format = change24To12HourFormat(localeTime, ":");
					lastUpdated = `${localeDate} | ${timeIn12Format}`;
					if (showedLastUpdatedTime == false) {
						showInfoText(
							trackerAppActionsContainerEl,
							`Last updated : ${lastUpdated}`,
							2500
						);
						showedLastUpdatedTime = true;
					}
				})
				.catch((err) => {
					console.log(err, "could not update last updated time");
				});
		}

		function failedToFetchData() {
			refreshButton.style.background = "var(--btn-failed-background)";
			refreshButton.querySelector(".btn-info").innerHTML = "could not load";
			refreshButton.querySelector(".icon.refresh").classList.remove("loading");
			refreshButton.querySelector(".icon.refresh").style.display = "none";
			refreshButton.querySelector(".icon.cross").style.display = "";
			showInfoText(
				trackerAppActionsContainerEl,
				"check your connection!",
				2000,
				"rgba(255, 0, 0, 1)"
			);

			refreshButton.addEventListener("click", () => {
				refreshButton.querySelector(".btn-info").innerHTML = "refresh";
				refreshButton.style.background = "var(--btn-normal-background)";
			});
		}

		function showInfoIfDataIsUpdated() {
			console.log("already updated");
			showInfoText(trackerAppActionsContainerEl, "already updated!", 1500);
		}

		function showInfoIfNoLocationIsEntered() {
			console.log("enter something");
			showInfoText(trackerAppActionsContainerEl, "Enter something!", 1500);
		}

		function showInfoIfLocationIsNotValid() {
			console.log("Location not found");
			showInfoText(
				trackerAppActionsContainerEl,
				"Location not found!",
				1500,
				"rgba(255, 0, 0, 1)"
			);
		}

		function showInfoText(parent, text, duration, color) {
			while (parent.firstChild.tagName != "BUTTON") {
				parent.removeChild(parent.firstChild);
			}
			let el = document.createElement("span");
			if (color) el.style.color = color;
			else el.style.color = "rgba(255, 255, 255, 0.75)";
			el.innerHTML = text;
			el.className = "info-text";
			el.classList.add("show");
			parent.insertAdjacentElement("afterbegin", el);
			setTimeout(function () {
				el.classList.remove("show");
			}, duration);
		}

		function showEffectedChange(location) {
			let todayCases, todayRecovered, todayDeaths;
			if (location == "world") {
				chrome.storage.local.get(
					["totalInfected", "totalRecovered", "totalDeaths"],
					(storage) => {
						if (
							storage.totalInfected != 0 &&
							storage.totalRecovered != 0 &&
							storage.totalDeaths != 0
						) {
							let prevData, newData;
							fetch(`${API_URL}/all`)
								.then((res) => res.json())
								.then((data) => {
									prevData = {
										infected: storage.totalInfected,
										recovered: storage.totalRecovered,
										deaths: storage.totalDeaths,
									};
									newData = {
										infected: data.cases,
										recovered: data.recovered,
										deaths: data.deaths,
									};
								})
								.then(() => {
									todayCases = newData.infected - prevData.infected;
									todayRecovered = newData.recovered - prevData.recovered;
									todayDeaths = newData.deaths - prevData.deaths;
								})
								.then(showChange);
						}
					}
				);
			} else {
				fetch(`${API_URL}/countries/${location}`)
					.then((res) => res.json())
					.then((data) => {
						todayCases = data.todayCases;
						todayDeaths = data.todayDeaths;
					})
					.then(showChange);
			}
			function showChange() {
				setTimeout(() => {
					const animDurationInSec = 3;
					const infectedChangeEl = document.getElementById("infected-change"),
						recoveredChangeEl = document.getElementById("recovered-change"),
						deathsChangeEl = document.getElementById("deaths-change");

					if (todayCases != 0 && todayCases != undefined)
						addClassAndChangeHTML(infectedChangeEl, todayCases, "show");
					if (todayRecovered != 0 && todayRecovered != undefined)
						addClassAndChangeHTML(recoveredChangeEl, todayRecovered, "show");
					if (todayDeaths != 0 && todayDeaths != undefined)
						addClassAndChangeHTML(deathsChangeEl, todayDeaths, "show");

					setTimeout(function () {
						infectedChangeEl.classList.remove("show");
						recoveredChangeEl.classList.remove("show");
						deathsChangeEl.classList.remove("show");
					}, animDurationInSec * 1000);
				}, counterStepAnimationDuration + 850);
			}
			function addClassAndChangeHTML(el, HTML, className) {
				el.classList.add(className);
				el.innerHTML = HTML;
			}
		}

		function checkIfitemExitsInList(item, list) {
			for (let i = 0; i < list.length; i++) {
				if (item.toLowerCase() == list[i].toLowerCase()) {
					return true;
				}
			}
			return false;
		}

		function changeRefreshButtonAnimationState(isAnimating) {
			refreshButton.querySelector(".icon.refresh").style.display = "";
			refreshButton.querySelector(".icon.cross").style.display = "none";
			refreshButton.style.background = "var(--btn-disabled-background)";
			if (isAnimating) {
				refreshButton.disabled = true;
				locationInputEl.disabled = true;
				refreshButton.querySelector(".btn-info").innerHTML = "Refreshing";
				refreshButton.querySelector(".icon.refresh").classList.add("loading");
			}
			if (!isAnimating) {
				refreshButton.disabled = false;
				locationInputEl.disabled = false;
				refreshButton.querySelector(".btn-info").innerHTML = "Refresh data";
				refreshButton.querySelector(".icon.refresh").classList.remove("loading");
			}
		}

		function animateValue(el, start, end, duration) {
			// source : https://stackoverflow.com/questions/16994662/count-animation-from-number-a-to-b
			animating = true;
			changeRefreshButtonAnimationState(animating);
			let range = end - start;
			let minTimer = 50;
			let stepTime = Math.abs(Math.floor(duration / range));
			stepTime = Math.max(stepTime, minTimer);
			let startTime = new Date().getTime();
			let endTime = startTime + duration;
			let timer;
			function run() {
				let now = new Date().getTime();
				let remaining = Math.max((endTime - now) / duration, 0);
				let value = Math.round(end - remaining * range);
				el.innerHTML = value;
				if (value == end) {
					clearInterval(timer);
					animating = false;
					changeRefreshButtonAnimationState(animating);
					refreshButton.style.background = "var(--btn-normal-background)";
				}
			}
			timer = setInterval(run, stepTime);
			run();
		}

		function removeClassAfterAnimationCompletes(el, className) {
			let elStyles = window.getComputedStyle(el);
			setTimeout(function () {
				el.classList.remove(className);
			}, +elStyles.animationDuration.replace("s", "") * 1000);
		}

		function removeChild(parent) {
			while (parent.firstChild) {
				parent.removeChild(parent.firstChild);
			}
		}

		function change24To12HourFormat(timeString, separator) {
			let timeArray = timeString.split(separator);
			let hoursIn12 = String(parseInt(timeArray[0]) % 12);
			hoursIn12 = timeArray[0] == 0 ? 12 : hoursIn12;
			let AmOrPm = timeArray[0] >= 12 ? "pm" : "am";
			timeArray[0] = hoursIn12;
			return timeArray.join(separator) + ` ${AmOrPm}`;
		}
	},
	false
);
