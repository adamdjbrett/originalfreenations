import "@royalfig/share-button";

const syncShareButtonTheme = () => {
	const dark = document.documentElement.dataset.theme === "dark";
	document.querySelectorAll("share-button").forEach((button) => {
		button.darkMode = dark ? "true" : "false";
	});
};

syncShareButtonTheme();
new MutationObserver(syncShareButtonTheme).observe(document.documentElement, {
	attributes: true,
	attributeFilter: ["data-theme"],
});
