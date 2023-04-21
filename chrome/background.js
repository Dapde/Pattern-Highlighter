/**
 * The object to access the API functions of the browser.
 * @constant
 * @type {{runtime: object, tabs: object, action: object}} BrowserAPI
 */
const browser = chrome;

/**
 * A dictionary where for each tab ID a boolean is stored that shows if the extension is enabled in the tab.
 * @type {Object.<number, boolean>}
 */
let extensionActivation = {}

// Add event listeners for messages from other scripts of the extension.
// The defined callback function is executed when a message is received from the content or popup script.
browser.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
        if ("countVisible" in message) {
            // If the count of visible detected patterns is included in the message,
            // then the count on the icon in the browser bar should be updated.

            // Check if the extension should actually be active for the tab.
            // The case where such a message is received from a tab where the extension is supposed to be disabled
            // is expected only if the extension has been disabled but the tab has not been reloaded yet.
            if (!(extensionActivation[sender.tab.id] === false)) {
                // Update the number of patterns detected on the icon
                // for the tab from which the message was received.
                displayPatternCount(message.countVisible, sender.tab.id);
            }
            // Send a simple reply with confirmation of successful execution.
            sendResponse({ success: true });

        } else if ("enableExtension" in message && "tabId" in message) {
            // If the message contains the key `enableExtension` and a tab ID,
            // the activation state of the extension should be set for the respective tab.

            // Set the activation state of the extension for the tab.
            extensionActivation[message.tabId] = message.enableExtension;
            // If the extension should be disabled for the tab,
            // no number should be displayed on the icon anymore.
            if (message.enableExtension === false) {
                // Update the pattern count on the icon to an empty string.
                displayPatternCount("", message.tabId);
            }
            // Send a simple reply with confirmation of successful execution.
            sendResponse({ success: true });

        } else if ("action" in message && message.action == "getActivationState") {
            // If the message contains the `action` key with the value `getActivationState`,
            // the activation state of the corresponding tab should be sent as a response.

            // Declare the variable for the tab ID.
            let tabId;
            if ("tabId" in message) {
                // If the Tab ID is included in the message, use it.
                // This is the case if the message was sent from the popup.
                tabId = message.tabId;
            } else {
                // If the tab ID is not included in the message, extract it from the `sender` object.
                // This is the case if the message was sent from the content script in a tab.
                tabId = sender.tab.id;
            }
            // If there is no activation state saved for the tab yet, set it to active.
            if (!(tabId in extensionActivation)) {
                extensionActivation[tabId] = true;
            }
            // Respond with the activation state of the tab.
            sendResponse({ isEnabled: extensionActivation[tabId] });

        } else {
            // Send a simple reply with the message on failed processing of the message,
            // if a message without expected content was received.
            sendResponse({ success: false });
        }
    }
);

// Add an event handler that handles tab ID changes.
// It is not really clear when and how often this event occurs.
// The documentation states the following (https://developer.chrome.com/docs/extensions/reference/tabs/#event-onReplaced):
// "Fired when a tab is replaced with another tab due to prerendering or instant.".
browser.tabs.onReplaced.addListener(function (addedTabId, removedTabId) {
    // Save the activation state of the old tab ID for the new tab ID.
    extensionActivation[addedTabId] = extensionActivation[removedTabId];
    // Delete the activation state of the old tab ID.
    delete extensionActivation[removedTabId];
});

// Add an event handler that handles the closing of tabs.
// When a tab is closed, the activation state should be reset, i.e. deleted.
browser.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    // Delete the activation state of the closed tab ID.
    delete extensionActivation[tabId];
});

/**
 * A dictionary in which the paths to the extension's icon in different resolutions are specified.
 * Is read directly from the manifest file.
 * @type {Object.<number, string>}
 */
let icons_default = browser.runtime.getManifest().icons;
/**
 * A dictionary in which the paths to the extension's grayed out icon, which is used when the extension
 * is disabled, are specified in different resolutions.
 * @type {Object.<number, string>}
 */
let icons_disabled = {};

// Generate the paths to the gray version of the icon using the paths of the default icon.
for (let resolution in icons_default) {
    icons_disabled[resolution] = `${icons_default[resolution].slice(0, -4)}_grey.png`;
}

// Add an event handler that processes updates from tabs.
// With this event can be used to capture changes to the URL.
// This allows to detect whether the extension should be enabled in a tab or not.
browser.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // If the tab contains a web page loaded with HTTP(S), the default icon should be displayed.
    // Otherwise the content script is not enabled and therefore the extension is disabled.
    // In this case, a gray version of the icon should be displayed.
    if (tab.url.toLowerCase().startsWith("http://") || tab.url.toLowerCase().startsWith("https://")) {
        // Set the default icon for the tab.
        browser.action.setIcon({
            path: icons_default,
            tabId: tabId
        });
    } else {
        // Set the gray icon for the tab.
        browser.action.setIcon({
            path: icons_disabled,
            tabId: tabId
        });
    }
});

/**
 * Displays the number of detected pattern elements as a number on the extension's icon in the browser bar.
 * If the number is 0, the background of the number is set to green, otherwise it is red.
 * @param {(number|"")} count The amount of detected pattern elements.
 * @param {number} tabId The ID of the tab in which the count should be displayed on the icon.
 */
function displayPatternCount(count, tabId) {
    // Set the text on the icon (badge) of the specified tab to the count passed.
    browser.action.setBadgeText({
        tabId: tabId,
        text: "" + count
    });

    // Set the background color of the icon text to red as default [r, g, b, alpha].
    let bgColor = [255, 0, 0, 255];
    // If no patterns were detected, change the background color to green.
    if (count == 0) {
        // // Set the background color of the icon text to green.
        bgColor = [0, 255, 0, 255];
    }
    // Set the background color for the icon text of the specified tab.
    browser.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: bgColor
    });
}
