/**
 * The object to access the API functions of the browser.
 * @constant
 * @type {{runtime: object, tabs: object, action: object}} BrowserAPI
 */
const brw = chrome;

/**
 * The prefix for the keys in the session storage under which the activation state of the tabs is stored.
 * @constant
 * @type {string}
 */
const activationPrefix = "activation_";

/**
 * The object to access the browser storage API.
 * If no session storage is supported, use local storage (Firefox).
 * @constant
 * @type {object}
 */
const storage = brw.storage.session ? brw.storage.session : brw.storage.local;

/**
 * Retrieves the activation state for a tab from the session storage and returns it.
 * @param {number} tabId The ID of the tab of which the activation state should be retrieved.
 * @returns {Promise<boolean|undefined>} `true` if the extension is activated,
 * `false` if it is deactivated or `undefined` if the activation has not yet been set (new tab).
 */
async function getActivation(tabId){
    // Load the activation state from the session storage.
    // Compose the key from the `activationPrefix` and the `tabId`.
    // Since only one key in the storage is requested, the object contains exactly one or no value.
    // Therefore, the first value of the object is accessed directly.
    // If no value exists, the access returns `undefined`.
    return Object.values(await storage.get(`${activationPrefix}${tabId}`))[0];
}

/**
 * Sets the active state for a tab in the session storage.
 * @param {number} tabId The ID of the tab of which the activation state should be set.
 * @param {boolean} activation `true` if the extension should be activated,
 * `false` if it should be deactivated.
 */
async function setActivation(tabId, activation){
    // Set the activation state in the session storage.
    // Compose the key from the `activationPrefix` and the `tabId`.
    return await storage.set({[`${activationPrefix}${tabId}`]: activation});
}

/**
 * Removes the activation state for a tab from the session storage.
 * Used when a tab is closed.
 * @param {number} tabId The ID of the tab of which the activation state should be removed.
 */
async function removeActivation(tabId){
    // Remove the activation state from the session storage.
    // Compose the key from the `activationPrefix` and the `tabId`.
    return await storage.remove(`${activationPrefix}${tabId}`);
}

/**
 * Retrieves the activation state for a tab from the session storage and returns it.
 * Sets the activation state to `true` (activated) if it is not already set (new tab).
 * @param {number} tabId The ID of the tab of which the activation state should be retrieved.
 * @returns {Promise<boolean>} `true` if the extension is activated, `false` if it is deactivated.
 */
async function getActivationOrSetDefault(tabId){
    // Load the activation state from the session storage.
    let activation = await getActivation(tabId);

    // If there is no activation state saved for the tab yet, set it to active.
    if (activation === undefined){
        // Set the variable to `true` so that this will be returned later.
        activation = true;
        // Set the activation state in the session storage to `true` (active).
        await setActivation(tabId, activation);
    };

    // Return the activation state for the tab.
    return activation;
}

// Add event listeners for messages from other scripts of the extension.
// The defined callback function is executed when a message is received from the content or popup script.
brw.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
        if ("countVisible" in message) {
            // If the count of visible detected patterns is included in the message,
            // then the count on the icon in the browser bar should be updated.

            // Check if the extension should actually be active for the tab.
            // The case where this message is received from a tab that is not activated is unexpected.
            // To be on the safe side, it is checked anyway.
            getActivation(sender.tab.id).then((activation) => {
                if (activation === true){
                    // Update the number of patterns detected on the icon
                    // for the tab from which the message was received.
                    displayPatternCount(message.countVisible, sender.tab.id);
                }
                // Send a simple reply with confirmation of successful execution.
                sendResponse({ success: true });
            });

        } else if ("enableExtension" in message && "tabId" in message) {
            // If the message contains the key `enableExtension` and a tab ID,
            // the activation state of the extension should be set for the respective tab.

            // Set the activation state of the extension for the tab.
            setActivation(message.tabId, message.enableExtension).then(() => {
                // If the extension should be disabled for the tab,
                // no number should be displayed on the icon anymore.
                if (message.enableExtension === false) {
                    // Update the pattern count on the icon to an empty string.
                    displayPatternCount("", message.tabId);
                }
                // Send a simple reply with confirmation of successful execution.
                sendResponse({ success: true });
            });

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

            getActivationOrSetDefault(tabId).then((activation) => {
                // Respond with the activation state of the tab.
                sendResponse({ isEnabled: activation });
            });

        } else {
            // Send a simple reply with the message on failed processing of the message,
            // if a message without expected content was received.
            sendResponse({ success: false });
        }

        // In order for the sender to wait for a response,
        // `true` must be returned in order to use `sendResponse()` asynchronously.
        // See https://developer.chrome.com/docs/extensions/mv3/messaging/#simple.
        return true;
    }
);

// Add an event handler that handles tab ID changes.
// It is not really clear when and how often this event occurs.
// The documentation states the following (https://developer.chrome.com/docs/extensions/reference/tabs/#event-onReplaced):
// "Fired when a tab is replaced with another tab due to prerendering or instant.".
brw.tabs.onReplaced.addListener(async function (addedTabId, removedTabId) {
    // Save the activation state of the old tab ID for the new tab ID.
    await setActivation(addedTabId, await getActivation(removedTabId));
    // Delete the activation state of the old tab ID.
    await removeActivation(removedTabId);
});

// Add an event handler that handles the closing of tabs.
// When a tab is closed, the activation state should be reset, i.e. deleted.
brw.tabs.onRemoved.addListener(async function (tabId, removeInfo) {
    // Delete the activation state of the closed tab ID.
    await removeActivation(tabId);
});

/**
 * A dictionary in which the paths to the extension's icon in different resolutions are specified.
 * Is read directly from the manifest file.
 * @type {Object.<number, string>}
 */
let icons_default = brw.runtime.getManifest().icons;
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
brw.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // If the tab contains a web page loaded with HTTP(S), the default icon should be displayed.
    // Otherwise the content script is not enabled and therefore the extension is disabled.
    // In this case, a gray version of the icon should be displayed.
    if (tab.url.toLowerCase().startsWith("http://") || tab.url.toLowerCase().startsWith("https://")) {
        // Set the default icon for the tab.
        brw.action.setIcon({
            path: icons_default,
            tabId: tabId
        });
    } else {
        // Set the gray icon for the tab.
        brw.action.setIcon({
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
    brw.action.setBadgeText({
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
    brw.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: bgColor
    });
}
