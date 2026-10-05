/*
 The SAMPLE CODE is NOT a Thales product and NOT under any Support and Maintainance contract 
 or agreement. Thales takes no liability or responsibilty for damages due to errors in this code.
 This SAMPLE CODE is NOT under any license agreement by Thales or other parties or under any open 
 source agreements. Third party libraries maybe used by reference, but are never embedded in the
 source code. A modified version of this library or part of the source code below can be used. 
 However, the library MUST NOT be shared with other parties that have no commercial agreement with
 Thales. This library is provided free of charge.
*/
window.ThalesThinLib = (function () {
    "use strict";

    const VERSION = "6.0.4";
    console.log("Loaded ThalesThinLib v: " + VERSION);

    //*** Image capture    
    const DEFAULT_DOC_QUALITY = 0.92;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", {
        alpha: false,
        willReadFrequently: true,
    });

    //*** Image size
    const TD1_WIDTH = 3.37;
    const TD1_HEIGHT = 2.13;
    const TD2_WIDTH = 4.13;
    const TD2_HEIGHT = 2.91;
    const TD3_WIDTH = 4.92;
    const TD3_HEIGHT = 3.46;
    const FACE_IMAGE_WIDTH = 1080;
    const FACE_IMAGE_HEIGHT = FACE_IMAGE_WIDTH / 1.5;
    const A4_WIDTH = 11.7;
    const A4_HEIGHT = 8.3;

    //*** SDK Document capture
    const DEFAULT_MAX_RETRIES = 2;
    const DEFAULT_MAX_CAPTURES = 5;
    const DEFAULT_MAX_FACE_CAPTURES = 5;

    const DEFAULT_DETECT_MAX_TIME_SMART = 3 * 1000;
    const DEFAULT_DETECT_MAX_TIME_SMART_FACE = 2 * 1000;
    const DEFAULT_AUTO_CAPTURE_TOGGLE_DELAY = 200;

    //The ID indicates a permanent ID of the device
    const STOREID = "ThalesThinLibId";
    //Temporary ID indicates the ID of a given capture and verification session
    const STORETEMPID = "ThalesThinLibIdTemp";

    //*** Variables
    let debugLogger = null;
    let disableDebugger = false;
    let globalSession = null;
    let deviceModel = null;
    let isSdkInitialized = false;
    const initMobileAttributes = window.navigator && window.navigator.maxTouchPoints > 0
        ? window.navigator.maxTouchPoints
        : null;
    let latestDeviceCaps = null;
    let latestDeviceSets = null;
    let latestDeviceList = null;

    function getImageFromData(imageData, width, height, quality) {
        const qual = quality || 1.0;
        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(imageData, 0, 0);
        const data = canvas.toDataURL("image/jpeg", qual);
        ctx.clearRect(0, 0, width, height);
        return data;
    }

    function getDataFromImage(image) {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(0, 0, image.width, image.height);
        ctx.clearRect(0, 0, image.width, image.height);
        return data;
    }

    function getDevices() {
        return new Promise(async (resolve) => {
            try {
                //Otherwise camear devices configured in browser
                if (
                    !navigator.mediaDevices ||
                    !navigator.mediaDevices.enumerateDevices
                ) {
                    log("Cannot enumerate cameras");
                    resolve(null);
                    return;
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                if (devices) {
                    let cameras = [];
                    for (let i = 0; i < devices.length; ++i) {
                        if (devices[i].kind === "videoinput") {
                            cameras.push({
                                name: devices[i].label,
                                deviceId: devices[i].deviceId,
                            });
                        }
                    }
                    if (cameras.length > 0) {
                        resolve(cameras);
                        return;
                    }
                }
                log("No cameras found");
                resolve(null);
            } catch (err) {
                log("Error while enumerating cameras: " + err);
                resolve(null);
            }
        });
    }

    function getLogId(channel, isSameCapture) {
        const MAXRNDID = 100000000;
        //Add Persistent Session ID
        let id = Math.floor(Math.random() * (MAXRNDID - 1) + 1);
        let tempId = Math.floor(Math.random() * (MAXRNDID - 1) + 1);
        if (window.sessionStorage) {
            try {
                const storedId = window.sessionStorage.getItem(STOREID);
                if (!storedId) {
                    window.sessionStorage.setItem(STOREID, id);
                    log("No Log ID found in the session storage");
                } else {
                    id = storedId;
                }
                const storedTempId = window.sessionStorage.getItem(STORETEMPID);
                //If asked again on same capture, return same ID
                if (isSameCapture) {
                    if (!storedTempId) {
                        window.sessionStorage.setItem(STORETEMPID, tempId);
                        log("No Temp Log ID found in the session storage");
                    } else {
                        tempId = storedTempId;
                    }
                }
            } catch (err) {
                log("Cannot use session storage to get Log ID: " + err);
            }
        }
        return {
            id: id,
            sessionId: tempId,
            channel: channel,
        };
    }

    function platform() {
        if (!window.navigator || !window.navigator.userAgent) {
            log("Cannot get window.navigator.userAgent");
            return ThalesThinLib.ENUM.NONE;
        }
        const userAgent = window.navigator.userAgent.toUpperCase();
        if (userAgent.includes("IPAD") || userAgent.includes("IPHONE")) {
            return ThalesThinLib.ENUM.IOS;
        }
        if (userAgent.includes("ANDROID")) {
            return ThalesThinLib.ENUM.ANDROID;
        }
        return ThalesThinLib.ENUM.DESKTOP;
    }

    function newSession(prevSession) {
        const currSession = prevSession ? prevSession : globalSession;
        //Use a global variable, to support use cases where the session is handled internally
        globalSession = { internal: {} };
        if (currSession && currSession.internal) {
            //Do not create an .id so a new one can be created
            globalSession.internal.isDetectInit = currSession.internal.isDetectInit;
            globalSession.internal.isDetectInitFace = currSession.internal.isDetectInitFace;
            if (currSession.internal.onlyFace) {
                globalSession.internal.isFace = globalSession.internal.onlyFace = true;
            }
        }
        //Remove temp ID in order to use new one
        try {
            window.sessionStorage.removeItem(STORETEMPID);
        } catch (err) {
            log("Temp Log ID couldn't be removed");
        }
        //Reset capture attempts
        globalSession.internal.captureAttempts = 0;
        globalSession.internal.captureBackAttempts = 0;
        globalSession.internal.captureFaceAttempts = 0;
        log("New session");
        //This is returned, in case the app wants to manage this additionally
        return globalSession;
    }

    function isNoImage(sdkResult) {
        return !sdkResult || !sdkResult.image || !sdkResult.image.data;
    }

    function isNotSharp(sdkResult) {
        return !sdkResult.sharpness
    }

    function isGlare(sdkResult) {
        return !sdkResult.glare;
    }

    function isLowRes(sdkResult) {
        return !sdkResult.dpi;
    }

    function getErrorCode(sdkResult, options) {
        //Check for SDK errors
        if (sdkResult && sdkResult.sdkError) {
            switch (sdkResult.sdkError) {
                //Check if specific camera error
                case "NotAllowedError":
                    return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_DENIED;
                case "OverconstrainedError":
                    return ThalesThinLib.ENUM.CAMERA_PARAMS_ERR;
                case "ManualCancelled":
                    return ThalesThinLib.ENUM.ERROR_CLOSE_BTN;
                default:
                    return sdkResult.sdkError;
            }
        }
        if (sdkResult && sdkResult.isFace) {
            //No image quality errors on face
            return null;
        } else {
            //Check for SDK results
            if (isNoImage(sdkResult)) {
                return ThalesThinLib.ENUM.NO_IMAGE;
            } else if (!options.skipDpi && isLowRes(sdkResult)) {
                return ThalesThinLib.ENUM.LOW_RES;
            } else if (!options.skipSharpness && isNotSharp(sdkResult)) {
                return ThalesThinLib.ENUM.LOW_SHARPNESS;
            } else if (!options.skipGlare && isGlare(sdkResult)) {
                return ThalesThinLib.ENUM.HIGH_GLARE;
            }
        }
        return null;
    }

    function log(text) {
        if (disableDebugger) {
            return;
        }
        const SEPARATOR = "#$#$#";
        const now = Date.now();
        let txt =
            "[Thales][" +
            new Date(now).getHours() +
            ":" +
            new Date(now).getMinutes() +
            ":" +
            new Date(now).getSeconds() +
            "::" +
            new Date(now).getMilliseconds() +
            "] " +
            text;
        console.log(txt);
        if (debugLogger) {
            //Could be an HTML element with 'value' field
            //or a global variable like window.allMyLogs = {value: ""}
            debugLogger.value = debugLogger.value + SEPARATOR + txt;
        }
    }

    function setLogger(logger, disable) {
        if (logger) {
            debugLogger = logger;
        }
        if (disable !== undefined && disable !== null) {
            disableDebugger = disable;
        }
    }

    async function capture(options) {
        return new Promise((resolve, reject) => {
            //Get session
            const session = globalSession;
            globalSession = session;
            try {
                //Avoid multilpe error handling
                let alreadyDone = false;
                let isEnding = false;
                //Set the promises
                let finalResolve;
                let finalReject;
                const finalPromise = new Promise((intRes, intRej) => {
                    finalResolve = intRes;
                    finalReject = intRej;
                });
                let processResolve;
                let processReject;
                const processPromise = new Promise((intRes, intRej) => {
                    processResolve = intRes;
                    processReject = intRej;
                });
                //Check options
                if (!options) {
                    log("Options object is mandatory. Aborting!");
                    reject(ThalesThinLib.ENUM.SDK_CONFIG_ERROR);
                    onDone({ sdkError: ThalesThinLib.ENUM.SDK_CONFIG_ERROR });
                    return;
                }
                if (!options.init) options.init = {};

                const doFace = !options.init.onlyDocument;
                const doDoc = !options.init.onlyFace;

                const fillRootColor = options.init.fillRootColor || "black";
                const zIndexRoot = options.init.zIndex || 1000;
                const SmartCaptureLib = "SmartCaptureLib";

                let startCapture = Date.now();

                //Check if face capture should occur
                session.internal.isFace =
                    options.init.onlyDocument !== true &&
                    (options.init.onlyFace === true ||
                        session.internal.isDone);
                //Initialize isBack
                if (
                    session.internal.isBack === undefined ||
                    session.internal.isBack === null
                ) {
                    session.internal.isBack = false;
                }
                //Check and initialize isDone
                if (session.internal.isFace) {
                    session.internal.isDone = true;
                } else if (
                    session.internal.isDone === undefined ||
                    session.internal.isDone === null
                ) {
                    session.internal.isDone = false;
                }
                //Check and initialize isFaceDone
                if (
                    session.internal.isFaceDone === undefined ||
                    session.internal.isFaceDone === null ||
                    !session.internal.isFace
                ) {
                    session.internal.isFaceDone = false;
                }
                //Set variable to determine the object fields dependent on side
                const side = session.internal.isFace
                    ? "Face"
                    : session.internal.isBack
                        ? "Back"
                        : "";

                //Set other session data
                if (!session.internal.errors) {
                    session.internal.errors = {};
                }
                session.internal.id = session.internal.id || getLogId(options.init.channel, true);
                session.internal.device = {
                    platform: platform(),
                    model: deviceModel,
                    userAgent:
                        window.navigator && window.navigator.userAgent
                            ? window.navigator.userAgent
                            : null,
                    brands:
                        window.navigator &&
                            window.navigator.userAgentData &&
                            window.navigator.userAgentData.brands &&
                            window.navigator.userAgentData.brands.length > 0
                            ? window.navigator.userAgentData.brands
                            : null,
                    attrs: initMobileAttributes,
                };

                session.internal.camera = {
                    capabilities: latestDeviceCaps,
                    settings: latestDeviceSets,
                    list: latestDeviceList,
                };
                //If device model is not present, retrieve it async
                if (!deviceModel) {
                    checkDeviceModel().then((dm) => {
                        deviceModel = dm;
                    });
                }

                //Initialize session object
                session.internal.timestamp = Date.now();
                session.internal.uiShown = false;
                session.internal.lastEvent = session.internal.isFace
                    ? ThalesThinLib.ENUM.EVENT_CAPTURE_FACE
                    : session.internal.isBack
                        ? ThalesThinLib.ENUM.EVENT_CAPTURE_BACK
                        : ThalesThinLib.ENUM.EVENT_CAPTURE_FRONT;
                session.internal.sdkVersion = "Unknown";
                session.internal.sdkVersionFace = "Unknown";
                //Set max SDK attempts for tap to capture use case
                session.internal.maxSdkAttempts = options.tapToCaptureConfig && options.tapToCaptureConfig.maxSdkAttempts
                    ? options.tapToCaptureConfig.maxSdkAttempts
                    : DEFAULT_MAX_RETRIES;
                //If first time or retry in a new session
                if (!session.internal.sdkAttempts || session.internal.sdkAttempts <= 0 || session.internal.finalAttempt) {
                    //Reset SDK attempts to maximum
                    session.internal.sdkAttempts = session.internal.maxSdkAttempts;
                    //remove any previous results
                    session.internal["bestResult" + side] = null;
                }
                //Reset tracking of final attempt (attempts depleted or image captured)
                session.internal.finalAttempt = false;

                log("SDK Attempts Set: " + session.internal.sdkAttempts);
                //Record config options
                session.internal.jpegQuality = !isNaN(options.init.jpegQuality)
                    ? options.init.jpegQuality
                    : "DEFAULT"; //intentionally a non-number
                session.internal.options = {
                    captureTimeout: options.captureTimeout,
                    jpegQuality: session.internal.jpegQuality,
                };
                //Set total capture attempts for session
                session.internal.maxCaptureAttempts =
                    options.maxCaptureAttempts || DEFAULT_MAX_CAPTURES;
                session.internal.maxCaptureBackAttempts =
                    options.maxCaptureBackAttempts || DEFAULT_MAX_CAPTURES;
                session.internal.maxCaptureFaceAttempts =
                    options.maxCaptureFaceAttempts || DEFAULT_MAX_FACE_CAPTURES;

                session.internal.captureAttempts =
                    !session.internal.captureAttempts ||
                        session.internal.captureAttempts > session.internal.maxCaptureAttempts
                        ? 0
                        : session.internal.captureAttempts;

                session.internal.captureBackAttempts =
                    !session.internal.captureBackAttempts ||
                        session.internal.captureBackAttempts > session.internal.maxCaptureBackAttempts
                        ? 0
                    : session.internal.captureBackAttempts;

                session.internal.captureFaceAttempts =
                    !session.internal.captureFaceAttempts ||
                        session.internal.captureFaceAttempts > session.internal.maxCaptureFaceAttempts
                        ? 0
                        : session.internal.captureFaceAttempts;

                if (session.internal.isFace) {
                    session.internal.verifFaceResult = null;
                } else {
                    session.internal.verifResult = null;
                }

                //Reset tracking of auto detections
                const detectionLabel = !session.internal.isBack
                    ? "detection"
                    : "detectionBack";

                if (!options.init.onlyDocument) {
                    session.internal.shouldDoFace = true;
                }

                //Smart capture SDK have no default configuration
                const maxExpDetectTime =
                    options.autoDetectConfig &&
                        options.autoDetectConfig.logMaxExpTime > 0
                        ? options.autoDetectConfig.logMaxExpTime
                        : DEFAULT_DETECT_MAX_TIME_SMART;
                //Face SDK timing
                const maxExpDetectTimeFace =
                    options.autoDetectConfig &&
                        options.autoDetectConfig.logMaxExpTimeFace > 0
                        ? options.autoDetectConfig.logMaxExpTimeFace
                        : DEFAULT_DETECT_MAX_TIME_SMART_FACE;
                //Check initialization
                log("Check initialization...");
                if (!isSdkInitialized) {
                    log("SDK not initialized. Aborting!");
                    session.internal.worstError =
                        session.internal.worstErrorBack =
                        session.internal.worstErrorFace =
                        session.internal.lastError =
                        ThalesThinLib.ENUM.SDK_INIT_ERROR;
                    onDone({ sdkError: session.internal.lastError });
                    return;
                }
                if (!options) {
                    log("Options object is mandatory. Aborting!");
                    session.internal.worstError =
                        session.internal.worstErrorBack =
                        session.internal.worstErrorFace =
                        session.internal.lastError =
                        ThalesThinLib.ENUM.SDK_CONFIG_ERROR;
                    onDone({ sdkError: session.internal.lastError });
                    return;
                }

                //UI functions
                function closeUI() {
                    log("Closing...");
                    const acCamera = window.document.getElementById("acuant-camera");
                    if (acCamera) {
                        acCamera.style.display = "none";
                        acCamera.remove();
                    }
                    const liveFaceCamera =
                        window.document.getElementById("live-face-camera");
                    if (liveFaceCamera) {
                        liveFaceCamera.style.display = "none";
                        liveFaceCamera.remove();
                    }
                    const liveDocCamera = window.document.getElementById(
                        "live-document-camera"
                    );
                    if (liveDocCamera) {
                        liveDocCamera.style.display = "none";
                        liveDocCamera.remove();
                    }
                }

                //Remove/add events
                function removeSmartFaceEvents(captureFaceCb) {
                    const liveFaceCamera =
                        window.document.getElementById("live-face-camera");
                    const LiveFaceCameraSdk = window["SmartCaptureLib"]
                        ? window["SmartCaptureLib"].LiveFaceCamera
                        : null;
                    if (liveFaceCamera && LiveFaceCameraSdk) {
                        liveFaceCamera.removeEventListener(
                            LiveFaceCameraSdk.OpenEventName,
                            captureFaceCb.onOpened
                        );
                        liveFaceCamera.removeEventListener(
                            LiveFaceCameraSdk.CloseEventName,
                            captureFaceCb.onClosed
                        );
                        liveFaceCamera.removeEventListener(
                            LiveFaceCameraSdk.UserCanceledEventName,
                            captureFaceCb.onBack
                        );
                        liveFaceCamera.removeEventListener(
                            LiveFaceCameraSdk.CaptureEventName,
                            captureFaceCb.onCaptured
                        );
                        liveFaceCamera.removeEventListener(
                            LiveFaceCameraSdk.FailureEventName,
                            captureFaceCb.onError
                        );
                        liveFaceCamera.removeEventListener(
                            LiveFaceCameraSdk.BeforeOpenEventName,
                            captureFaceCb.onBeforeCapture
                        );
                        liveFaceCamera.removeEventListener(
                            LiveFaceCameraSdk.BeforeCaptureEventName,
                            captureFaceCb.onBeforeOpen
                        );
                        liveFaceCamera.removeEventListener(
                            LiveFaceCameraSdk.DetectEventName,
                            captureFaceCb.onDetection
                        );
                        liveFaceCamera.removeEventListener(
                            LiveFaceCameraSdk.InitializeEventName,
                            captureFaceCb.onDetectorInitialized
                        );
                        liveFaceCamera.removeEventListener(
                            LiveFaceCameraSdk.BeforeInitializeEventName,
                            captureFaceCb.onBeforeDetectorInitialized
                        );
                        log("Face SDK events removed");
                    }
                }
                function addSmartFaceEvents(captureFaceCb) {
                    const liveFaceCamera =
                        window.document.getElementById("live-face-camera");
                    const LiveFaceCameraSdk = window["SmartCaptureLib"]
                        ? window["SmartCaptureLib"].LiveFaceCamera
                        : null;
                    if (liveFaceCamera && LiveFaceCameraSdk) {
                        removeSmartFaceEvents(captureFaceCb);
                        liveFaceCamera.addEventListener(
                            LiveFaceCameraSdk.OpenEventName,
                            captureFaceCb.onOpened
                        );
                        liveFaceCamera.addEventListener(
                            LiveFaceCameraSdk.CloseEventName,
                            captureFaceCb.onClosed
                        );
                        liveFaceCamera.addEventListener(
                            LiveFaceCameraSdk.UserCanceledEventName,
                            captureFaceCb.onBack
                        );
                        liveFaceCamera.addEventListener(
                            LiveFaceCameraSdk.CaptureEventName,
                            captureFaceCb.onCaptured
                        );
                        liveFaceCamera.addEventListener(
                            LiveFaceCameraSdk.FailureEventName,
                            captureFaceCb.onError
                        );
                        liveFaceCamera.addEventListener(
                            LiveFaceCameraSdk.BeforeOpenEventName,
                            captureFaceCb.onBeforeOpen
                        );
                        liveFaceCamera.addEventListener(
                            LiveFaceCameraSdk.BeforeCaptureEventName,
                            captureFaceCb.onBeforeCapture
                        );
                        liveFaceCamera.addEventListener(
                            LiveFaceCameraSdk.DetectEventName,
                            captureFaceCb.onDetection
                        );
                        liveFaceCamera.addEventListener(
                            LiveFaceCameraSdk.InitializeEventName,
                            captureFaceCb.onDetectorInitialized
                        );
                        liveFaceCamera.addEventListener(
                            LiveFaceCameraSdk.BeforeInitializeEventName,
                            captureFaceCb.onBeforeDetectorInitialized
                        );
                        log("Face SDK events added");
                    }
                }
                function removeSmartDocEvents(captureDocCb) {
                    const liveDocCamera =
                        window.document.getElementById("live-document-camera");
                    const LiveDocCameraSdk = window["SmartCaptureLib"]
                        ? window["SmartCaptureLib"].LiveDocumentCamera
                        : null;
                    if (liveDocCamera && LiveDocCameraSdk) {
                        liveDocCamera.removeEventListener(
                            LiveDocCameraSdk.OpenEventName,
                            captureDocCb.onOpened
                        );
                        liveDocCamera.removeEventListener(
                            LiveDocCameraSdk.CloseEventName,
                            captureDocCb.onClosed
                        );
                        liveDocCamera.removeEventListener(
                            LiveDocCameraSdk.UserCanceledEventName,
                            captureDocCb.onBack
                        );
                        liveDocCamera.removeEventListener(
                            LiveDocCameraSdk.FailureEventName,
                            captureDocCb.onFailure
                        );
                        liveDocCamera.removeEventListener(
                            LiveDocCameraSdk.CaptureEventName,
                            captureDocCb.onCaptured
                        );
                        liveDocCamera.removeEventListener(
                            LiveDocCameraSdk.DetectEventName,
                            captureDocCb.onDetected
                        );
                        log("Doc SDK events removed");
                    }
                }
                function addSmartDocEvents(captureDocCb) {
                    const liveDocCamera =
                        window.document.getElementById("live-document-camera");
                    const LiveDocCameraSdk = window["SmartCaptureLib"]
                        ? window["SmartCaptureLib"].LiveDocumentCamera
                        : null;
                    if (liveDocCamera && LiveDocCameraSdk) {
                        removeSmartDocEvents(captureDocCb)
                        liveDocCamera.addEventListener(
                            LiveDocCameraSdk.OpenEventName,
                            captureDocCb.onOpened
                        );
                        liveDocCamera.addEventListener(
                            LiveDocCameraSdk.CloseEventName,
                            captureDocCb.onClosed
                        );
                        liveDocCamera.addEventListener(
                            LiveDocCameraSdk.UserCanceledEventName,
                            captureDocCb.onBack
                        );
                        liveDocCamera.addEventListener(
                            LiveDocCameraSdk.FailureEventName,
                            captureDocCb.onFailure
                        );
                        liveDocCamera.addEventListener(
                            LiveDocCameraSdk.CaptureEventName,
                            captureDocCb.onCaptured
                        );
                        liveDocCamera.addEventListener(
                            LiveDocCameraSdk.DetectEventName,
                            captureDocCb.onDetected
                        );
                        log("Doc SDK events added");
                    }
                }

                //Use to end the SDK
                function forceExit(isAuto) {
                    //Update worst error
                    const errCode = isAuto
                        ? ThalesThinLib.ENUM.ERROR_CLOSE_BTN
                        : ThalesThinLib.ENUM.ERROR_TIMEOUT;
                    const liveFaceCamera =
                        window.document.getElementById("live-face-camera");
                    if (liveFaceCamera && liveFaceCamera.isOpen === true) {
                        liveFaceCamera.isOpen = false;
                    }
                    const liveDocCamera = window.document.getElementById(
                        "live-document-camera"
                    );
                    if (liveDocCamera && liveDocCamera.isOpen === true) {
                        liveDocCamera.isOpen = false;
                    }
                    //This goes back to the main flow to handle this as an error
                    onDone({ sdkError: errCode });
                }

                const captureDocCb = {
                    onOpened: () => {
                        log("Doc camera opened");
                        startCapture = Date.now();
                        const liveDocCamera = document.getElementById(
                            "live-document-camera"
                        );
                        if (liveDocCamera) {
                            liveDocCamera.style.display = "block";
                        }
                        session.internal.uiShown = true;
                        if (options.ui.frontAnimation) {
                            try {
                                const liveDocCamera = document.getElementById("live-document-camera");
                                if (liveDocCamera && liveDocCamera.shadowRoot &&
                                    typeof liveDocCamera.shadowRoot.querySelector === 'function') {
                                    const player = liveDocCamera.shadowRoot.querySelector("lottie-player");
                                    if (player) {
                                        const isPortrait = typeof window.matchMedia === 'function' &&
                                            window.matchMedia("(orientation: portrait)").matches;
                                        if (options.ui.frontAnimation === "no" || options.ui.frontAnimation === "NO") {
                                            player.style.visibility = 'hidden';
                                        } else {
                                            if (session.internal.isBack && options.ui.backAnimation) {
                                                player.load(isPortrait ? options.ui.backAnimation.portrait : options.ui.backAnimation.landscape);
                                            } else {
                                                player.load(isPortrait ? options.ui.frontAnimation.portrait : options.ui.frontAnimation.landscape);
                                            }
                                        }
                                    }
                                }
                            } catch (err) {
                                log("Exception on hiding animation: " + err)
                            }
                        }
                        if (options.ui.forceShowHelpIcon) {
                            try {
                                if (!session.internal.hasShown) {
                                    const liveDocCamera = document.getElementById("live-document-camera");
                                    if (liveDocCamera && liveDocCamera.shadowRoot) {
                                        const helpIcon = liveDocCamera.shadowRoot.querySelector(".helpIcon");
                                        if (helpIcon && typeof helpIcon.click === "function") {
                                            window.setTimeout(() => {
                                                helpIcon.click();
                                            }, 100);
                                        }
                                    }
                                    session.internal.hasShown = true;
                                }
                            } catch (err) {
                                log("Exception on force show help: " + err);
                                session.internal.hasShown = true;
                            }
                        }
                        resolve({
                            process: processPromise,
                            final: finalPromise,
                        });
                    },
                    onClosed: () => {
                        log("Doc camera closed");
                        if (!isEnding) {
                            forceExit(true);
                        }
                    },
                    onBack: () => {
                        log("Doc camera closed by the user");
                        if (!isEnding) {
                            forceExit(true);
                        }
                    },
                    onCaptured: (e) => {
                        isEnding = true;
                        log("Doc captured");
                        if (!e || !e.detail) {
                            onDone({ sdkError: ThalesThinLib.ENUM.SDK_FAILED });
                            return;
                        }
                        //If captured and not tap to capture, must be auto captured
                        if (session.internal["captureMode" + side] !== ThalesThinLib.ENUM.AUTO_CAPTURE) {
                            session.internal["captureMode" + side] = ThalesThinLib.ENUM.TAP_TO_CAPTURE;
                        }
                        //SDK v2.1.1 has built-in metricds
                        if (e.detail.captureResponse && e.detail.captureResponse.metrics) {
                            //Trust more the SDK on capture mode
                            const metrics = e.detail.captureResponse.metrics;
                            if (metrics.captureMode) {
                                session.internal["captureMode" + side] = metrics.captureMode == "MANUAL" ?
                                    ThalesThinLib.ENUM.TAP_TO_CAPTURE : ThalesThinLib.ENUM.AUTO_CAPTURE;
                            }
                            //SDK version is likely only taken from here reliably
                            session.internal.sdkVersion = metrics.sdkVersion;
                            session.internal.sdkVersionFace = metrics.sdkVersion;
                            //Save rest of the metrics as is
                            if (!session.internal["detection" + side]) {
                                session.internal["detection" + side] = {};
                            }
                            session.internal["detection" + side].sdkMetrics = metrics;
                        }
                        if (
                            !e.detail.captureResponse ||
                            !e.detail.captureResponse.imageData
                        ) {
                            onDone({ sdkError: ThalesThinLib.ENUM.NO_IMAGE });
                        } else {
                            let img;
                            //For SDK v2.1.1 and onwards, if jpegQuality is not set
                            //it will get the default JPEG image. If jpegQuality not set
                            //and previous versions of SDK is used, the default in SDK is used
                            if (!isNaN(session.internal.jpegQuality)) {
                                img = getImageFromData(
                                    e.detail.captureResponse.imageData,
                                    e.detail.captureResponse.imageData.width,
                                    e.detail.captureResponse.imageData.height,
                                    session.internal.jpegQuality
                                );
                            } else if (!!e.detail.captureResponse.imageBase64) {
                                img = e.detail.captureResponse.imageBase64
                            } else {
                                img = getImageFromData(
                                    e.detail.captureResponse.imageData,
                                    e.detail.captureResponse.imageData.width,
                                    e.detail.captureResponse.imageData.height,
                                    DEFAULT_DOC_QUALITY
                                );
                            }
                            onDone({
                                image: {
                                    data: img,
                                    width: e.detail.captureResponse.imageData.imageWidth,
                                    height: e.detail.captureResponse.imageData.imageHeight,
                                },
                                isPortraitOrientation:
                                    e.detail.captureResponse.isPortraitOrientation,
                                glare: e.detail.captureResponse.isGlareFree,
                                sharpness: e.detail.captureResponse.isSharp,
                                dpi: e.detail.captureResponse.isAdequateDpi,
                                isGood: e.detail.captureResponse.isGood,
                                isFace: false,
                            });
                        }
                    },
                    onFailure: (e) => {
                        isEnding = true;
                        const error =
                            e && e.detail && e.detail.error ? e.detail.error : { code: null, message: null };
                        log(
                            "Doc capture failed: " +
                            (!error.code ? "No Message" : error.code + ":" + error.message)
                        );
                        const errDetail = error.code + "-" + error.message;
                        if (!!session.internal.errors[errDetail] === undefined ||
                            !!session.internal.errors[errDetail] === null) {
                            session.internal.errors[errDetail] = 1;
                        } else {
                            session.internal.errors[errDetail]++;
                        }
                        if (
                            error.code === "start-fail" &&
                            error.message === "Permission denied"
                        ) {
                            onDone({
                                sdkError: ThalesThinLib.ENUM.CAMERA_PERMISSIONS_DENIED,
                            });
                        } else if (error.code === 'auto-capture-timeout') {
                            onDone({
                                sdkError: ThalesThinLib.ENUM.ERROR_TIMEOUT,
                            });
                        } else {
                            onDone({
                                sdkError:
                                    error.code === "start-fail"
                                        ? ThalesThinLib.ENUM.SDK_FAILED
                                        : ThalesThinLib.ENUM.SDK_ERROR,
                            });
                        }
                    },
                    onDetected: (e) => {
                        session.internal.isDetectInit = true;
                        try {
                            const de =
                                e && e.detail && e.detail.detectResponse
                                    ? e.detail.detectResponse
                                    : null;
                            const detLabel = !session.internal.isBack
                                ? "detection"
                                : "detectionBack";
                            if (!de) {
                                log("No smart detection")
                            } else {
                                //If there was no detection or it was a good detection, auto capture was used
                                if (de.isGood) {
                                    session.internal["captureMode" + side] = ThalesThinLib.ENUM.AUTO_CAPTURE;
                                }
                                if (!session.internal[detLabel]) {
                                    session.internal[detLabel] = {
                                        count: 0,
                                        failedChecks: {},
                                        start: Date.now(),
                                        end: Date.now(),
                                        maxTime: 0,
                                        tooLong: 0,
                                    };
                                }
                                session.internal[detLabel].count++;
                                const deltaDetectTime =
                                    Date.now() - session.internal[detLabel].end;
                                session.internal[detLabel].tooLong += deltaDetectTime > maxExpDetectTime ? 1 : 0;
                                session.internal[detLabel].maxTime = Math.max(
                                    session.internal[detLabel].maxTime,
                                    deltaDetectTime
                                );
                                session.internal[detLabel].end = Date.now();

                                function increase(obj, attr) {
                                    if (obj[attr] == undefined || obj[attr] === null) {
                                        obj[attr] = 1;
                                    } else {
                                        obj[attr]++;
                                    }
                                }

                                if (!de.failedChecks) {
                                    increase(session.internal[detLabel].failedChecks, "Invalid");
                                } else if (de.failedChecks.length === 0) {
                                    increase(session.internal[detLabel].failedChecks, "Good");
                                } else {
                                    for (let i = 0; i < de.failedChecks.length; ++i) {
                                        increase(session.internal[detLabel].failedChecks, de.failedChecks[i]);
                                    }
                                }
                            }
                        } catch (err) {
                            log("onDetected error: " + err);
                        }
                    },
                };

                const captureFaceCb = {
                    onOpened: () => {
                        log("Face camera opened");
                        startCapture = Date.now();
                        let liveFaceCamera =
                            window.document.getElementById("live-face-camera");
                        if (liveFaceCamera) {
                            liveFaceCamera.style.display = "block";
                        }
                        session.internal.uiShown = true;
                        resolve({
                            process: processPromise,
                            final: finalPromise,
                        });
                    },
                    onClosed: () => {
                        log("Face camera closed");
                        if (!isEnding) {
                            //BUG FIX: give time for onError to trigger to properly get error
                            window.setTimeout(() => {
                                forceExit(true);
                            }, 300);                            
                        }
                    },
                    onBack: () => {
                        log("Face camera closed by the user");
                        if (!isEnding) {
                            forceExit(true);
                        }
                    },
                    onCaptured: (e) => {
                        isEnding = true;
                        log("Face captured");
                        //For both SDk versions
                        const imageBase64 = !e || (e.detail && !e.detail.imageBase64) ?
                            null :
                            e.detail ?
                                "data:image/jpeg;base64," + e.detail.imageBase64 :
                                "data:image/jpeg;base64," + e
                        if (!imageBase64) {
                            onDone({ sdkError: ThalesThinLib.ENUM.SDK_FAILED });
                        } else {
                            const encryptedFile = e.detail && e.detail.encryptedFile
                                ? e.detail.encryptedFile
                                : new Blob();
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const enc = !reader.result
                                    ? null
                                    : reader.result.split("base64,", 2)[1];
                                onDone({
                                    image: { data: imageBase64 },
                                    encryptedFile: enc,
                                    smartCapture: e.detail,
                                    isFace: true,
                                });
                            };
                            reader.readAsDataURL(encryptedFile);
                        }
                    },
                    onError: (e) => {
                        isEnding = true;
                        const error =
                            e && e.detail && e.detail.error ? e.detail.error : { code: null, message: null };
                        log(
                            "Face capture failed: " +
                            (!error.code ? "No Message" : error.code + ":" + error.message)
                        );
                        const errDetail = error.code + "-" + error.message;
                        if (!!session.internal.errors[errDetail] === undefined ||
                            !session.internal.errors[errDetail] === null) {
                            session.internal.errors[errDetail] = 1;
                        } else {
                            session.internal.errors[errDetail]++
                        }
                        if(error.code === 1) {
                            onDone({
                                sdkError: ThalesThinLib.ENUM.CAMERA_PERMISSIONS_DENIED,
                            });
                        } else if (error.code === 4) {
                            onDone({ sdkError: ThalesThinLib.ENUM.ERROR_TIMEOUT });
                         } else {
                            //Expected to be error code 2
                            onDone({ sdkError: ThalesThinLib.ENUM.SDK_FAILED });
                        }
                        //Error code 3 is handled on the timeout in initSdk()
                    },
                    onDetectorInitialized: () => {
                        session.internal.isDetectInitFace = true;
                        log("Face detection initialized");
                    },
                    onBeforeDetectorInitialized: () => {
                        session.internal.isBefpreDetectInitFace = true;
                        log("Face detection being initialized...");
                    },
                    onDetection: (e) => {
                        try {
                            //Format to work for both SDKs
                            const errors = e && e.detail && e.detail.errors ?
                                e.detail.errors :
                                typeof e === 'string' ?
                                    [e] :
                                    null;
                            //Logging for both versions of SDK
                            if (!session.internal.detectionFace) {
                                session.internal.detectionFace = {
                                    count: 0,
                                    failedChecks: {},
                                    start: Date.now(),
                                    end: Date.now(),
                                    maxTime: 0,
                                    tooLong: 0,
                                };
                            }
                            session.internal.detectionFace.count++;
                            const deltaDetectTime = Date.now() - session.internal.detectionFace.end;
                            session.internal.detectionFace.tooLong += deltaDetectTime > maxExpDetectTimeFace ? 1 : 0;
                            session.internal.detectionFace.maxTime = Math.max(
                                session.internal.detectionFace.maxTime,
                                deltaDetectTime
                            );
                            session.internal.detectionFace.end = Date.now();
                            function increase(obj, attr) {
                                if (obj[attr] == undefined || obj[attr] === null) {
                                    obj[attr] = 1;
                                } else {
                                    obj[attr]++;
                                }
                            }
                            if (!errors) {
                                increase(session.internal.detectionFace.failedChecks, "INVALID");
                            } else if (errors.length === 0) {
                                increase(session.internal.detectionFace.failedChecks, "GOOD");
                            } else {
                                for (let i = 0; i < errors.length; ++i) {
                                    increase(session.internal.detectionFace.failedChecks, errors[i]);
                                }
                            }
                        } catch (err) {
                            log("onDetected error: " + err);
                        }
                    },
                    onBeforeCapture: () => {
                        log("Face camera capturing...");
                    },
                    onBeforeOpen: () => {
                        log("Face camera opening...");
                    }
                };

                //Called when execution is done
                async function onDone(response) {
                    //Just in case it is not triggered already
                    processResolve();
                    resolve({
                        process: processPromise,
                        final: finalPromise,
                        state: null,
                    });

                    if (alreadyDone) return;
                    alreadyDone = true;

                    removeSmartDocEvents(captureDocCb);
                    removeSmartFaceEvents(captureFaceCb);
                    closeUI();
                    //Calculate timings

                    session.internal["captureTime" + side] = Date.now() - startCapture;
                    //Check quality checks. Note that for auto capture the image is only captured if isGood = true 
                    //so practically this is always skipped on auto capture, configurable for tap to capture
                    const checkQuality = {
                        skipDpi: response.isGood || !options.tapToCaptureConfig || options.tapToCaptureConfig.dpi !== true,
                        skipGlare: response.isGood || !options.tapToCaptureConfig || options.tapToCaptureConfig.glare !== true,
                        skipSharpness: response.isGood || !options.tapToCaptureConfig || options.tapToCaptureConfig.sharpness !== true,
                    }
                    let issueCode = !!options.skipChecks
                        ? null
                        : getErrorCode(response, checkQuality);
                    //Reduce retries if there is an image quality, reset if there is an image
                    if (issueCode == ThalesThinLib.ENUM.LOW_RES || issueCode == ThalesThinLib.ENUM.HIGH_GLARE ||
                        issueCode == ThalesThinLib.ENUM.LOW_SHARPNESS) {
                        session.internal.sdkAttempts--;
                    } else if (!issueCode) {
                        session.internal.sdkAttempts = session.internal.maxSdkAttempts;
                    }
                    //Update worst error and best response
                    const err = getWorstCode(issueCode, session.internal["worstError" + side]);
                    session.internal["worstError" + side] = err;
                    session.internal.lastError = issueCode;
                    session.internal["bestResult" + side] = response;
                    log(
                        "SDK Attempts Left: " +
                        session.internal.sdkAttempts +
                        ", Issue detected: " +
                        issueCode
                    );
                    //Add logging data on response
                    if (response) {
                        response.extra = {
                            captureMode: session.internal["captureMode" + side],
                            captureTime: session.internal["captureTime" + side],
                        }
                    }
                    //Rejection means there should be another retry. Resolve means the image is good to send to backend
                    session.internal.finalAttempt = !issueCode || session.internal.sdkAttempts <= 0;
                    //Take action
                    if (session.internal.finalAttempt) {
                        //Increase capture attempts
                        if (session.internal.isFace) {
                            session.internal.captureFaceAttempts++;
                        } else if (session.internal.isBack) {
                            session.internal.captureBackAttempts++;
                        } else {
                            session.internal.captureAttempts++;
                        }
                        const gotImage = session.internal.isFace
                            ? (!!session.internal.bestResultFace && !!session.internal.bestResultFace.image)
                            : session.internal.isBack
                                ? (!!session.internal.bestResultBack && !!session.internal.bestResultBack.image)
                                : (!!session.internal.bestResult && !!session.internal.bestResult.image);
                        if (gotImage) {
                            //Update worst error to a potentially wrong classification overriding pure SDK errors
                            session.internal["worstError" + side] =
                                getWorstCode(session.internal["worstError" + side], ThalesThinLib.ENUM.IMAGE_UPLOADED);
                            //Set preview on best image that is being sent to the backend
                            try {
                                session.internal["previewImage" + side] =
                                    "data:image/jpeg;base64," + getBestResultImage();
                            } catch (pe) {
                                log("Error setting preview image, ignoring");
                            }
                        } else {
                            session.internal["previewImage" + side] = null;
                        }
                        //Reset auto-capture disablement
                        session.internal.disableAutoCapture = false;
                        //Accept as there is an image after retries to send to backend
                        buildLog();
                        finalResolve();
                    } else {
                        //Set preview images
                        try {
                            if (response && !!response.image && !!response.image.data) {
                                session.internal["previewImage" + side] = response.image.data;
                            } else {
                                session.internal["previewImage" + side] = null;
                            }
                        } catch (pe) {
                            log("Error setting preview image, ignoring");
                        }
                        //Set auto-capture disablement
                        if (options.disableAutoCaptureOnTimeout && issueCode === "ERROR_TIMEOUT") {
                            session.internal.disableAutoCapture = true;
                        }
                        //Reject to main app so it can initiate retries
                        buildLog();
                        finalReject(issueCode);
                    }
                }

                //*** INITIALIZE UI
                log("Initialize UI...");
                if (doDoc) {
                    let liveDocCamera = document.getElementById("live-document-camera");
                    if (!liveDocCamera) {
                        liveDocCamera = createSmartDocumentLiveCameraHTML(
                            zIndexRoot,
                            fillRootColor,
                            options.init && options.init.debugBorders);
                    }
                }
                if (doFace) {
                    let liveFaceCamera = document.getElementById("live-face-camera");
                    if (!liveFaceCamera) {
                        liveFaceCamera = createSmartFaceLiveCameraHTML(
                            zIndexRoot,
                            fillRootColor,
                            options.init && options.init.debugBorders);
                    }
                    log("Face smart capture UI initialized");
                }

                //*** INITIALIZE SDK
                if (doDoc && window[SmartCaptureLib]) {
                    session.internal.sdkVersion = window[SmartCaptureLib].sdkName;
                }
                if (doFace && window[SmartCaptureLib]) {
                    session.internal.sdkVersionFace = window[SmartCaptureLib].sdkName;
                }
                log(
                    "SDK Version: " + (session.internal.isFace
                        ? session.internal.sdkVersionFace
                        : session.internal.sdkVersion)
                );
                const liveCaptureNotSupported =
                    (window[SmartCaptureLib] &&
                        typeof window[SmartCaptureLib].isLiveCaptureSupported ===
                        "function" &&
                        !window[SmartCaptureLib].isLiveCaptureSupported());
                if (liveCaptureNotSupported) {
                    onDone({ sdkError: ThalesThinLib.ENUM.BROWSER_NOT_SUPPORTED });
                    return;
                }

                //*** START CAPTURE
                log("Starting capture..");
                session.internal["captureMode" + side] = null;
                if (!session.internal.isFace) {
                    if (doDoc) {
                        log("Starting document smart capture...");
                        let liveDocCamera = document.getElementById("live-document-camera");
                        if (!liveDocCamera) {
                            onDone({ sdkError: ThalesThinLib.ENUM.SDK_CONFIG_ERROR });
                        } else {
                            if (options.ui) {
                                if (!liveDocCamera.hints) {
                                    liveDocCamera.hints = {};
                                }
                                if (options.ui.moveCloserHint) {
                                    liveDocCamera.hints.moveCloserHint = options.ui.moveCloserHint;
                                }
                                if (options.ui.fixBlurHint) {
                                    liveDocCamera.hints.fixBlurHint = options.ui.fixBlurHint;
                                }
                                if (options.ui.fixGlareHint) {
                                    liveDocCamera.hints.fixGlareHint = options.ui.fixGlareHint;
                                }
                                if (options.ui.outOfFrameHint) {
                                    liveDocCamera.hints.outOfFrameHint = options.ui.outOfFrameHint;
                                }
                                if (options.ui.capturingHint) {
                                    liveDocCamera.hints.capturingHint = options.ui.capturingHint;
                                }
                                if (options.ui.assureIdResolutionHint) {
                                    liveDocCamera.hints.assureIdResolutionHint = options.ui.assureIdResolutionHint;
                                }
                                if (options.ui.assureIdCoverageHint) {
                                    liveDocCamera.hints.assureIdCoverageHint = options.ui.assureIdCoverageHint;
                                }
                                if (
                                    options.ui.generalInfoTexts &&
                                    options.ui.generalInfoTexts.front
                                ) {
                                    if (!session.internal.isBack) {
                                        //For v2.2.3-
                                        liveDocCamera.generalInfoTexts = [
                                            options.ui.generalInfoTexts.front,
                                        ];
                                        liveDocCamera.generalInfoTexts.push(
                                            options.ui.generalInfoTexts.fallbackFront
                                                ? options.ui.generalInfoTexts.fallbackFront
                                                : liveDocCamera.generalInfoTexts[0]
                                        );
                                        //Supported on 2.3.0+
                                        liveDocCamera.generalInfoTexts.push(
                                            options.ui.generalInfoTexts.back
                                                ? options.ui.generalInfoTexts.back
                                                : options.ui.generalInfoTexts.front
                                        );
                                    } else {
                                        //For v2.2.3-
                                        liveDocCamera.generalInfoTexts = [
                                            options.ui.generalInfoTexts.back
                                                ? options.ui.generalInfoTexts.back
                                                : options.ui.generalInfoTexts.front,
                                        ];
                                        liveDocCamera.generalInfoTexts.push(
                                            options.ui.generalInfoTexts.fallbackBack
                                                ? options.ui.generalInfoTexts.fallbackBack
                                                : liveDocCamera.generalInfoTexts[0]
                                        );
                                        //Supported on 2.3.0+
                                        liveDocCamera.generalInfoTexts.push(
                                            options.ui.generalInfoTexts.back
                                                ? options.ui.generalInfoTexts.back
                                                : options.ui.generalInfoTexts.front
                                        );
                                    }
                                }
                                if (options.ui.showHelpIcon !== undefined ||
                                    options.ui.showHelpIcon !== null) {
                                    liveDocCamera.showHelpIcon = !!options.ui.showHelpIcon;
                                }
                                if (options.ui.autoCaptureText !== null && options.ui.autoCaptureText !== undefined &&
                                    options.ui.alertText !== null && options.ui.alertText !== undefined) {
                                    if (!liveDocCamera.texts) {
                                        liveDocCamera.texts = {};
                                    }
                                    liveDocCamera.texts.autoCaptureText = options.ui.autoCaptureText;
                                    liveDocCamera.texts.alertText = options.ui.alertText;
                                } else if (options.ui.autoCaptureText !== null && options.ui.autoCaptureText !== undefined &&
                                    liveDocCamera.texts) {
                                    liveDocCamera.texts.autoCaptureText = options.ui.autoCaptureText;
                                } else if (options.ui.alertText !== null && options.ui.alertText !== undefined &&
                                    liveDocCamera.texts) {
                                    liveDocCamera.texts.alertText = options.ui.alertText;
                                }
                                if (options.ui.autoCaptureText !== null && options.ui.autoCaptureText !== undefined &&
                                    options.ui.autoCaptureOnText && options.ui.autoCaptureOffText && liveDocCamera.texts) {
                                    liveDocCamera.texts.autoCaptureOnText = options.ui.autoCaptureOnText;
                                    liveDocCamera.texts.autoCaptureOffText = options.ui.autoCaptureOffText;
                                }
                                if (options.ui.cleanLenseText !== null && options.ui.cleanLenseText !== undefined) {
                                    if (!liveDocCamera.texts) {
                                        liveDocCamera.texts = {};
                                    }
                                    liveDocCamera.texts.cleanLenseText = options.ui.cleanLenseText;
                                }
                                if (options.ui.photoCapturedText !== null && options.ui.photoCapturedText !== undefined) {
                                    if (!liveDocCamera.texts) {
                                        liveDocCamera.texts = {};
                                    }
                                    liveDocCamera.texts.photoCapturedText = options.ui.photoCapturedText;
                                }
                                if (options.ui.successTime > 0) {
                                    liveDocCamera.successTime = options.ui.successTime;
                                }
                                if (options.ui.extraAccessibilityTexts) {
                                    if (!liveDocCamera.ariaLabels) {
                                        liveDocCamera.ariaLabels = {};
                                    }
                                    if (options.ui.extraAccessibilityTexts.backButton) {
                                        liveDocCamera.ariaLabels.backButton = options.ui.extraAccessibilityTexts.backButton;
                                    }
                                    if (options.ui.extraAccessibilityTexts.helpIcon) {
                                        liveDocCamera.ariaLabels.helpIcon = options.ui.extraAccessibilityTexts.helpIcon;
                                    }
                                    if (options.ui.extraAccessibilityTexts.autoCaptureEnable) {
                                        liveDocCamera.ariaLabels.autoCaptureEnable = options.ui.extraAccessibilityTexts.autoCaptureEnable;
                                    }
                                    if (options.ui.extraAccessibilityTexts.autoCaptureDisable) {
                                        liveDocCamera.ariaLabels.autoCaptureDisable = options.ui.extraAccessibilityTexts.autoCaptureDisable;
                                    }
                                    if (options.ui.extraAccessibilityTexts.tapToCapture) {
                                        liveDocCamera.ariaLabels.tapToCapture = options.ui.extraAccessibilityTexts.tapToCapture;
                                    }
                                    if (options.ui.extraAccessibilityTexts.closeHelpButton) {
                                        liveDocCamera.ariaLabels.closeHelpButton = options.ui.extraAccessibilityTexts.closeHelpButton;
                                        liveDocCamera.ariaLabels.closeHelpIcon = options.ui.extraAccessibilityTexts.closeHelpButton; //seems unecessary to split with HelpIcon
                                    }
                                    if (options.ui.extraAccessibilityTexts.helpAnimationGlare) {
                                        liveDocCamera.ariaLabels.helpAnimationGlare = options.ui.extraAccessibilityTexts.helpAnimationGlare;
                                    }
                                    if (options.ui.extraAccessibilityTexts.helpAnimationBlur) {
                                        liveDocCamera.ariaLabels.helpAnimationBlur = options.ui.extraAccessibilityTexts.helpAnimationBlur;
                                    }
                                    if (options.ui.extraAccessibilityTexts.helpAnimationTooFar) {
                                        liveDocCamera.ariaLabels.helpAnimationTooFar = options.ui.extraAccessibilityTexts.helpAnimationTooFar;
                                    }
                                    if (options.ui.extraAccessibilityTexts.helpSection) {
                                        liveDocCamera.ariaLabels.helpSection = options.ui.extraAccessibilityTexts.helpSection;
                                    }
                                }
                                if (options.ui.textsHelpSection) {
                                    if (!liveDocCamera.textsHelpSection) {
                                        liveDocCamera.textsHelpSection = {};
                                    }
                                    if (options.ui.textsHelpSection.title) {
                                        liveDocCamera.textsHelpSection.title = options.ui.textsHelpSection.title;
                                    }
                                    if (options.ui.textsHelpSection.body) {
                                        liveDocCamera.textsHelpSection.body = options.ui.textsHelpSection.body;
                                    }
                                    if (options.ui.textsHelpSection.tipsTitle) {
                                        liveDocCamera.textsHelpSection.tipsTitle = options.ui.textsHelpSection.tipsTitle;
                                    }
                                    if (options.ui.textsHelpSection.glareTipTitle) {
                                        liveDocCamera.textsHelpSection.glareTipTitle = options.ui.textsHelpSection.glareTipTitle;
                                    }
                                    if (options.ui.textsHelpSection.glareTipText) {
                                        liveDocCamera.textsHelpSection.glareTipText = options.ui.textsHelpSection.glareTipText;
                                    }
                                    if (options.ui.textsHelpSection.blurTipTitle) {
                                        liveDocCamera.textsHelpSection.blurTipTitle = options.ui.textsHelpSection.blurTipTitle;
                                    }
                                    if (options.ui.textsHelpSection.blurTipText) {
                                        liveDocCamera.textsHelpSection.blurTipText = options.ui.textsHelpSection.blurTipText;
                                    }
                                    if (options.ui.textsHelpSection.tooFarTipTitle) {
                                        liveDocCamera.textsHelpSection.tooFarTipTitle = options.ui.textsHelpSection.tooFarTipTitle;
                                    }
                                    if (options.ui.textsHelpSection.tooFarTipText) {
                                        liveDocCamera.textsHelpSection.tooFarTipText = options.ui.textsHelpSection.tooFarTipText;
                                    }
                                    if (options.ui.textsHelpSection.bodyBack) {
                                        liveDocCamera.textsHelpSection.bodyBack = options.ui.textsHelpSection.bodyBack;
                                    }
                                    if (options.ui.textsHelpSection.lightingTipText) {
                                        liveDocCamera.textsHelpSection.lightingTipText = options.ui.textsHelpSection.lightingTipText;
                                    }
                                    if (options.ui.textsHelpSection.framingTipText) {
                                        liveDocCamera.textsHelpSection.framingTipText = options.ui.textsHelpSection.framingTipText;
                                    }
                                    if (options.ui.textsHelpSection.steadyTipText) {
                                        liveDocCamera.textsHelpSection.steadyTipText = options.ui.textsHelpSection.steadyTipText;
                                    }
                                    if (options.ui.textsHelpSection.autoCaptureConfirmationText) {
                                        liveDocCamera.textsHelpSection.autoCaptureConfirmationText = options.ui.textsHelpSection.autoCaptureConfirmationText;
                                    }
                                    if (options.ui.textsHelpSection.strugglingText) {
                                        liveDocCamera.textsHelpSection.strugglingText = options.ui.textsHelpSection.strugglingText;
                                    }
                                }
                                //Back button
                                if (options.ui.disableBackButton) {
                                    liveDocCamera.showBackButton = false;
                                }
                            }
                            liveDocCamera.forceManualCamera = false;
                            liveDocCamera.useHeic = false;
                            liveDocCamera.showBackOfDocumentAnimation = session.internal.isBack;

                            //Auto capture toggle optimizations
                            if (options.autoDetectConfig && options.autoDetectConfig.toggleAutoCaptureDelay > 0) {
                                liveDocCamera.toggleAutoCaptureDelay = options.autoDetectConfig.toggleAutoCaptureDelay;
                            } else {
                                liveDocCamera.toggleAutoCaptureDelay = DEFAULT_AUTO_CAPTURE_TOGGLE_DELAY;
                            }
                            if (options.autoDetectConfig && options.autoDetectConfig.disableToggle) {
                                liveDocCamera.showToggle = false;
                                liveDocCamera.toggleAutoCaptureDelay = 60 * 60 * 1000; //workaround for showToggle
                            }
                            //Configure Timeout
                            if (options.captureTimeout > 0) {
                                liveDocCamera.autoCaptureTimeout = options.captureTimeout;
                                liveDocCamera.enableAutoCaptureTimeout = true;
                            } else {
                                liveDocCamera.enableAutoCaptureTimeout = false;
                            }
                            //Config document type
                            if (options.documentType) {
                                liveDocCamera.documentType = options.documentType;
                            }
                            //Config auto/tap to capture
                            if (options.disableAutoCapture || session.internal.disableAutoCapture === true) {
                                liveDocCamera.enableTapToCapture = true;
                                liveDocCamera.enableAutoCapture = false;
                            } else {
                                liveDocCamera.enableTapToCapture = true;
                                liveDocCamera.enableAutoCapture = true;
                            }
                            if (options.disableTapToCapture) {
                                liveDocCamera.enableTapToCapture = false;
                            }
                            if (options.showBackOfDocumentAnimation) {
                                liveDocCamera.showBackOfDocumentAnimation = options.showBackOfDocumentAnimation;
                            }

                        }
                        getCameraPermission(true).then(r => {
                            if (r === ThalesThinLib.ENUM.CAMERA_PERMISSIONS_GRANTED) {
                                addSmartDocEvents(captureDocCb);
                                liveDocCamera.isOpen = true;

                            } else {
                                onDone({ sdkError: r });
                            }
                        });
                    }
                } else {
                    if (doFace) {
                        log("Starting face smart capture...");
                        getCameraPermission(true).then((r) => {
                            if (r === ThalesThinLib.ENUM.CAMERA_PERMISSIONS_GRANTED) {
                                let liveFaceCamera =
                                    document.getElementById("live-face-camera");
                                if (!liveFaceCamera) {
                                    onDone({ sdkError: ThalesThinLib.ENUM.SDK_CONFIG_ERROR });
                                } else {
                                    if (options.ui) {
                                        if (!liveFaceCamera.hints) {
                                            liveFaceCamera.hints = {};
                                        }
                                        if (options.ui.notInitializedHint) {
                                            liveFaceCamera.hints.notInitializedHint = options.ui.notInitializedHint;
                                        }
                                        if (options.ui.initializingHint) {
                                            liveFaceCamera.hints.initializingHint = options.ui.initializingHint;
                                        }
                                        if (options.ui.faceNotFoundHint) {
                                            liveFaceCamera.hints.faceNotFoundHint = options.ui.faceNotFoundHint;
                                        }
                                        if (options.ui.probabilityTooSmallHint) {
                                            liveFaceCamera.hints.probabilityTooSmallHint = options.ui.probabilityTooSmallHint;
                                        }
                                        if (options.ui.tooManyFacesHint) {
                                            liveFaceCamera.hints.tooManyFacesHint = options.ui.tooManyFacesHint;
                                        }
                                        if (options.ui.faceAngleTooLargeHint) {
                                            liveFaceCamera.hints.faceAngleTooLargeHint = options.ui.faceAngleTooLargeHint;
                                        }
                                        if (options.ui.faceTooSmallHint) {
                                            liveFaceCamera.hints.faceTooSmallHint = options.ui.faceTooSmallHint;
                                        }
                                        if (options.ui.faceCloseToBorderHint) {
                                            liveFaceCamera.hints.faceCloseToBorderHint = options.ui.faceCloseToBorderHint;
                                        }
                                        if (options.ui.faceInstruction) {
                                            liveFaceCamera.uiTexts.faceInstruction = options.ui.faceInstruction;
                                            liveFaceCamera.accessibilityTexts.placeYourFaceText = options.ui.faceInstruction;
                                        }
                                        if (options.ui.landscapeTitle) {
                                            liveFaceCamera.uiTexts.landscapeTitle = options.ui.landscapeTitle;
                                        }
                                        if (options.ui.landscapeSubtitle) {
                                            liveFaceCamera.uiTexts.landscapeSubtitle = options.ui.landscapeSubtitle;
                                        }
                                        if (options.ui.photoCapturedText) {
                                            liveFaceCamera.accessibilityTexts.capturedPhotoText = options.ui.photoCapturedText;
                                        }
                                        if (options.ui.extraAccessibilityTexts) {
                                            if (!liveFaceCamera.ariaLabels) {
                                                liveFaceCamera.ariaLabels = {};
                                            }
                                            if (options.ui.extraAccessibilityTexts.backButton) {
                                                liveFaceCamera.ariaLabels.backButton = options.ui.extraAccessibilityTexts.backButton;
                                                liveFaceCamera.accessibilityTexts.backButtonAriaLabel = options.ui.extraAccessibilityTexts.backButton;
                                            }
                                            if (options.ui.extraAccessibilityTexts.deviceOrientationText) {
                                                liveFaceCamera.uiTexts.deviceOrientationText = options.ui.extraAccessibilityTexts.deviceOrientationText;
                                            }
                                            if (options.ui.extraAccessibilityTexts.landscapeOrientationText) {
                                                liveFaceCamera.uiTexts.landscapeOrientationText = options.ui.extraAccessibilityTexts.landscapeOrientationText;
                                            }
                                            if (options.ui.extraAccessibilityTexts.portraitOrientationText) {
                                                liveFaceCamera.uiTexts.portraitOrientationText = options.ui.extraAccessibilityTexts.portraitOrientationText;
                                            }
                                        }
                                        //Back button
                                        if (options.ui.disableBackButton) {
                                            liveFaceCamera.showBackButton = false;
                                        }
                                    }
                                    //Configure Timeout
                                    if (options.captureTimeout > 0) {
                                        liveFaceCamera.autoCaptureTimeoutDuration = options.captureTimeout;
                                        liveFaceCamera.enableAutoCaptureTimeout = true;
                                    } else {
                                        liveFaceCamera.autoCaptureTimeoutDuration = 0;
                                    }
                                    //Lock orientation
                                    /* It is deemed that devices don't support lock without fullscreen at this time
                                    if (options.enableOrientationLock) {
                                        liveFaceCamera.enableOrientationLock = options.enableOrientationLock;
                                    }
                                    */
                                    //Show preview screen
                                    /* It is deemed not desirable for a user to make this choice
                                    if (options.showPreviewScreen) {
                                        liveFaceCamera.showPreviewScreen = options.showPreviewScreen;
                                    }
                                    */
                                    //Choose camera
                                    /* It is deemed an incomplete feature as the list of devices
                                    //have to be retrieved first
                                    if (options.deviceId) {
                                        liveFaceCamera.deviceId = options.showPreviewScreen;
                                    }
                                    */
                                    addSmartFaceEvents(captureFaceCb);
                                    liveFaceCamera.isOpen = true;
                                }
                            } else {
                                onDone({ sdkError: r });
                            }
                        });

                    }
                }
            } catch (exception) {
                log("Execution exception: " + exception)
                if (!session.internal) {
                    session.internal = {};
                }
                if (!session.internal.errors) {
                    session.internal.errors = {};
                }
                if (!session.internal.errors["EXECUTION_EXCEPTION"]) {
                    session.internal.errors["EXECUTION_EXCEPTION"] = 1;
                } else {
                    session.internal.errors["EXECUTION_EXCEPTION"]++;
                }
                reject(ThalesThinLib.ENUM.SDK_ERROR);
            }
        });
    }

    function captureBack() {
        const session = globalSession;
        session.internal.isBack = true;
        //If back-side is never captured or completley abandoned
        session.internal.worstErrorBack = ThalesThinLib.ENUM.NO_CAPTURE;
    }

    function captureDocumentDone(result) {
        const session = globalSession;
        if (session && session.internal) {
            session.internal.isDone = true;
            //Session has ended
            if (!session.internal.shouldDoFace) {
                if (window.sessionStorage) {
                    try {
                        window.sessionStorage.removeItem(STORETEMPID);
                    } catch (err) {
                        log("Cannot use session storage to remove Temp Log ID: " + err);
                    }
                }
            }
            session.internal.lastEvent = ThalesThinLib.ENUM.EVENT_VERIFICATION_DONE;
            session.internal.verifResult = result;

            //Reset document capture attempts
            session.internal.captureAttempts = 0;
            session.internal.captureBackAttempts = 0;
        }
    }

    function captureFaceDone(result) {
        const session = globalSession;
        if (session && session.internal) {
            session.internal.isFaceDone = true;
            session.internal.verifFaceResult = result;
            if (window.sessionStorage) {
                try {
                    window.sessionStorage.removeItem(STORETEMPID);
                } catch (err) {
                    log("Cannot use session storage to remove Temp Log ID: " + err);
                }
            }
            session.internal.lastEvent =
                ThalesThinLib.ENUM.EVENT_FACE_VERIFICATION_DONE;

            //Reset capture attempts
            session.internal.captureFaceAttempts = 0;
        }
    }

    function getSessionState() {
        const session = globalSession;
        if (!session || !session.internal) {
            return null;
        }
        return !!session.internal.isFaceDone
            ? ThalesThinLib.ENUM.STATE_FACE_DONE
            : !!session.internal.isFace
                ? ThalesThinLib.ENUM.STATE_FACE
                : !!session.internal.isDone
                    ? ThalesThinLib.ENUM.STATE_FRONT_BACK
                    : !!session.internal.isBack
                        ? ThalesThinLib.ENUM.STATE_BACK
                        : ThalesThinLib.ENUM.STATE_FRONT;
    }

    function getCaptures() {
        const session = globalSession;
        if (!session || !session.internal) {
            log("No session");
            return null;
        }
        //For now, only face and document attemptes are seperated, front and back
        //intentinoally use the same attempt/retry counter
        const side = session.internal.isFace ? "Face" : (session.internal.isBack ? "Back" : "");
        const maxAttempts = session.internal["maxCapture" + side + "Attempts"];
        const attempts = session.internal["capture" + side + "Attempts"];
        if (
            maxAttempts === undefined ||
            maxAttempts === null ||
            attempts === undefined ||
            attempts === null
        ) {
            log("No capture attempts set");
            return {
                left: session.internal.isFace
                    ? DEFAULT_MAX_FACE_CAPTURES
                    : DEFAULT_MAX_CAPTURES,
                max: session.internal.isFace
                    ? DEFAULT_MAX_FACE_CAPTURES
                    : DEFAULT_MAX_CAPTURES,
            };
        }
        log("Captures left: " + (maxAttempts - attempts) + "/" + maxAttempts);
        return {
            left: maxAttempts - attempts,
            max: maxAttempts,
        };
    }

    function setLogData(data) {
        const session = globalSession;
        if (session && session.internal) {
            if (
                !data ||
                typeof data !== "object" ||
                !data.key ||
                !data.value ||
                typeof data.key !== "string" ||
                typeof data.value !== "string" ||
                data.value.length > 100 ||
                data.key.length > 100
            ) {
                log(
                    "Can only store an object {key, value} with fields up to 100 char string"
                );
                return;
            }
            if (!session.internal.extData) {
                session.internal.extData = [];
            }
            //Override existing
            for (let i = 0; i < session.internal.extData.length; ++i) {
                if (session.internal.extData[i].key === data.key) {
                    session.internal.extData[i].value = data.value;
                    return;
                }
            }
            //Or create new
            session.internal.extData.push(data);
        }
    }

    function getBestResultImage(side, encrypted) {
        const session = globalSession;
        if (!session) {
            log("No session object");
            return null;
        }
        if (!session.internal) {
            log("No internal field in session object");
            return null;
        }
        let label = session.internal.isFace
            ? "bestResultFace"
            : session.internal.isBack
                ? "bestResultBack"
                : "bestResult";
        //choose explicit
        if (side && typeof side === "string") {
            if (side.toUpperCase() === "FRONT") {
                label = "bestResult";
            } else if (side.toUpperCase() === "BACK") {
                label = "bestResultBack";
            } else if (side.toUpperCase() === "FACE") {
                label = "bestResultFace";
            }
        }
        if (!session.internal[label]) {
            log("No result for: " + label);
            return null;
        }
        if (!session.internal[label].image) {
            log("No image for result for: " + label);
            return null;
        }
        if (encrypted) {
            return session.internal[label].encryptedFile;
        } else {
            return session.internal[label].image.data.split(",", 2)[1];
        }
    }

    function getBestResultDetails(side) {
        const session = globalSession;
        if (!session || !session.internal) {
            return null;
        }
        let label = session.internal.isFace
            ? "bestResultFace"
            : session.internal.isBack
                ? "bestResultBack"
                : "bestResult";
        //choose explicit
        if (side && typeof side === "string") {
            if (side.toUpperCase() === "FRONT") {
                label = "bestResult";
            } else if (side.toUpperCase() === "BACK") {
                label = "bestResultBack";
            } else if (side.toUpperCase() === "FACE") {
                label = "bestResultFace";
            }
        }
        let safeCopyExtra = null;
        try {
            safeCopyExtra = JSON.parse(JSON.stringify(session.internal[label].extra))
        } catch { }
        return !session.internal[label]
            ? null
            : {
                width: session.internal[label].image
                    ? session.internal[label].image.width
                    : null,
                height: session.internal[label].image
                    ? session.internal[label].image.height
                    : null,
                sharpness: session.internal[label].sharpness,
                glare: session.internal[label].glare,
                dpi: session.internal[label].dpi,
                moire: session.internal[label].moire,
                isPortraitOrientation: session.internal[label].isPortraitOrientation,
                size:
                    !!session.internal[label].image &&
                        !!session.internal[label].image.data
                        ? session.internal[label].image.data.length
                        : null,
                extra: safeCopyExtra,
            };
    }

    function getSessionPreviewImage(side) {
        const session = globalSession;
        if (!session || !session.internal) {
            return null;
        }
        let label = session.internal.isFace ?
            "previewImageFace" :
            !session.internal.isBack ?
                "previewImage" :
                "previewImageBack";
        //choose explicit
        if (side && typeof side === "string") {
            if (side.toUpperCase() === "FACE") {
                label = "previewImageFace";
            } else if (side.toUpperCase() === "BACK") {
                label = "previewImageBack";
            } else {
                label = "previewImage";
            }
        }
        return session.internal[label];
    }

    function getLog() {
        const session = globalSession;
        if (!session || !session.internal) {
            return {};
        }
        buildLog();
        return session.internal.logJson;
    }
    function buildLog() {
        const session = globalSession;
        if (!session || !session.internal) {
            return {};
        }
        const sessionObj = session.internal;
        session.internal.logJson = {
            id: sessionObj.id,
            version: VERSION,
            internalSdkVersion: sessionObj.sdkVersion,
            internalSdkVersionFace: sessionObj.sdkVersionFace,
            lastEvent: sessionObj.lastEvent,
            uiShown: sessionObj.uiShown,
            isDetectInit: sessionObj.isDetectInit,
            isDetectInitFace: sessionObj.isDetectInitFace,
            initTime: sessionObj.initTime,
            finalAttempt: sessionObj.finalAttempt,
            sdkAttempts: sessionObj.sdkAttempts,
            maxSdkAttempts: sessionObj.maxSdkAttempts,
            worstError: sessionObj.worstError,
            worstErrorBack: sessionObj.worstErrorBack,
            worstErrorFace: sessionObj.worstErrorFace,
            captureTime: sessionObj.captureTime,
            captureTimeBack: sessionObj.captureTimeBack,
            captureTimeFace: sessionObj.captureTimeFace,
            lastError: sessionObj.lastError,
            errors: sessionObj.errors,
            isBack: sessionObj.isBack,
            isFace: sessionObj.isFace,
            isDone: sessionObj.isDone,
            isFaceDone: sessionObj.isFaceDone,
            timestamp: sessionObj.timestamp,
            autoDetection: sessionObj.detection,
            autoDetectionBack: sessionObj.detectionBack,
            autoDetectionFace: sessionObj.detectionFace,
            options: sessionObj.options,
            captureDetails: getBestResultDetails("FRONT"),
            captureDetailsBack: getBestResultDetails("BACK"),
            captureDetailsFace: getBestResultDetails("FACE"),
            captureAttempts: sessionObj.captureAttempts,
            maxCaptureAttempts: sessionObj.maxCaptureAttempts,
            captureBackAttempts: sessionObj.captureBackAttempts,
            maxCaptureBackAttempts: sessionObj.maxCaptureBackAttempts,
            captureFaceAttempts: sessionObj.captureFaceAttempts,
            maxCaptureFaceAttempts: sessionObj.maxCaptureFaceAttempts,
            externalData: sessionObj.extData,
            verificationResult: sessionObj.verifResult,
            verificationFaceResult: sessionObj.verifFaceResult,
            device: sessionObj.device,
            camera: sessionObj.camera,
        };
    }

    function initSdk(config, force) {
        return new Promise((resolve, reject) => {
            const session = newSession(null);
            //Check if already initialized
            if (isSdkInitialized && force !== true) {
                log("SDK already initialized");
                resolve();
                return;
            }
            let opt = config ? config.init : null;
            if (!opt) {
                log("SDK initializations requires an config.init object");
                reject(ThalesThinLib.ENUM.SDK_CONFIG_ERROR);
                return;
            }
            let startTime = Date.now();
            const SmartCaptureLib = "SmartCaptureLib";
            const rootUrl = window.location.href.substring(
                0,
                window.location.href.lastIndexOf("/") + 1
            );
            //Smart capture SDK path, loaded as a package            
            const SmartCaptureLibPath = "@gbgplc/smartcapture-web" + (
                opt.onlyDocument ? "/document" : opt.onlyFace ? "/face" : "");

            const fillRootColor = opt.fillRootColor || "black";
            const zIndexRoot = opt.zIndex || 1000;
            let CameraLibPath = SmartCaptureLibPath;
            let FaceCaptureLibPath = SmartCaptureLibPath;

            //Initialize session data
            session.internal.isDetectInit = false;
            session.internal.isDetectInitFace = false;
            session.internal.id = session.internal.id || getLogId(opt.channel, false);
            session.internal.worstError =
                session.internal.worstErrorBack =
                session.internal.worstErrorFace =
                ThalesThinLib.ENUM.SDK_INIT_ERROR;
            session.internal.lastEvent = session.internal.lastEvent ?
                session.internal.lastEvent :
                ThalesThinLib.ENUM.EVENT_INIT;
            if (opt.onlyFace) {
                session.internal.isFace = true;
                session.internal.onlyFace = true;
            } else {
                session.internal.onlyFace = undefined;
            }
            log("SDK initializing...");
            checkDeviceModel().then((dm) => {
                deviceModel = dm;
                session.internal.device = {
                    platform: platform(),
                    model: deviceModel,
                    userAgent:
                        window.navigator && window.navigator.userAgent
                            ? window.navigator.userAgent
                            : null,
                    brands:
                        window.navigator &&
                            window.navigator.userAgentData &&
                            window.navigator.userAgentData.brands &&
                            window.navigator.userAgentData.brands.length > 0
                            ? window.navigator.userAgentData.brands
                            : null,
                    attrs: initMobileAttributes,
                };

                const libLoad = !opt.onlyFace
                    ? new Promise((libRes, libRej) => {
                        if (window[SmartCaptureLib]) {
                            libRes();
                            return;
                        }
                        let liveDocCamera = document.getElementById("live-document-camera");
                        if (!liveDocCamera) {
                            liveDocCamera = createSmartDocumentLiveCameraHTML(
                                zIndexRoot,
                                fillRootColor,
                                opt.debugBorders);
                        }
                        import(CameraLibPath)
                            .then((module) => {
                                if (!module || !module.LiveDocumentCamera) {
                                    log("Failed to load doc capture module");
                                    libRej();
                                    return;
                                }
                                log(CameraLibPath + " loaded");
                                window[SmartCaptureLib] = module;
                                const hasInitFun = opt.disableInitOptimization !== true && window[SmartCaptureLib].SmartCaptureModule &&
                                    typeof window[SmartCaptureLib].SmartCaptureModule.getInstance === 'function';
                                try {
                                    if (hasInitFun) {
                                        window[SmartCaptureLib].SmartCaptureModule.getInstance().init().then(() => {
                                            session.internal.isDetectInit = true;
                                            log("Document detection initialized");
                                            libRes();
                                        }).catch(e => {
                                            log("Document detection didn't initialize: " + e);
                                        });
                                    }
                                } catch (e) {
                                    log(
                                        "Error initializing smart capture module: " +
                                        e
                                    );
                                }
                                if (!hasInitFun || !opt.slowLoadTimeout || opt.slowLoadTimeout <= 0) {
                                    libRes();
                                } else if (opt.slowLoadTimeout > 0) {
                                    window.setTimeout(() => {
                                        if (!session.internal.isDetectInit) {
                                            log("Smart Capture module not initialized in time");
                                            libRej();
                                        } else {
                                            libRes();
                                        }
                                    }, opt.slowLoadTimeout);
                                }
                            })
                            .catch((err) => {
                                log(
                                    "Warning! " + CameraLibPath + " failed to load:" + err
                                );
                                libRej();
                            });

                    })
                    : Promise.resolve();

                // Face lib       
                const libFaceCapture = !opt.onlyDocument
                    ? new Promise((libRes, libRej) => {
                        if (window[SmartCaptureLib]) {
                            libRes();
                            return;
                        }

                        let liveFaceCamera = document.getElementById("live-face-camera");
                        if (!liveFaceCamera) {
                            liveFaceCamera = createSmartFaceLiveCameraHTML(
                                zIndexRoot,
                                fillRootColor);
                        }
                        import(FaceCaptureLibPath)
                            .then((module) => {
                                if (!module || !module.LiveFaceCamera) {
                                    log("Failed to load face capture module");
                                    libRej();
                                    return;
                                }
                                log(FaceCaptureLibPath + " loaded");
                                window[SmartCaptureLib] = module;
                                const onDetectorInitialized = () => {
                                    session.internal.isDetectInitFace = true;
                                    log("Face detection initialized");
                                    if (opt.slowLoadTimeout > 0) {
                                        //Detector initialization is mandatory
                                        libRes();
                                    }
                                };
                                liveFaceCamera.removeEventListener(
                                    module.LiveFaceCamera.InitializeEventName,
                                    onDetectorInitialized
                                );
                                liveFaceCamera.addEventListener(
                                    module.LiveFaceCamera.InitializeEventName,
                                    onDetectorInitialized
                                );
                                if (!opt.slowLoadTimeout || opt.slowLoadTimeout <= 0) {
                                    libRes();
                                } else if (opt.slowLoadTimeout > 0) {
                                    window.setTimeout(() => {
                                        if (!session.internal.isDetectInitFace) {
                                            log("Face detection didn't initialize on time");
                                            libRej();
                                        } else {
                                            libRes();
                                        }
                                    }, opt.slowLoadTimeout);
                                }
                            })
                            .catch((err) => {
                                log(
                                    "Warning! " +
                                    FaceCaptureLibPath +
                                    " failed to load:" +
                                    err
                                );
                                libRej();
                            });

                    })
                    : Promise.resolve();

                //Wait for libraries to load
                const libList = [libLoad, libFaceCapture];
                Promise.all(libList)
                    .then(() => {
                        if (opt.onlyFace) {
                            session.internal.worstErrorFace = ThalesThinLib.ENUM.NO_CAPTURE;
                        } else {
                            session.internal.worstError = ThalesThinLib.ENUM.NO_CAPTURE;
                        }
                        isSdkInitialized = true;
                        session.internal.initTime = Date.now() - startTime;
                        resolve();
                    })
                    .catch(() => {
                        reject(ThalesThinLib.ENUM.SDK_INIT_ERROR);
                    });
            });
        });
    }

    function createSmartFaceLiveCameraHTML(zIndexRoot, fillRootColor, debugBorders) {
        const liveFaceCamera = document.createElement("live-face-camera");
        liveFaceCamera.id = "live-face-camera";
        liveFaceCamera.style.position = "fixed";
        liveFaceCamera.style.width = "100dvw";
        liveFaceCamera.style.height = "100dvh";
        liveFaceCamera.style.maxWidth = "100dvw";
        liveFaceCamera.style.maxHeight = "100dvh";
        liveFaceCamera.style.top = 0;
        liveFaceCamera.style.left = 0;
        liveFaceCamera.style.right = 0;
        liveFaceCamera.style.bottom = 0;
        liveFaceCamera.style.padding = 0;
        liveFaceCamera.style.margin = 0;
        liveFaceCamera.style.backgroundColor = fillRootColor;
        liveFaceCamera.style.zIndex = zIndexRoot;
        liveFaceCamera.style.display = "none";
        if (debugBorders) {
            liveFaceCamera.style.border = "2px solid purple";
            liveFaceCamera.style.border = "2px solid yellow";
            liveFaceCamera.style.border = "2px solid red";
        }
        window.document.body.appendChild(liveFaceCamera);
        return liveFaceCamera;
    }

    function createSmartDocumentLiveCameraHTML(zIndexRoot, fillRootColor, debugBorders) {
        const liveDocCamera = document.createElement("live-document-camera");
        liveDocCamera.id = "live-document-camera";
        liveDocCamera.style.position = "fixed";
        liveDocCamera.style.width = "100dvw";
        liveDocCamera.style.height = "100dvh";
        liveDocCamera.style.maxWidth = "100dvw";
        liveDocCamera.style.maxHeight = "100dvh";
        liveDocCamera.style.top = 0;
        liveDocCamera.style.left = 0;
        liveDocCamera.style.right = 0;
        liveDocCamera.style.bottom = 0;
        liveDocCamera.style.padding = 0;
        liveDocCamera.style.margin = 0;
        liveDocCamera.style.backgroundColor = fillRootColor;
        liveDocCamera.style.zIndex = zIndexRoot;
        liveDocCamera.style.display = "none";
        if (debugBorders) {
            liveFaceCamera.style.border = "2px solid purple";
            liveFaceCamera.style.border = "2px solid yellow";
            liveFaceCamera.style.border = "2px solid red";
        }
        window.document.body.appendChild(liveDocCamera);
        return liveDocCamera;
    }


    function getWorstCode(currCode, newCode) {
        const max_errors = 100;
        function weightErr(code) {
            switch (code) {
                //SDK has a valid upload of the image at least once
                case ThalesThinLib.ENUM.IMAGE_UPLOADED:
                    return max_errors - 9;
                case ThalesThinLib.ENUM.LOW_SHARPNESS:
                    return max_errors - 10;
                case ThalesThinLib.ENUM.HIGH_GLARE:
                    return max_errors - 11;
                case ThalesThinLib.ENUM.LOW_RES:
                    return max_errors - 11;
                case ThalesThinLib.ENUM.NO_IMAGE:
                    return max_errors - 12;
                //User doesn't complete the flow even once
                case ThalesThinLib.ENUM.ERROR_TIMEOUT:
                    return max_errors - 13;
                case ThalesThinLib.ENUM.ERROR_CLOSE_BTN:
                    return max_errors - 14;
                case ThalesThinLib.ENUM.BROWSER_NOT_SUPPORTED:
                case ThalesThinLib.ENUM.SDK_ERROR:
                    return max_errors - 15;
                case ThalesThinLib.ENUM.SDK_FAILED:
                    return max_errors - 16;
                case ThalesThinLib.ENUM.CAMERA_PARAMS_ERR:
                    return max_errors - 18;
                case ThalesThinLib.ENUM.CAMERA_ISSUE:
                    return max_errors - 19;
                case ThalesThinLib.ENUM.CAMERA_PERMISSIONS_DENIED:
                case ThalesThinLib.ENUM.CAMERA_PERMISSIONS_UNKNOWN:
                    return max_errors - 20;
                case ThalesThinLib.ENUM.NO_CAPTURE:
                    return max_errors - 22;
                case ThalesThinLib.ENUM.SDK_INIT_ERROR:
                    return max_errors - 23;
                case ThalesThinLib.ENUM.SDK_CONFIG_ERROR:
                    return max_errors - 24;
                default:
                    return 0;
            }
        }
        let code1Score = weightErr(currCode);
        let code2Score = weightErr(newCode);
        return code1Score > code2Score ? currCode : newCode;
    }

    function getInternalSession(sizeOnly) {
        return sizeOnly ? JSON.stringify(globalSession).length : globalSession;
    }

    function decodeBase64(base64) {
        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const lookup = new Uint8Array(256);
        for (var i = 0; i < chars.length; i++) {
            lookup[chars.charCodeAt(i)] = i;
        }
        let bufferLength = base64.length * 0.75;
        let len = base64.length;
        let p = 0;
        let encoded1, encoded2, encoded3, encoded4;

        let arraybuffer = new ArrayBuffer(bufferLength);
        let bytes = new Uint8Array(arraybuffer);

        for (let i = 0; i < len; i += 4) {
            encoded1 = lookup[base64.charCodeAt(i)];
            encoded2 = lookup[base64.charCodeAt(i + 1)];
            encoded3 = lookup[base64.charCodeAt(i + 2)];
            encoded4 = lookup[base64.charCodeAt(i + 3)];

            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }

        return arraybuffer;
    }

    function checkDeviceModel() {
        //Get screen size based device model
        function screenSize() {
            if (!window.screen || !window.screen.width || !window.screen.height) {
                return platform();
            }
            let dims = [window.screen.width, window.screen.height];
            let long = Math.max(...dims);
            let short = Math.min(...dims);
            return platform() + "-" + long + "-" + short;
        }
        return new Promise((resolve) => {
            //Get device model
            if (
                window.navigator &&
                window.navigator.userAgentData &&
                window.navigator.userAgentData.getHighEntropyValues
            ) {
                window.navigator.userAgentData
                    .getHighEntropyValues(["model"])
                    .then((dm) => {
                        if (!dm) {
                            resolve(screenSize());
                        } else {
                            log("Got device attributes: " + JSON.stringify(dm));
                            if (typeof dm === "string") {
                                resolve(dm);
                            } else if (typeof dm.model === "string") {
                                resolve(dm.model);
                            } else {
                                resolve(screenSize());
                            }
                        }
                    })
                    .catch((err) => {
                        log("Couldn't retrieve device attributes: " + err);
                        resolve(screenSize());
                    });
            } else {
                resolve(screenSize());
            }
        });
    }

    async function getCameraPermission(checkFirst) {
        if (
            !window.navigator ||
            !window.navigator.mediaDevices ||
            !window.navigator.mediaDevices.getUserMedia
        ) {
            log("Permission: no getUserMedia");
            return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_UNKNOWN;
        }
        if (checkFirst) {
            const current = await checkCameraPermission();
            if (current === ThalesThinLib.ENUM.CAMERA_PERMISSIONS_GRANTED) {
                return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_GRANTED;
            }
        }
        try {
            const stream = await window.navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
            });
            if (!stream || !stream.getTracks) {
                log(
                    "Permission: no video track acquired, but permissions should be OK"
                );
                return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_GRANTED;
            }
            const tracks = stream.getTracks();
            if (tracks && tracks.length > 0) {
                try {
                    const caps = tracks[0].getCapabilities();
                    if (caps) {
                        latestDeviceCaps = caps;
                    }
                } catch (_) { }
                tracks.forEach((track) => {
                    try {
                        track.stop();
                    } catch (_) { }
                });
            }
            log("Permission: granted");
            return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_GRANTED;
        } catch (err) {
            log("Permission error: " + err);
            if (err && err.name === "NotAllowedError") {
                log("Permission: denied by user");
                return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_DENIED;
            } else {
                log("Permission: couldn't acquire the camera");
                return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_UNKNOWN;
            }
        }
    }

    async function checkCameraPermission() {
        if (
            !window.navigator ||
            !window.navigator.permissions ||
            !window.navigator.permissions.query
        ) {
            log("Check Permission: query permissions not supported");
            return ThalesThinLib.ENUM.UNKNOWN;
        }
        try {
            const perm = await window.navigator.permissions.query({ name: "camera" });
            if (!perm || !perm.state) {
                log("Permission: couldn't query camera permissions");
                return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_UNKNOWN;
            }
            log("Check Permission: " + perm.name + "=" + perm.state);
            if (perm.state === "denied") {
                return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_DENIED;
            } else if (perm.state === "granted") {
                return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_GRANTED;
            } else if (perm.state === "prompt") {
                return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_PROMPT;
            } else {
                return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_UNKNOWN;
            }
        } catch (err) {
            log("Check Permission: query returned an error: " + err);
            return ThalesThinLib.ENUM.CAMERA_PERMISSIONS_UNKNOWN;
        }
    }

    log("VERSION: " + VERSION);

    //Public Functions
    return {
        utils: {
            platform: platform,
            checkDeviceModel: checkDeviceModel,
            decodeBase64: decodeBase64,
        },
        withSdk: {
            capture: capture,
            switchSide: captureBack,
            bothSidesDone: captureDocumentDone,
            faceDone: captureFaceDone,
            getState: getSessionState,
            getImage: getBestResultImage,
            getPreviewImage: getSessionPreviewImage,
            getLog: getLog,
            init: initSdk,
            newSession: newSession,
            getInternalSession: getInternalSession,
            getCaptures: getCaptures,
            setLogData: setLogData,
            setLogger: setLogger,
            log: log,
        },
        cameraUtils: {
            getPermissions: getCameraPermission,
            checkPermissions: checkCameraPermission,
            getDevices: getDevices,
        },
        ENUM: {
            VERSION: VERSION,
            TD1: "TD1",
            TD2: "TD2",
            TD3: "TD3",
            FACE: "FACE",
            DOCUMENT: "DOCUMENT",
            A4: "A4",

            ERROR_TIMEOUT: "ERROR_TIMEOUT",
            ERROR_CLOSE_BTN: "ERROR_CLOSE_BTN",
            LOW_RES: "LOW_RES",
            LOW_SHARPNESS: "LOW_SHARPNESS",
            HIGH_GLARE: "HIGH_GLARE",
            SDK_ERROR: "SDK_ERROR",
            BROWSER_NOT_SUPPORTED: "BROWSER_NOT_SUPPORTED",
            SDK_FAILED: "SDK_FAILED",
            SDK_INIT_ERROR: "SDK_INIT_ERROR",
            SDK_CONFIG_ERROR: "SDK_CONFIG_ERROR",
            CAPTURE_BACK: "CAPTURE_BACK",

            IMAGE_UPLOADED: "IMAGE_UPLOADED",
            NO_CAPTURE: "NO_CAPTURE",

            ANDROID: "ANDROID",
            IOS: "IOS",
            DESKTOP: "DESKTOP",
            NONE: "NONE",

            CAMERA_PERMISSIONS_DENIED: "CAMERA_PERMISSIONS_DENIED",
            CAMERA_PERMISSIONS_GRANTED: "CAMERA_PERMISSIONS_GRANTED",
            CAMERA_PERMISSIONS_PROMPT: "CAMERA_PERMISSIONS_PROMPT",
            CAMERA_PERMISSIONS_UNKNOWN: "CAMERA_PERMISSIONS_UNKNOWN",
            CAMERA_PARAMS_ERR: "CAMERA_PARAMS_ERR",
            CAMERA_ISSUE: "CAMERA_ISSUE",

            COMMON_CAMERA_RATIO: "COMMON_CAMERA_RATIO",
            WIDE_CAMERA_RATIO: "WIDE_CAMERA_RATIO",
            FULL_CAMERA_RATIO: "WIDE_CAMERA_RATIO",

            AUTO_CAPTURE: "AUTO_CAPTURE",
            TAP_TO_CAPTURE: "TAP_TO_CAPTURE",

            STATE_FRONT: "STATE_FRONT",
            STATE_BACK: "STATE_BACK",
            STATE_FRONT_BACK: "STATE_FRONT_BACK",
            STATE_FACE: "STATE_FACE",
            STATE_FACE_DONE: "STATE_FACE_DONE",

            EVENT_CAPTURE_FRONT: "EVENT_CAPTURE_FRONT",
            EVENT_CAPTURE_BACK: "EVENT_CAPTURE_BACK",
            EVENT_CAPTURE_FACE: "EVENT_CAPTURE_FACE",
            EVENT_VERIFICATION_DONE: "EVENT_VERIFICATION_DONE",
            EVENT_FACE_VERIFICATION_DONE: "EVENT_FACE_VERIFICATION_DONE",
            EVENT_INIT: "EVENT_INIT",

            VERIFICATION_ACCEPTED: "VERIFICATION_ACCEPTED",
            VERIFICATION_REJECTED: "VERIFICATION_REJECTED",

            BACKEND_SESSION: "BACKEND_SESSION",
            BACKEND_ERROR: "BACKEND_ERROR",

            NO_IMAGE: "NO_IMAGE",
            PROCESSING: "PROCESSING",
        },
    };
})();
const module = window.ThalesThinLib;

//*** Comment out this line if you want to load it as a classic JavaScript library
export { module as ThalesThinLib };
