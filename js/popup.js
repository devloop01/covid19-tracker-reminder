document.addEventListener(
	"DOMContentLoaded",
	function() {
		// ------------- Starts Here ---------------------------

		console.clear();

		// Tab buttons
		const reminderTabButton = document.querySelector(".app__body--tabbar .reminder-tab");
		const trackerTabButton = document.querySelector(".app__body--tabbar .tracker-tab");

		// Contents
		const reminderContent = document.querySelector(".app__body .reminder-content");
		const trackerContent = document.querySelector(".app__body .tracker-content");

		chrome.storage.local.get(["activeTab"], storage => {
			let activeTab = storage.activeTab || "reminder";
			setCSSProperty(trackerContent, "--transform-transition", "0");
			setCSSProperty(reminderContent, "--transform-transition", "0");
			if (activeTab == "reminder") {
				reminderTabButton.classList.add("active");
				trackerTabButton.classList.remove("active");
				trackerContent.classList.add("hide");
				reminderContent.classList.remove("hide");
			} else if (activeTab == "tracker") {
				trackerTabButton.classList.add("active");
				reminderTabButton.classList.remove("active");
				reminderContent.classList.add("hide");
				trackerContent.classList.remove("hide");
			}
		});

		reminderTabButton.addEventListener("mousedown", () => {
			removeCSSProperty(trackerContent, "--transform-transition");
			removeCSSProperty(reminderContent, "--transform-transition");
			if (!reminderTabButton.classList.contains("active")) {
				reminderTabButton.classList.add("active");
				trackerTabButton.classList.remove("active");
				trackerContent.classList.add("hide");
				reminderContent.classList.remove("hide");
				chrome.storage.local.set({ activeTab: "reminder" });
			}
		});
		trackerTabButton.addEventListener("mousedown", () => {
			removeCSSProperty(trackerContent, "--transform-transition");
			removeCSSProperty(reminderContent, "--transform-transition");
			if (!trackerTabButton.classList.contains("active")) {
				trackerTabButton.classList.add("active");
				reminderTabButton.classList.remove("active");
				reminderContent.classList.add("hide");
				trackerContent.classList.remove("hide");
				chrome.storage.local.set({ activeTab: "tracker" });
			}
		});

		function removeCSSProperty(el, propName) {
			el.style.removeProperty(propName);
		}

		function setCSSProperty(el, propName, value) {
			el.style.setProperty(propName, value);
		}
	},
	false
);
