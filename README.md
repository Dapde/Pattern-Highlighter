![Logo Banner](images/banner.png)

# Dapde Pattern Highlighter Browser Extension
This tool, developed by the informatics part of the [dapde-project](https://dapde.de/), is intended to help consumers to navigate the internet in a way similar to an ad blocker. However, the highlighter differs from ad blockers in one crucial aspect: it does not block individual dark patterns on websites but highlights them so that consumers become aware of the influences affecting them. In addition, the tool informs about the type of pattern.

## Contents
- [Features](#features)
- [Video and Screenshots](#video-and-screenshots)
- [How it works](#how-it-works)
- [Browser Compatibility](#browser-compatibility)
- [Installation](#installation)
- [Libraries Used](#libraries-used)
- [License](#license)
- [About Dapde](#about-dapde)

## Features
- Automatic detection of dark patterns on web pages
- Highlighting of suspicious elements with minimal impact on page appearance
- Popup window providing information on detected dark patterns, including their category and an explanation
- No blocking of web page content
- Extension icon displaying number of detected dark patterns
- Function to individually highlight each detected dark pattern
- Supporting multiple languages (currently English and German available)

## Video and Screenshots
[![Teaser Video](images/video_thumbnail.png)](https://dapde.de/en/news-en/dapde-dark-pattern-highlighter-en/)
Click on the image or [here](https://dapde.de/en/news-en/dapde-dark-pattern-highlighter-en/) to watch the teaser video for the Pattern Highlighter.

|                                                                                         ![Highlighting Example](images/example.png)                                                                                         |                                                                                      ![Pattern Highlighter Popup](images/popup.png)                                                                                      |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| *Example of a web site with two highlighted dark patterns. The black border highlights a countdown and a scarcity pattern element (from left to right). \*Some web site details were manually removed from the screenshot.* | *The popup window of the extension. The popup window can be used to disable and enable the highlighting. Additionally, information about the detected patterns is displayed and each one can be highlighted separately.* |

## How it works
The Pattern Highlighter works entirely locally in the browser and does not connect to any servers. When visiting a web page, the extension injects a small script that creates an internal temporary copy of the entire web page i.e. its HTML DOM. After a short pause (about 1.5 seconds) a second copy is created. Subsequently, all elements of these copies are examined individually and in combination with child elements using the implemented pattern detection methods. The pattern detection methods decide whether an element is a specific dark pattern or not. The reason for creating two copies with a time gap is to detect changes on the web page. This makes it possible to detect certain patterns such as countdowns.

Mainly responsible for the results of the pattern detection are the mentioned detection functions. These are centrally defined in the `patternConfig` object together with information about the associated patterns in [`constants.js`](chrome/scripts/constants.js). This `patternConfig` object can be extended arbitrarily by additional patterns and functions, according to the requirements that are commented in [`constants.js`](chrome/scripts/constants.js).

Currently, one detection function each is implemented for the four following patterns.
- [Countdown](https://dapde.de/en/dark-patterns-en/types-and-examples-en/druck2-en/)
- [Scarcity](https://dapde.de/en/dark-patterns-en/types-and-examples-en/druck2-en/)
- [Social Proof](https://dapde.de/en/dark-patterns-en/types-and-examples-en/druck2-en/)
- [Forced Continuity](https://dapde.de/en/dark-patterns-en/types-and-examples-en/operativer-zwang2-en/)

Right now, all of the four detection functions are optimized for German and English websites and cannot be applied to websites in other languages.

## Browser Compatibility
| Browser         	| Is compatible? 	| Tested versions                                                               	|
|-----------------	|:--------------:	|-------------------------------------------------------------------------------	|
| <img src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/chrome.svg" width="20px" style="background: white; border: 2px solid white" /> Google Chrome   	|        ✅       	| <ul><li>112.0.5615.137 (Mac/arm64)</li><li>112.0.5615.138 (Win/x64)</li></ul> 	|
| <img src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/edge.svg" width="24px" style="background: white" /> Microsoft Edge  	|        ✅       	| <ul><li>112.0.1722.54 (Mac/arm64)</li><li>112.0.1722.48 (Win/x64)</li></ul>   	|
| <img src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/safari.svg" width="24px" style="background: white" /> Safari          	|        ✅       	| <ul><li>16.3 (18614.4.6.1.6) (Mac/arm64)</ul></li>                            	|
| <img src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/firefox.svg" width="24px" style="background: white" /> Mozilla Firefox 	|        ❌       	|                                                                               	|
| <img src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/opera.svg" width="24px" style="background: white" /> Opera           	|        ✅       	| <ul><li>98.0.4759.6 (Mac/arm64)</li><li>98.0.4759.6 (Win/x64)</ul></li>       	|

### Firefox
Firefox only supports non-persistent background scripts and pages for extension in Manifest V3. The Pattern Highlighter uses the background.js script as a service worker in the background. This service worker corresponds to a persistent background script which is not supported by Firefox.

To get the extension compatible with Firefox, it would be necessary to convert the service worker to a non-persistent background script (also called event page). All variables that are currently stored and managed persistently by the service worker would have to be stored in the browser's local storage using the browser API. In the case of the Pattern Highlighter, it would make sense to implement all the functions of the service worker (setting badge texts, checking activation) directly in the content script. This would avoid the background script entirely and the Pattern Highlighter would presumably be compatible with all listed browsers on the same code base.

### Safari
The Pattern Highlighter is fully compatible with Safari. However, Safari uses its own format for extension, which differs from the other browsers. Therefore, the code of the Pattern Highlighter must first be converted to a Safari extension. This can conveniently be done automatically and is described in the section on [installation in Safari](#safari-1).

## Installation
To install the extension, the repository or the `chrome` folder must be downloaded. Since the extension is not loaded from the stores of the browser providers, it must be installed in the developer mode of the browsers. For this, the individual steps for the different tested browsers are listed below.

### Chrome
1. Go to the Extensions page by entering `chrome://extensions` in a new tab.
   - Alternatively, click on the Extensions menu puzzle button and select **Manage Extensions** at the bottom of the menu.
   - Or, click the Chrome menu, hover over **More Tools**, then select **Extensions**.
2. Enable Developer Mode by clicking the toggle switch next to **Developer mode**.
3. Click the **Load unpacked** button and select the `chrome` directory.

### Edge
1. Go to the Extensions page by entering `edge://extensions` in a new tab.
   - Alternatively, click the **Settings and more (...)** button, select **Extensions** and click **Manage extensions** on the opened popup.
2. Enable Developer Mode by clicking the toggle switch next to **Developer mode**.
3. Click the **Load unpacked** button and select the `chrome` directory.

### Safari
In order to install the extension in Safari, it must first be converted into the compatible format. This requires an Xcode installation. To convert the Pattern Highlighter to a Safari extension, follow these steps.

1. Open a terminal window and navigate to the path of the repository (one directory level above the `chrome` folder).
2. Execute the following command: `xcrun safari-web-extension-converter --macos-only --project-location safari chrome`. ([More information about the command.](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari#3586260))
3. The command should have created a new folder named `safari` containing the Xcode project for extension. Also, a Xcode window should have opened. In Xcode, click the Run button, or choose **Product** > **Run** to build and run your app.
4. Now the developer menu in Safari has to be activated and unsigned extensions have to be allowed. The necessary steps are explained [here](https://developer.apple.com/documentation/safariservices/safari_web_extensions/running_your_safari_web_extension#3744467).

### Opera
1. Go to the browser address bar and type `opera://extensions` (or use the <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> shortcut).
2. Enable Developer Mode by clicking the toggle switch next to **Developer mode**.
3. Click the **Load unpacked** button and select the `chrome` directory.

## Libraries Used
- [Lit 2.7.2](https://lit.dev/) ([BSD-3-Clause](chrome/scripts/lit/LICENSE))

## License
[MIT](LICENSE)

## About Dapde
The Dark Pattern Detection Project (Dapde) examines the manipulation of consumers in a digital environment through "dark patterns".

### Dark Patterns
Dark patterns are design patterns that lead users to act in a certain way that is contrary to their interests, exploiting design power unilaterally in the interests of their creator.

### The Project
Dapde is a joint project between the Institute of Computer Science at Heidelberg University and the German Research Institute for Public Administration in Speyer (FÖV). The Informatics Section tackles the challenge of recognizing dark patterns in online interactions with the aim of warning users of dangers early on. The Law Section develops legal answers to the challenges of steering consumers through dark patterns.

### Dapde Website
More information about our project and dark patterns can be found on our [website](https://dapde.de/).
