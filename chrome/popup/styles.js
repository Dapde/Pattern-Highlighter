// Import the required components from the Lit Library 
import { css, unsafeCSS } from '../scripts/lit/lit-core.min.js';

/**
 * The object to access the API functions of the browser.
 * @constant
 * @type {{runtime: object, tabs: object, i18n: object}} BrowserAPI
 */
const brw = chrome;

export const sharedStyles = css`
    div {
        margin: 20px auto;
    }

    a:link,
    a:visited {
        color: inherit;
    }

    h2 {
        margin: 0.5em 0;
    }

    * {
        font-family: "Trebuchet MS", "Arial", sans-serif;
    }
`;

export const patternLinkStyles = css`
    a {
        text-decoration: none;
        cursor: pointer;
    }

    a:hover {
        text-decoration: underline;
    }
`;

export const actionButtonStyles = css`
    div span {
        color: #217284;
        font-weight: bold;
        cursor: pointer;
        text-decoration: none;
    }

    div span:hover {
        text-decoration: underline;
    }

    @media (prefers-color-scheme: dark) {
        div {
            color: #33bfde;
        }
    }
`;

export const patternsListStyles = css`
    ul {
        list-style-type: none;
        padding: 0;
    }

    li {
        margin: 10px 0;
    }
`;

// On/Off Flipswitch from https://proto.io/freebies/onoff/
export const onOffSwitchStyles = css`
    div {
        position: relative;
        width: 90px;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }

    input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
    }

    label {
        display: block;
        overflow: hidden;
        border: 2px solid #000000;
        border-radius: 50px;
    }

    input:enabled+label {
        cursor: pointer;
    }

    input:disabled+label {
        cursor: not-allowed;
    }

    .onoffswitch-inner {
        display: block;
        width: 200%;
        margin-left: -100%;
    }

    .onoffswitch-inner:before,
    .onoffswitch-inner:after {
        display: block;
        float: left;
        width: 50%;
        height: 30px;
        padding: 0;
        line-height: 30px;
        font-size: 14px;
        color: white;
        font-family: Trebuchet, Arial, sans-serif;
        font-weight: bold;
        box-sizing: border-box;
    }

    .onoffswitch-inner:before {
        content: "${unsafeCSS(brw.i18n.getMessage("buttonOnState"))}";
        padding-left: 10px;
        background-color: #34A7C1;
        color: #FFFFFF;
    }

    .onoffswitch-inner:after {
        content: "${unsafeCSS(brw.i18n.getMessage("buttonOffState"))}";
        padding-right: 10px;
        background-color: #EEEEEE;
        color: #999999;
        text-align: right;
    }

    .onoffswitch-switch {
        display: block;
        width: 18px;
        margin: 6px;
        background: #FFFFFF;
        position: absolute;
        top: 0;
        bottom: 0;
        right: 56px;
        border: 2px solid #000000;
        border-radius: 50px;
    }

    input:checked+label .onoffswitch-inner {
        margin-left: 0;
    }

    input:checked+label .onoffswitch-switch {
        right: 0px;
    }

    @media (prefers-color-scheme: dark) { 
        label {
            border: 2px solid #FFFFFF;
        }
    
        .onoffswitch-inner:before {
            background-color: #33bfde;
            color: #000000;
        }
    }
`;
