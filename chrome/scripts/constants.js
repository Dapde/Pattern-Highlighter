/**
 * The object to access the API functions of the browser.
 * @constant
 * @type {{runtime: object, i18n: object}} BrowserAPI
 */
const brw = chrome;

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
 *  - `languages`: An array of ISO 639-1 codes of the languages supported by the detection functions..
 * @constant
 * @type {{
 *  patterns: Array.<{
 *      name: string,
 *      className: string,
 *      detectionFunctions: Array.<Function>,
 *      infoUrl: string,
 *      info: string,
 *      languages: Array.<string>
 *  }>
 * }}
 */
export const patternConfig = {
    patterns: [
        {
            /**
             * Countdown Pattern.
             * Countdown patterns induce (truthfully or falsely) the impression that a product or service is only available for a certain period of time.
             * This is illustrated through a running clock or a lapsing bar.
             * You can watch as the desired good slips away.
             */
            name: brw.i18n.getMessage("patternCountdown_name"),
            className: "countdown",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Countdowns should only be identified as such if they are actively running and not static.
                    // Therefore, it is necessary to check first if there is an old state of the element and if the text in it has changed.
                    if (nodeOld && node.innerText != nodeOld.innerText) {
                        /**
                         * Regular expression for a usual countdown with or without words.
                         * @constant
                         */
                        const reg = /(?:\d{1,2}\s*:\s*){1,3}\d{1,2}|(?:\d{1,2}\s*(?:days?|hours?|minutes?|seconds?|tage?|stunden?|minuten?|sekunden?|[a-zA-Z]{1,3}\.?)(?:\s*und)?\s*){2,4}/gi;

                        /**
                         * Regular expression for strings that match the regular expression for countdowns
                         * but are not countdowns because there are too many numbers.
                         * A maximum of 4 numbers for days, hours, minutes and seconds is expected.
                         * @constant
                         */
                        const regBad = /(?:\d{1,2}\s*:\s*){4,}\d{1,2}|(?:\d{1,2}\s*(?:days?|hours?|minutes?|seconds?|tage?|stunden?|minuten?|sekunden?|[a-zA-Z]{1,3}\.?)(?:\s*und)?\s*){5,}/gi;

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
            infoUrl: brw.i18n.getMessage("patternCountdown_infoUrl"),
            info: brw.i18n.getMessage("patternCountdown_info"),
            languages: [
                "en",
                "de"
            ]
        },
        {
            /**
             * Scarcity Pattern.
             * The Scarcity Pattern induces (truthfully or falsely) the impression that goods or services are only available in limited numbers.
             * The pattern suggests: Buy quickly, otherwise the beautiful product will be gone!
             * Scarcity Patterns are also used in versions where the alleged scarcity is simply invented or
             * where it is not made clear whether the limited availability relates to the product as a whole or only to the contingent of the portal visited.
             */
            name: brw.i18n.getMessage("patternScarcity_name"),
            className: "scarcity",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using a regular expression for the scarcity pattern with English words.
                    // The regular expression checks whether a number is followed by one of several keywords
                    // or alternatively if the word group 'last/final article/item' is present.
                    // The previous state of the element is not used.
                    // Example: "10 pieces available"
                    //          "99% claimed"
                    return /\d+\s*(?:\%|pieces?|pcs\.?|pc\.?|ct\.?|items?)?\s*(?:available|sold|claimed|redeemed)|(?:last|final)\s*(?:article|item)/i.test(node.innerText);
                },
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using a regular expression for the scarcity pattern with German words.
                    // The regular expression checks whether a number is followed by one of several keywords
                    // or alternatively if the word group 'last article' (`letzter\s*Artikel`) is present.
                    // The previous state of the element is not used.
                    // Example: "10 Stück verfügbar"
                    //          "99% eingelöst"
                    return /\d+\s*(?:\%|stücke?|stk\.?)?\s*(?:verfügbar|verkauft|eingelöst)|letzter\s*Artikel/i.test(node.innerText);
                }
            ],
            infoUrl: brw.i18n.getMessage("patternScarcity_infoUrl"),
            info: brw.i18n.getMessage("patternScarcity_info"),
            languages: [
                "en",
                "de"
            ]
        },
        {
            /**
             * Social Proof Pattern.
             * Social Proof is another Dark Pattern of this category.
             * Positive product reviews or activity reports from other users are displayed directly.
             * Often, these reviews or reports are simply made up.
             * But authentic reviews or reports also influence the purchase decision through smart selection and placement.
             */
            name: brw.i18n.getMessage("patternSocialProof_name"),
            className: "social-proof",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using a regular expression for the social proof pattern with English words.
                    // The regular expression checks whether a number is followed by a combination of different keywords.
                    // The previous state of the element is not used.
                    // Example: "5 other customers also bought this article"
                    //          "6 buyers have rated the following products [with 5 stars]"
                    return /\d+\s*(?:other)?\s*(?:customers?|clients?|buyers?|users?|shoppers?|purchasers?|people)\s*(?:have\s+)?\s*(?:(?:also\s*)?(?:bought|purchased|ordered)|(?:rated|reviewed))\s*(?:this|the\s*following)\s*(?:product|article|item)s?/i.test(node.innerText);
                },
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using a regular expression for the social proof pattern with German words.
                    // The regular expression checks whether a number is followed by a combination of different keywords.
                    // The previous state of the element is not used.
                    // Example: "5 andere Kunden kauften auch diesen Artikel"
                    //          "6 Käufer*innen haben folgende Produkte [mit 5 Sternen bewertet]"
                    return /\d+\s*(?:andere)?\s*(?:Kunden?|Käufer|Besteller|Nutzer|Leute|Person(?:en)?)(?:(?:\s*\/\s*)?[_\-\*]?innen)?\s*(?:(?:kauften|bestellten|haben)\s*(?:auch|ebenfalls)?|(?:bewerteten|rezensierten))\s*(?:diese[ns]?|(?:den|die|das)?\s*folgenden?)\s*(?:Produkte?|Artikel)/i.test(node.innerText);
                }
            ],
            infoUrl: brw.i18n.getMessage("patternSocialProof_infoUrl"),
            info: brw.i18n.getMessage("patternSocialProof_info"),
            languages: [
                "en",
                "de"
            ]
        },
        {
            /**
             * Forced Continuity Pattern (adapted to German web pages).
             * The Forced Continuity pattern automatically renews free or low-cost trial subscriptions - but for a fee or at a higher price.
             * The design trick is that the order form visually suggests that there is no charge and conceals the (automatic) follow-up costs.
             */
            name: brw.i18n.getMessage("patternForcedContinuity_name"),
            className: "forced-continuity",
            detectionFunctions: [
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using multiple regular expressions for the forced proof continuity with English words.
                    // The regular expressions check if one of three combinations of a price specification
                    // in Euro, Dollar or Pound and the specification of a month is present.
                    // The previous state of the element is not used.
                    if (/(?:(?:€|EUR|GBP|£|\$|USD)\s*\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:euros?|€|EUR|GBP|£|pounds?(?:\s*sterling)?|\$|USD|dollars?))\s*(?:(?:(?:per|\/|a)\s*month)|(?:p|\/)m)\s*(?:after|from\s*(?:month|day)\s*\d+)/i.test(node.innerText)) {
                        // Example: "$10.99/month after"
                        //          "11 GBP a month from month 4"
                        return true;
                    }
                    if (/(?:(?:€|EUR|GBP|£|\$|USD)\s*\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:euros?|€|EUR|GBP|£|pounds?(?:\s*sterling)?|\$|USD|dollars?))\s*(?:after\s*(?:the)?\s*\d+(?:th|nd|rd|th)?\s*(?:months?|days?)|from\s*(?:month|day)\s*\d+)/i.test(node.innerText)) {
                        // Example: "$10.99 after 12 months"
                        //          "11 GBP from month 4"
                        return true;
                    }
                    if (/(?:after\s*that|then|afterwards|subsequently)\s*(?:(?:€|EUR|GBP|£|\$|USD)\s*\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:euros?|€|EUR|GBP|£|pounds?(?:\s*sterling)?|\$|USD|dollars?))\s*(?:(?:(?:per|\/|a)\s*month)|(?:p|\/)m)/i.test(node.innerText)) {
                        // Example: "after that $23.99 per month"
                        //          "then GBP 10pm"
                        return true;
                    }
                    if (/after\s*(?:the)?\s*\d+(?:th|nd|rd|th)?\s*months?\s*(?:only|just)?\s*(?:(?:€|EUR|GBP|£|\$|USD)\s*\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:euros?|€|EUR|GBP|£|pounds?(?:\s*sterling)?|\$|USD|dollars?))/i.test(node.innerText)) {
                        // Example: "after the 24th months only €23.99"
                        //          "after 6 months $10"
                        return true;
                    }
                    // Return `false` if no regular expression matches.
                    return false;
                },
                function (node, nodeOld) {
                    // Return true if a match is found in the current text of the element,
                    // using multiple regular expressions for the forced proof continuity with German words.
                    // The regular expressions check if one of three combinations of a price specification
                    // in Euro and the specification of a month is present.
                    // The previous state of the element is not used.
                    if (/\d+(?:,\d{2})?\s*(?:Euro|€)\s*(?:(?:pro|im|\/)\s*Monat)?\s*(?:ab\s*(?:dem)?\s*\d+\.\s*Monat|nach\s*\d+\s*(?:Monaten|Tagen)|nach\s*(?:einem|1)\s*Monat)/i.test(node.innerText)) {
                        // Example: "10,99 Euro pro Monat ab dem 12. Monat"
                        //          "11€ nach 30 Tagen"
                        return true;
                    }
                    if (/(?:anschließend|danach)\s*\d+(?:,\d{2})?\s*(?:Euro|€)\s*(?:pro|im|\/)\s*Monat/i.test(node.innerText)) {
                        // Example: "anschließend 23,99€ pro Monat"
                        //          "danach 10 Euro/Monat"
                        return true;
                    }
                    if (/\d+(?:,\d{2})?\s*(?:Euro|€)\s*(?:pro|im|\/)\s*Monat\s*(?:anschließend|danach)/i.test(node.innerText)) {
                        // Example: "23,99€ pro Monat anschließend"
                        //          "10 Euro/Monat danach"
                        return true;
                    }
                    if (/ab(?:\s*dem)?\s*\d+\.\s*Monat(?:\s*nur)?\s*\d+(?:,\d{2})?\s*(?:Euro|€)/i.test(node.innerText)) {
                        // Example: "ab dem 24. Monat nur 23,99 Euro"
                        //          "ab 6. Monat 9,99€"
                        return true;
                    }
                    // Return `false` if no regular expression matches.
                    return false;
                }
            ],
            infoUrl: brw.i18n.getMessage("patternForcedContinuity_infoUrl"),
            info: brw.i18n.getMessage("patternForcedContinuity_info"),
            languages: [
                "en",
                "de"
            ]
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
        // Ensure that the languages are a non-empty array.
        if (!Array.isArray(pattern.languages) || pattern.languages.length <= 0) {
            return false;
        }
        // Check every single language for being a non-empty string.
        for (let language of pattern.languages) {
            // Ensure that the language is a non-empty string.
            if (!language || typeof language !== "string") {
                return false;
            }
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
