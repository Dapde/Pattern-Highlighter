/**
 * The object to access the API functions of the browser.
 * @constant
 * @type {{runtime: object, i18n: object}} BrowserAPI
 */
const browser = chrome;

/**
 * Configuration of the pattern detection functions.
 * The following attributes must be specified for each pattern.
 *  - `name`: The name of the pattern that will be displayed on the UI.
 *  - `className`: A valid CSS class name for the pattern (used only internally and not displayed).
 *  - `detectionFunctions`: An array of functions `f(node, nodeOld)` to detect the pattern.
 *      Parameters of the functions are the HTML node to be examined in current and previous state (in this order).
 *      The functions must return `true` if the pattern was detected and `false` if not.
 *  - `infoUrl`: The URL to the explanation of the pattern on the `dapde.de` website.
 *  - `info`: A brief explanation of the pattern.
 * @constant
 * @type {{
 *  patterns: Array.<{
 *      name: string,
 *      className: string,
 *      detectionFunctions: Array.<Function>
 *      infoUrl: string,
 *      info: string
 *  }>
 * }}
 */
export const patternConfig = {
    patterns: [
        {
            /**
             * Countdown Pattern (adapted to German web pages).
             * Countdown patterns induce (truthfully or falsely) the impression that a product or service is only available for a certain period of time.
             * This is illustrated through a running clock or a lapsing bar.
             * You can watch as the desired good slips away.
             */
            name: browser.i18n.getMessage("patternCountdownDE_name"),
            className: "countdown-de",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Countdowns should only be identified as such if they are actively running and not static.
                    // Therefore, it is necessary to check first if there is an old state of the element and if the text in it has changed.
                    if (nodeOld && node.innerText != nodeOld.innerText) {
                        /**
                         * Regular expression for a usual countdown without any words or with German words.
                         * @constant
                         */
                        const reg = /(?:\d{1,2}\s*:\s*){1,3}\d{1,2}|(?:\d{1,2}\s*(?:tage?|stunden?|minuten?|sekunden?|[a-zA-Z]{1,3}\.?)(?:\s*und)?\s*){2,4}/gi;

                        /**
                         * Regular expression for strings that match the regular expression for countdowns
                         * but are not countdowns because there are too many numbers.
                         * A maximum of 4 numbers for days, hours, minutes and seconds is expected.
                         * @constant
                         */
                        const regBad = /(?:\d{1,2}\s*:\s*){4,}\d{1,2}|(?:\d{1,2}\s*(?:tage?|stunden?|minuten?|sekunden?|[a-zA-Z]{1,3}\.?)(?:\s*und)?\s*){5,}/gi;

                        // If matches for "wrong" countdowns are found with the second regular expression,
                        // remove these parts from the string.
                        // Then search for matches for real countdowns in the remaining string.
                        // Do this for the old and current state of the text.
                        let matchesOld = nodeOld.innerText.replace(regBad, "").match(reg);
                        let matchesNew = node.innerText.replace(regBad, "").match(reg);

                        // If no matches were found in one of the two states of the texts or
                        // if the number of matches in the two states does not match,
                        // the element is not classified as a countdown.
                        if (matchesNew == null || matchesOld == null ||
                            (matchesNew != null && matchesOld != null
                                && matchesNew.length != matchesOld.length)) {
                            return false;
                        }

                        // Since it was ensured at the point that there are the same number of matches
                        // in both states of the text, it is initially assumed that the matches with the same index
                        // in both states are the same countdown.
                        for (let i = 0; i < matchesNew.length; i++) {
                            // Extract all contiguous numbers from the strings.
                            // Example: `"23:59:58"` -> `["23", "59", "58"]`.
                            let numbersNew = matchesNew[i].match(/\d+/gi);
                            let numbersOld = matchesOld[i].match(/\d+/gi);

                            // If the number of each number does not match,
                            // then the pair of countdowns does not match.
                            if (numbersNew.length != numbersOld.length) {
                                // Ignore this pair and examine at the next one.
                                continue;
                            }

                            // Iterate through all pairs of numbers in the strings.
                            for (let x = 0; x < numbersNew.length; x++) {
                                // Since countdowns should be detected that are running down,
                                // the numbers from left to right become smaller over time.
                                // When the numbers are iterated from left to right,
                                // at least one number in the current state of the text
                                // should be smaller than in the old state.
                                // If a number in the current state is larger before a number
                                // is smaller than in the previous state, it does not seem to be an elapsing countdown.
                                // Examples: current state - previous state -> result
                                //           23,30,40      - 23,30,39       -> is a countdown
                                //           23,30,00      - 23,29,59       -> is a countdown
                                //           23,30,40      - 23,31,20       -> is not a countdown
                                //           23,30,40      - 23,30,41       -> is not a countdown
                                //           23,30,40      - 23,30,40       -> is not a countdown
                                if (parseInt(numbersNew[x]) > parseInt(numbersOld[x])) {
                                    // If the number in the current state is larger,
                                    // break out of the loop and examine the next pair, if present.
                                    // This case occurs only if the second if-clause did not occur and `true` was returned.
                                    break;
                                }
                                if (parseInt(numbersNew[x]) < parseInt(numbersOld[x])) {
                                    // Return `true` if a number has decreased.
                                    return true;
                                }
                            }
                        }
                    }
                    // Return `false` if no countdown was detected by the previous steps.
                    return false;
                }
            ],
            infoUrl: browser.i18n.getMessage("patternCountdownDE_infoUrl"),
            info: browser.i18n.getMessage("patternCountdownDE_info")
        },
        {
            /**
             * Scarcity Pattern (adapted to German web pages).
             * The Scarcity Pattern induces (truthfully or falsely) the impression that goods or services are only available in limited numbers.
             * The pattern suggests: Buy quickly, otherwise the beautiful product will be gone!
             * Scarcity Patterns are also used in versions where the alleged scarcity is simply invented or
             * where it is not made clear whether the limited availability relates to the product as a whole or only to the contingent of the portal visited.
             */
            name: browser.i18n.getMessage("patternScarcityDE_name"),
            className: "scarcity",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using a simple regular expression for the scarcity pattern with German words.
                    // The regular expression checks whether a number is followed by one of several keywords
                    // or alternatively if the word group 'last article' (`letzter\s*Artikel`) is present.
                    // The previous state of the element is not used.
                    // Example: "10 Stück verfügbar"
                    //          "99% eingelöst"
                    return /\d+\s*(?:\%|stück|stk|stk\.)?\s*(?:verfügbar|verkauft|eingelöst)|letzter\s*Artikel/i.test(node.innerText);
                }
            ],
            infoUrl: browser.i18n.getMessage("patternScarcityDE_infoUrl"),
            info: browser.i18n.getMessage("patternScarcityDE_info")
        },
        {
            /**
             * Social Proof Pattern (adapted to German web pages).
             * Social Proof is another Dark Pattern of this category.
             * Positive product reviews or activity reports from other users are displayed directly.
             * Often, these reviews or reports are simply made up.
             * But authentic reviews or reports also influence the purchase decision through smart selection and placement.
             */
            name: browser.i18n.getMessage("patternSocialProofDE_name"),
            className: "social-proof",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using a simple regular expression for the social proof pattern with German words.
                    // The regular expression checks whether a number is followed by a combination of different keywords.
                    // The previous state of the element is not used.
                    // Example: "5 andere Kunden kauften"
                    //          "6 andere Personen haben folgenden Artikel mit 5 Sternen bewertet"
                    return /\d+\s*(?:andere)?\s*(?:Kunden|Personen)\s*(?:kauften|bewerteten|haben\s*(?:diese(?:n|s)|den|folgende(?:n|s))\s*(?:Produkt|Artikel)\s*mit\s*.{1,20}\s*bewertet)/i.test(node.innerText);
                }
            ],
            infoUrl: browser.i18n.getMessage("patternSocialProofDE_infoUrl"),
            info: browser.i18n.getMessage("patternSocialProofDE_info")
        },
        {
            /**
             * Forced Continuity Pattern (adapted to German web pages).
             * The Forced Continuity pattern automatically renews free or low-cost trial subscriptions - but for a fee or at a higher price.
             * The design trick is that the order form visually suggests that there is no charge and conceals the (automatic) follow-up costs.
             */
            name: browser.i18n.getMessage("patternForcedContinuityDE_name"),
            className: "forced-continuity",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using a simple regular expression for the forced proof continuity with German words.
                    // The regular expression checks if one of three combinations of a price specification
                    // in Euro and the specification of a month is present.
                    // The previous state of the element is not used.
                    // Example: "10,99 Euro ab dem 12. Monat"
                    //          "anschließend 23€ pro Monat"
                    //          "ab dem 24. Monat nur 23,99 Euro"
                    return /\d+(?:,\d{2})?\s*(?:Euro|€)\s*ab\s*(?:dem)?\s*\d+\.\s*Monat|(?:anschließend|danach)\s*\d+(?:,\d{2})?\s*(?:Euro|€)\s*(?:pro|\/)\s*Monat|ab(?:\s*dem)?\s*\d+\.\s*Monat(?:\s*nur)?\s*\d+(?:,\d{2})?\s*(?:Euro|€)/i.test(node.innerText);
                }
            ],
            infoUrl: browser.i18n.getMessage("patternForcedContinuityDE_infoUrl"),
            info: browser.i18n.getMessage("patternForcedContinuityDE_info")
        },
        {
            /**
             * Countdown Pattern (adapted to German web pages).
             * Countdown patterns induce (truthfully or falsely) the impression that a product or service is only available for a certain period of time.
             * This is illustrated through a running clock or a lapsing bar.
             * You can watch as the desired good slips away.
             */
            name: "countdown-en",
            className: "countdown-en",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Countdowns should only be identified as such if they are actively running and not static.
                    // Therefore, it is necessary to check first if there is an old state of the element and if the text in it has changed.
                    if (nodeOld && node.innerText != nodeOld.innerText) {
                        /**
                         * Regular expression for a usual countdown without any words or with German words.
                         * @constant
                         */
                        const reg = /(?:\d{1,2}\s*:\s*){1,3}\d{1,2}|(?:\d{1,2}\s*(?:days?|hours?|minutes?|seconds?|[a-zA-Z]{1,3}\.?)(?:\s*and)?\s*){2,4}/gi;

                        /**
                         * Regular expression for strings that match the regular expression for countdowns
                         * but are not countdowns because there are too many numbers.
                         * A maximum of 4 numbers for days, hours, minutes and seconds is expected.
                         * @constant
                         */
                        const regBad = /(?:\d{1,2}\s*:\s*){4,}\d{1,2}|(?:\d{1,2}\s*(?:days?|hours?|minutes?|seconds?|[a-zA-Z]{1,3}\.?)(?:\s*and)?\s*){5,}/gi;

                        // If matches for "wrong" countdowns are found with the second regular expression,
                        // remove these parts from the string.
                        // Then search for matches for real countdowns in the remaining string.
                        // Do this for the old and current state of the text.
                        let matchesOld = nodeOld.innerText.replace(regBad, "").match(reg);
                        let matchesNew = node.innerText.replace(regBad, "").match(reg);

                        // If no matches were found in one of the two states of the texts or
                        // if the number of matches in the two states does not match,
                        // the element is not classified as a countdown.
                        if (matchesNew == null || matchesOld == null ||
                            (matchesNew != null && matchesOld != null
                                && matchesNew.length != matchesOld.length)) {
                            return false;
                        }

                        // Since it was ensured at the point that there are the same number of matches
                        // in both states of the text, it is initially assumed that the matches with the same index
                        // in both states are the same countdown.
                        for (let i = 0; i < matchesNew.length; i++) {
                            // Extract all contiguous numbers from the strings.
                            // Example: `"23:59:58"` -> `["23", "59", "58"]`.
                            let numbersNew = matchesNew[i].match(/\d+/gi);
                            let numbersOld = matchesOld[i].match(/\d+/gi);

                            // If the number of each number does not match,
                            // then the pair of countdowns does not match.
                            if (numbersNew.length != numbersOld.length) {
                                // Ignore this pair and examine at the next one.
                                continue;
                            }

                            // Iterate through all pairs of numbers in the strings.
                            for (let x = 0; x < numbersNew.length; x++) {
                                // Since countdowns should be detected that are running down,
                                // the numbers from left to right become smaller over time.
                                // When the numbers are iterated from left to right,
                                // at least one number in the current state of the text
                                // should be smaller than in the old state.
                                // If a number in the current state is larger before a number
                                // is smaller than in the previous state, it does not seem to be an elapsing countdown.
                                // Examples: current state - previous state -> result
                                //           23,30,40      - 23,30,39       -> is a countdown
                                //           23,30,00      - 23,29,59       -> is a countdown
                                //           23,30,40      - 23,31,20       -> is not a countdown
                                //           23,30,40      - 23,30,41       -> is not a countdown
                                //           23,30,40      - 23,30,40       -> is not a countdown
                                if (parseInt(numbersNew[x]) > parseInt(numbersOld[x])) {
                                    // If the number in the current state is larger,
                                    // break out of the loop and examine the next pair, if present.
                                    // This case occurs only if the second if-clause did not occur and `true` was returned.
                                    break;
                                }
                                if (parseInt(numbersNew[x]) < parseInt(numbersOld[x])) {
                                    // Return `true` if a number has decreased.
                                    return true;
                                }
                            }
                        }
                    }
                    // Return `false` if no countdown was detected by the previous steps.
                    return false;
                }
            ],
            infoUrl: browser.i18n.getMessage("patternCountdownDE_infoUrl"),
            info: browser.i18n.getMessage("patternCountdownDE_info")
        },
        {
            /**
             * Scarcity Pattern (adapted to German web pages).
             * The Scarcity Pattern induces (truthfully or falsely) the impression that goods or services are only available in limited numbers.
             * The pattern suggests: Buy quickly, otherwise the beautiful product will be gone!
             * Scarcity Patterns are also used in versions where the alleged scarcity is simply invented or
             * where it is not made clear whether the limited availability relates to the product as a whole or only to the contingent of the portal visited.
             */
            name: "scarcity-en",
            className: "scarcity-en",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using a simple regular expression for the scarcity pattern with German words.
                    // The regular expression checks whether a number is followed by one of several keywords
                    // or alternatively if the word group 'last article' (`letzter\s*Artikel`) is present.
                    // The previous state of the element is not used.
                    // Example: "10 Stück verfügbar"
                    //          "99% eingelöst"
                    return /\d+\s*(?:\%|pieces?|pcs\.?|pc\.?|ct\.?|items?)?\s*(?:available|sold|claimed|redeemed)|(?:last|final)\s*(?:article|item)/i.test(node.innerText);
                }
            ],
            infoUrl: browser.i18n.getMessage("patternScarcityDE_infoUrl"),
            info: browser.i18n.getMessage("patternScarcityDE_info")
        },
        {
            /**
             * Social Proof Pattern (adapted to German web pages).
             * Social Proof is another Dark Pattern of this category.
             * Positive product reviews or activity reports from other users are displayed directly.
             * Often, these reviews or reports are simply made up.
             * But authentic reviews or reports also influence the purchase decision through smart selection and placement.
             */
            name: "social-proof-en",
            className: "social-proof-en",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using a simple regular expression for the social proof pattern with German words.
                    // The regular expression checks whether a number is followed by a combination of different keywords.
                    // The previous state of the element is not used.
                    // Example: "5 andere Kunden kauften"
                    //          "6 andere Personen haben folgenden Artikel mit 5 Sternen bewertet"
                    return /\d+\s*(?:other)?\s*(?:customers?|clients?|buyers?|users?|shoppers?|people)\s*(?:have\s+)?\s*(?:(?:also\s*)?(?:bought|purchased|ordered)|(?:rated|reviewed))\s*(?:this|the\s*following)\s*(?:product|article|item)s?/i.test(node.innerText);
                }
            ],
            infoUrl: browser.i18n.getMessage("patternSocialProofDE_infoUrl"),
            info: browser.i18n.getMessage("patternSocialProofDE_info")
        },
        {
            /**
             * Forced Continuity Pattern (adapted to German web pages).
             * The Forced Continuity pattern automatically renews free or low-cost trial subscriptions - but for a fee or at a higher price.
             * The design trick is that the order form visually suggests that there is no charge and conceals the (automatic) follow-up costs.
             */
            name: "forced-continuity-en",
            className: "forced-continuity-en",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using a simple regular expression for the forced proof continuity with German words.
                    // The regular expression checks if one of three combinations of a price specification
                    // in Euro and the specification of a month is present.
                    // The previous state of the element is not used.
                    // Example: "10,99 Euro ab dem 12. Monat"
                    //          "anschließend 23€ pro Monat"
                    //          "ab dem 24. Monat nur 23,99 Euro"

                    // (?:(?:€|EUR|GBP|£|\$|USD)\s*\d+(?:,\d{2})?|\d+(?:,\d{2})?\s*(?:euros?|€|EUR|GBP|£|pounds?(?:\s*sterling)?|\$|USD|dollars?))\s*(?:(?:per|\/|p)\s*(?:month|m))?\s*after\s*(?:the)?\s*\d+(?:th|nd|rd|th)?\s*months?
                    // (?:after\s*that|then|afterwards|subsequently)\s*(?:(?:€|EUR|GBP|£|\$|USD)\s*\d+(?:,\d{2})?|\d+(?:,\d{2})?\s*(?:euros?|€|EUR|GBP|£|pounds?(?:\s*sterling)?|\$|USD|dollars?))\s*(?:(?:(?:per|\/|a)\s*month)|(?:p|\/)m)
                    // after\s*(?:the)?\s*\d+(?:th|nd|rd|th)?\s*months?\s*(?:only|just)?\s*(?:(?:€|EUR|GBP|£|\$|USD)\s*\d+(?:,\d{2})?|\d+(?:,\d{2})?\s*(?:euros?|€|EUR|GBP|£|pounds?(?:\s*sterling)?|\$|USD|dollars?))

                    return /(?:(?:€|EUR|GBP|£|\$|USD)\s*\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:euros?|€|EUR|GBP|£|pounds?(?:\s*sterling)?|\$|USD|dollars?))\s*(?:(?:per|\/|p)\s*(?:month|m))?\s*after\s*(?:the)?\s*\d+(?:th|nd|rd|th)?\s*months?|(?:after\s*that|then|afterwards|subsequently)\s*(?:(?:€|EUR|GBP|£|\$|USD)\s*\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:euros?|€|EUR|GBP|£|pounds?(?:\s*sterling)?|\$|USD|dollars?))\s*(?:(?:(?:per|\/|a)\s*month)|(?:p|\/)m)|after\s*(?:the)?\s*\d+(?:th|nd|rd|th)?\s*months?\s*(?:only|just)?\s*(?:(?:€|EUR|GBP|£|\$|USD)\s*\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:euros?|€|EUR|GBP|£|pounds?(?:\s*sterling)?|\$|USD|dollars?))/i.test(node.innerText);
                }
            ],
            infoUrl: browser.i18n.getMessage("patternForcedContinuityDE_infoUrl"),
            info: browser.i18n.getMessage("patternForcedContinuityDE_info")
        }
    ]
}

/**
 * Checks if the `patternConfig` is valid.
 * @returns {boolean} `true` if the `patternConfig` is valid, `false` otherwise.
 */
function validatePatternConfig() {
    // Create an array with the names of the configured patterns.
    let names = patternConfig.patterns.map(p => p.name);
    // Check if there are duplicate names.
    if ((new Set(names)).size !== names.length) {
        // If there are duplicate names, the configuration is invalid.
        return false;
    }
    // Check every single configured pattern for validity.
    for (let pattern of patternConfig.patterns) {
        // Ensure that the name is a non-empty string.
        if (!pattern.name || typeof pattern.name !== "string") {
            return false;
        }
        // Ensure that the class name is a non-empty string.
        if (!pattern.className || typeof pattern.className !== "string") {
            return false;
        }
        // Ensure that the detection functions are a non-empty array.
        if (!Array.isArray(pattern.detectionFunctions) || pattern.detectionFunctions.length <= 0) {
            return false;
        }
        // Check every single configured detection function for validity.
        for (let detectionFunc of pattern.detectionFunctions) {
            // Ensure that the detection function is a function with two arguments.
            if (typeof detectionFunc !== "function" || detectionFunc.length !== 2) {
                return false;
            }
        }
        // Ensure that the info URL is a non-empty string.
        if (!pattern.infoUrl || typeof pattern.infoUrl !== "string") {
            return false;
        }
        // Ensure that the info/explanation is a non-empty string.
        if (!pattern.info || typeof pattern.info !== "string") {
            return false;
        }
    }
    // If all checks have been passed successfully, the configuration is valid and `true` is returned.
    return true;
}

/**
 * @type {boolean} `true` if the `patternConfig` is valid, `false` otherwise.
 */
export const patternConfigIsValid = validatePatternConfig();

/**
 * Prefix for all CSS classes that are added to elements on websites by the extension.
 * @constant
 */
export const extensionClassPrefix = "__ph__";

/**
 * The class that is added to elements detected as patterns.
 * Elements with this class get a black border from the CSS styles.
 * @constant
 */
export const patternDetectedClassName = extensionClassPrefix + "pattern-detected";

/**
 * A class for the elements created as shadows for pattern elements
 * for displaying individual elements using the popup.
 */
export const currentPatternClassName = extensionClassPrefix + "current-pattern";

/**
 * A list of HTML tags that should be ignored during pattern detection.
 * The elements with these tags are removed from the DOM copy.
 */
export const tagBlacklist = ["script", "style", "noscript", "audio", "video"];
