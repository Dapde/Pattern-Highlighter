/**
 * The object to access the API functions of the browser.
 * @constant
 * @type {{runtime: object, i18n: object}} BrowserAPI
 */
const brw = chrome;

/**
 * This variable will be dynamically populated with the constants from the other module. 
 * Since the import must be dynamic, the variable cannot be declared as a constant.
 * @type {object} A module namespace object
 */
let constants;

// Initialize the extension.
initPatternHighlighter();

/**
 * Initialize the extension in the current tab.
 * @returns {Promise<void>}
 */
async function initPatternHighlighter(){
    // Ask the background script if the extension should be activated in this tab.
    /**
     * The object that contains the activation state of the extension in the current tab.
     * @constant
     * @type {{isEnabled: boolean}} ResponseMessage
     */
    const activationState = await brw.runtime.sendMessage({ action: "getActivationState" });

    // Initialize the extension in the tab if it should be activated.
    if (activationState.isEnabled === true) {

        // Dynamically import the constants from the module.
        constants = await import(await brw.runtime.getURL("scripts/constants.js"));

        // Check if the pattern configuration is valid.
        if (!constants.patternConfigIsValid) {
            // If the configuration is not valid, issue an error message,
            // do not start pattern highlighting, and exit.
            console.error(brw.i18n.getMessage("errorInvalidConfig"));
            return;
        }

        // Print a message that the pattern highlighter has started.
        console.log(brw.i18n.getMessage("infoExtensionStarted"));

        // Run the initial pattern check and highlighting.
        await patternHighlighting();

        // Listen for messages from the popup.
        brw.runtime.onMessage.addListener(
            function (message, sender, sendResponse) {
                // Check which action is requested by the popup.
                if (message.action === "getPatternCount") {
                    // Compute the pattern statistics/counts and send the result as response.
                    sendResponse(getPatternsResults());
                } else if (message.action === "redoPatternHighlighting") {
                    // Run the pattern checking and highlighting again,
                    // send in response that the action has been started.
                    patternHighlighting();
                    sendResponse({ started: true });
                } else if ("showElement" in message) {
                    // Highlight/show a single pattern element that was selected in the popup.
                    showElement(message.showElement);
                    sendResponse({ success: true });
                }
            }
        );
    } else {
        // Print a message that the pattern highlighter is disabled.
        console.log(brw.i18n.getMessage("infoExtensionDisabled"))
    }
}

/**
 * An observer that performs the pattern checking and highlighting after an observed change.
 * @constant
 * @type {MutationObserver}
 */
const observer = new MutationObserver(async function () {
    await patternHighlighting(true);
});

/**
 * The function to identify for patterns on the page. The function uses the detection methods defined in the `patternConfig`.
 * Some HTML tags are ignored (see `tagBlacklist`).
 * If an element is identified as a pattern, two classes are added to it.
 * This will automatically highlight the element using predefined CSS styles.
 * @param {boolean} [waitForChanges=false] A flag to specify whether to wait briefly before executing the function.
 */
async function patternHighlighting(waitForChanges = false) {
    // Check if the pattern detection is already in progress.
    if (this.lock === true) {
        // If the pattern detection is already in progress, exit the function.
        // The result will follow shortly and will be sent automatically to the other parts of the extension.
        return;
    }
    // Lock the function so that it cannot be executed more than once at the same time.
    this.lock = true;

    // Stop monitoring changes on the page with the observer during the pattern identification process.
    observer.disconnect();

    // Wait 2000 milliseconds for subsequent changes after the observer has detected a change.
    if (waitForChanges === true) {
        await new Promise(resolve => { setTimeout(resolve, 2000) });
    }

    // Add pattern highlighter IDs to every element on the page.
    addPhidForEveryElement(document.body);

    // Create a copy of the DOM that can be modified afterwards.
    let domCopyA = document.body.cloneNode(true);
    // Remove unwanted elements from the DOM copy (e.g. audio, video and script elements).
    removeBlacklistNodes(domCopyA);

    // Wait about 1.5 seconds for changes to elements to occur.
    // An example of an expected change is a countdown that counts down every second.
    await new Promise(resolve => { setTimeout(resolve, 1536) });

    // Add pattern highlighter IDs to every element on the page.
    addPhidForEveryElement(document.body);

    // Create a second copy of the DOM. This copy will reflect changes, if there were any.
    let domCopyB = document.body.cloneNode(true);
    // Remove unwanted elements from the second DOM copy.
    removeBlacklistNodes(domCopyB);

    // Reset all found patterns on the page before updating them afterwards.
    resetDetectedPatterns();

    // Identify patterns within the DOM copies. As reference for the current state of the web page `domCopyB` is used.
    // `domCopyA` is used as the previous state of the page to detect changes.
    // If elements are identified as patterns, respective classes are added to them.
    findPatternDeep(domCopyB, domCopyA);

    // Destroy both DOM copies so that they can be removed from memory.
    domCopyA.replaceChildren();
    domCopyA = null;
    domCopyB.replaceChildren();
    domCopyB = null;

    // Send the information about the detected patterns to the other extension scripts.
    sendResults();

    // Watch the entire page for changes in the DOM. All nodes, their attributes and contents are observed.
    // Elements that will be ignored later are also observed.
    // Due to the configuration that contents, i.e. characters, are also observed, it can lead to a situation
    // where the pattern highlighting function is executed at a fixed interval if the page is constantly changing.
    // For this it is enough that there is a dynamic countdown or an active video player with time information on the page.
    // Even changes in the background that are not visible can trigger the callback function of the observer.
    // However, the advantage over a fixed interval is that there are also pages where no changes take place.
    // In this case, no unnecessary operations are performed there.
    observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
    });

    // Finally, unlock the function so that it can be executed again.
    this.lock = false;
}

/**
 * Adds a pattern highlighter ID as a custom HTML attribute to each element of a DOM tree.
 * This ID is unique and makes it possible to find elements even after page changes.
 * If an element already has an ID, it will be kept and no new one will be added.
 * @param {Node} dom The DOM tree to whose elements a unique pattern highlighter ID will be added.
 */
function addPhidForEveryElement(dom) {
    // Create a counter as a static local variable that is initialized once and then reused.
    this.counter = this.counter || 0;
    // Iterate over all the individual DOM nodes.
    for (const node of dom.querySelectorAll("*")) {
        // Add a pattern highlighter ID as a custom attribute if there is none already.
        if (!node.dataset.phid) {
            node.dataset.phid = this.counter;
            // Increment the ID counter.
            this.counter += 1;
        }
    }
}

/**
 * Searches the specified DOM tree for an element with the specified pattern highlighter ID.
 * @param {Node} dom The DOM tree in which to search for the element.
 * @param {number} id The ID of the element to search for.
 * @returns {(Element|null)} The element with the searched ID or `null` if no element with the ID was found.
 */
function getElementByPhid(dom, id) {
    // Return the element on the page with the pattern highlighter ID of `id`.
    return dom.querySelector(`[data-phid="` + id + `"]`)
}

/**
 * Removes all elements on the `tagBlacklist` from the specified DOM tree.
 * @param {Node} dom The DOM tree from which the elements will be removed.
 */
function removeBlacklistNodes(dom) {
    // Iterate over all elements on the page with a tag from the `tagBlacklist`.
    for (const elem of dom.querySelectorAll(constants.tagBlacklist.join(","))) {
        // Remove the element from the DOM.
        elem.remove();
    }
}

/**
 * Checks a DOM node for patterns. This is done using the detection functions defined in the `patternConfig`.
 * @param {Node} node The DOM node to be inspected for patterns.
 * @param {Node} [nodeOld] The previous state of the DOM node to be checked for patterns, if present.
 * @returns {(string|null)} The class name of the pattern type, if one was detected, otherwise `null`.
 */
function findPatterInNode(node, nodeOld) {
    // Iterate over all patterns in the `patternConfig`.
    for (const pattern of constants.patternConfig.patterns) {
        // Iterate over all detection functions for the pattern. Usually is only a single one.
        for (const func of pattern.detectionFunctions) {
            // Pass the two parameters to the detection function and check if the pattern is detected.
            if (func(node, nodeOld)) {
                // If the detection function returns `true`, the respective pattern was detected.
                // The class name of the pattern is returned and the function terminates.
                return pattern.className;
            }
        }
    }
    return null;
}

/**
 * Recursively finds patterns within a DOM tree or node.
 * The recognition functions from the `patternConfig` are used.
 * If elements are identified as patterns, respective classes are added to them.
 * @param {Node} node A DOM node or a complete DOM tree in which to search for patterns.
 * @param {Node} domOld The complete previous state of the DOM tree of the page.
 */
function findPatternDeep(node, domOld) {
    // Iterate over all child nodes of the provided DOM node.
    for (const child of node.children) {
        // Execute the function recursively on each child node.
        findPatternDeep(child, domOld);
    }

    // Extract the previous state of the node from the old DOM. Is `null` if the node did not exist yet.
    let nodeOld = getElementByPhid(domOld, node.dataset.phid);
    // Check if the node represents one of the patterns.
    let foundPattern = findPatterInNode(node, nodeOld);

    // If a pattern is detected, add appropriate classes to the element
    // and remove it from the DOM for the further pattern search.
    if (foundPattern) {
        // Find the element in the original DOM.
        let elem = getElementByPhid(document, node.dataset.phid);
        // Check if the element still exists.
        if (elem) {
            // Add a general class for patterns to the element
            // and a class for the specific pattern the element represents.
            elem.classList.add(
                constants.patternDetectedClassName,
                constants.extensionClassPrefix + foundPattern
            );
        }
        // Remove the previous state of the node, if it exists.
        if (nodeOld) {
            nodeOld.remove();
        }
        // Remove the current state of the node.
        node.remove();
    }
}

/**
 * Removes the classes that are assigned to found patterns from all pattern elements.
 */
function resetDetectedPatterns() {
    // Regular expression to find all classes belonging to the extension.
    let regx = new RegExp("\\b" + constants.extensionClassPrefix + "[^ ]*[ ]?\\b", "g");
    // Iterate over all detected pattern elements.
    document.querySelectorAll("." + constants.patternDetectedClassName).forEach(
        function (node) {
            // Remove all classes belonging to the extension.
            node.className = node.className.replace(regx, "");
        }
    );
}

/**
 * Checks whether an element is visible based on its DOM node.
 * @param {Node} elem DOM node that is checked for visibility.
 * @returns {boolean} `true` if the element is visible, `false` otherwise.
 */
function elementIsVisible(elem) {
    // Get the 'actual' style of the element after applying active stylesheets.
    const computedStyle = getComputedStyle(elem);
    // Check if the element has explicit CSS styles which hide it or make it invisible.
    if (computedStyle.visibility == "hidden" || computedStyle.display == "none" || computedStyle.opacity == "0") {
        // Return `false` if the element is not visible.
        return false;
    }
    // According to the CSS Object Model (CSSOM),
    // all of these three values should return `0`
    // if the element has no layout box and is therefore not visible.
    // Edge cases (false positives) cannot be ruled out, but should be rare.
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
};

/**
 * Creates an object with the counts of detected patterns and
 * the pattern highlighter IDs of the corresponding elements on the page.
 * @returns {object} The object with the information and counts about the detected patterns.
 */
function getPatternsResults() {
    // Initialize the result object with all required keys.
    let results = {
        // An array with the pattern highlighter IDs of the detected elements for each pattern.
        // The elements are divided into two arrays according to the property visible or hidden.
        // Each object in the `patterns` array contains the `name` key with the name of the pattern.
        "patterns": [],
        // The total count of detected elements that represent patterns and are visible on the page.
        "countVisible": 0,
        // The total count of detected elements that represent patterns.
        "count": 0,
    }
    // Iterate over all patterns in the `patternConfig`.
    for (const pattern of constants.patternConfig.patterns) {
        // Array to collect all visible elements to the pattern.
        let elementsVisible = [];
        // Array to collect all hidden elements to the pattern.
        let elementsHidden = [];

        // Iterate over all elements that represent the current pattern.
        for (const elem of document.getElementsByClassName(constants.extensionClassPrefix + pattern.className)) {
            // Depending on whether the element is visible or hidden,
            // add its pattern highlighter ID to the appropriate array.
            if (elementIsVisible(elem)) {
                elementsVisible.push(elem.dataset.phid);
            } else {
                elementsHidden.push(elem.dataset.phid);
            }
        }

        // Add the name of the pattern and the two arrays with the elements as an object to the result object.
        results.patterns.push({
            name: pattern.name,
            elementsVisible: elementsVisible,
            elementsHidden: elementsHidden,
        });

        // Add the number of visible detected elements of the pattern
        // to the total number of visible detected elements.
        results.countVisible += elementsVisible.length;
        // Add the count of detected elements of the pattern to the total count of detected elements.
        results.count += elementsVisible.length + elementsHidden.length;
    }
    // Return the complete result object.
    return results;
}

/**
 * Send the information and counts about the detected patterns to the other extension scripts.
 */
function sendResults() {
    // Create the result object with all information and counts.
    let results = getPatternsResults();

    // Send the object to all other extension scripts. Do nothing in the event of a reply.
    brw.runtime.sendMessage(
        results,
        function (response) { }
    );

    // Print out the number of visible pattern elements.
    console.log(brw.i18n.getMessage("infoNumberPatternsFound", [results.countVisible.toString()]));
}

/**
 * @typedef {object} Position
 * @property {number} left - The offset from the left
 * @property {number} top - The offset from the top
 */
/**
 * Compute the absolute offset of an element on the page using its DOM node.
 * @param {Node} elem DOM node from which the absolute position is determined.
 * @returns {Position}
 */
function getAbsoluteOffsetFromBody(elem) {
    // Get a DOMRect object with the element's position relative to the viewport.
    const rect = elem.getBoundingClientRect();
    // Return the distance of the element to the left and top edge of the page in pixels.
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY
    };
}

/**
 * Shows an element on the page by automatically scrolling so that the element is vertically centered in the viewport.
 * Additionally, a catchy shadow is added for a few seconds, whose appearance is predefined by corresponding CSS styles.
 * @param {number} phid The pattern highlighter ID of the element that will be shown.
 */
function showElement(phid) {
    // Remove all old shadow elements.
    for (const element of document.getElementsByClassName(constants.currentPatternClassName)) {
        element.remove();
    }

    // Get the element to be shown by its ID.
    let elem = getElementByPhid(document, phid);

    // Check if the element with the `phid` exists or if no element with the ID was found.
    if (elem == null) {
        // If the element does not exist, exit the function to prevent errors.
        // Since all components of the extension are constantly updated and receive the new IDs,
        // this case is not really to be expected.
        return;
    }

    // Scroll to the element so that it is displayed in the center of the viewport.
    elem.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
    });

    // Create an element that will be used as a shadow for the pattern element.
    let highlightShadowElem = document.createElement("div");

    // Align it on the page so that it is in the same place on the page
    // with the same size as the pattern element that is shown.
    highlightShadowElem.style.position = "absolute";
    highlightShadowElem.style.height = elem.offsetHeight + "px";
    highlightShadowElem.style.width = elem.offsetWidth + "px";
    let elemXY = getAbsoluteOffsetFromBody(elem);
    highlightShadowElem.style.top = elemXY.top + "px";
    highlightShadowElem.style.left = elemXY.left + "px";

    // Add a class for which there are predefined styles to represent the shadow.
    highlightShadowElem.classList.add(constants.currentPatternClassName);

    // Add the shadow element to the DOM.
    document.body.appendChild(highlightShadowElem);
}
