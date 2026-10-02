import * as lit_html from 'lit-html';
import * as lit from 'lit';
import { LitElement, TemplateResult } from 'lit';
import { Ref } from 'lit/directives/ref.js';
import { DotLottieWC } from '@lottiefiles/dotlottie-wc';

type FaceAccessibilityTexts = {
    backButtonAriaLabel?: string;
    placeYourFaceText?: string;
    capturedPhotoText?: string;
};

type FaceDetectionHint = {
    notInitializedHint?: string;
    initializingHint?: string;
    faceNotFoundHint?: string;
    tooManyFacesHint?: string;
    faceAngleTooLargeHint?: string;
    probabilityTooSmallHint?: string;
    faceTooSmallHint?: string;
    faceCloseToBorderHint?: string;
};

type FaceCaptureResult = {
    imageBase64: string;
    encryptedFile: Blob | null;
};
type FacePreviewScreenTexts = {
    title: string;
    body: string;
    photoAltText: string;
    continueButtonText: string;
    retakeButtonText: string;
};
/**
 * Aria labels for this screen's buttons. Separated from `texts` to allow
 * independent translation/localization, consistent with `live-face-camera`.
 */
type FacePreviewScreenAriaLabels = {
    continueButton: string;
    retakeButton: string;
};
/**
 * Confirmation screen shown after a face capture, letting the user review the
 * selfie before continuing or retaking it. Internal to the SDK — composed
 * inside `live-face-camera`'s own capture flow, not mounted or configured
 * directly by consumers (aside from `texts`). Controlled via
 * `show(captureResult)`/`hide()` by whichever internal component composes
 * it; dispatches `continue`/`retake` for that parent to react to.
 */
declare class FacePreviewScreen extends LitElement {
    static readonly ContinueEventName = "continue";
    static readonly RetakeEventName = "retake";
    static styles: lit.CSSResult;
    private open;
    private captureResult;
    texts: Partial<FacePreviewScreenTexts>;
    previewAriaLabels: Partial<FacePreviewScreenAriaLabels>;
    private static readonly DEFAULT_TEXTS;
    private static readonly DEFAULT_ARIA_LABELS;
    private get mergedTexts();
    private get mergedAriaLabels();
    private readonly dialogRef;
    private previouslyFocusedElement;
    private getFocusableElements;
    private readonly handleDocumentKeydown;
    /** Shows the screen with the given capture result. Called by `live-face-camera`. */
    show(captureResult: FaceCaptureResult): void;
    /** Hides the screen. Called by `live-face-camera`. */
    hide(): void;
    updated(changedProperties: Map<string, unknown>): void;
    disconnectedCallback(): void;
    private continue;
    private retake;
    /**
     * The default English copy bolds "clear", "in focus", and "directly face
     * on" per design. That emphasis is tied to this exact English phrasing, so
     * it only applies to the default text — a client-provided `texts.body`
     * translation renders as plain text instead of guessing which words to
     * re-bold.
     */
    private renderBody;
    render(): lit_html.TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'face-preview-screen': FacePreviewScreen;
    }
}

type FaceAriaLabels = {
    backButton: string;
    forcePortraitMode: string;
};
type FaceTexts = {
    step1Title: string;
    step2Title: string;
    step3Title: string;
    step1Description: string;
    step2Description: string;
    step3Description: string;
    faceInstruction: string;
    landscapeTitle: string;
    landscapeSubtitle: string;
    landscapeButtonLabel: string;
    orientationErrorMessage: string;
    deviceOrientationText: string;
    landscapeOrientationText: string;
    portraitOrientationText: string;
};
declare enum FaceDetectionState {
    NotInitialized = "NOT_INITIALIZED",
    FaceNotFound = "FACE_NOT_FOUND",
    TooManyFaces = "TOO_MANY_FACES",
    FaceAngleTooLarge = "FACE_ANGLE_TOO_LARGE",
    ProbabilityTooSmall = "PROBABILITY_TOO_SMALL",
    FaceTooSmall = "FACE_TOO_SMALL",
    FaceCloseToBorder = "FACE_CLOSE_TO_BORDER"
}
declare class LiveFaceCamera extends LitElement {
    static readonly BeforeInitializeEventName: string;
    static readonly InitializeEventName: string;
    static readonly BeforeOpenEventName: string;
    static readonly OpenEventName: string;
    static readonly DetectEventName: string;
    static readonly BeforeCaptureEventName: string;
    static readonly CaptureEventName: string;
    static readonly CloseEventName: string;
    static readonly UserCanceledEventName: string;
    static readonly FailureEventName: string;
    private static readonly DEFAULT_UI_TEXTS;
    private readonly liveCameraRef;
    private readonly previewScreenRef;
    private readonly eventDispatcher;
    private lastDetectionState;
    private isFlashing;
    private initializationTimeout;
    private autoCaptureTimeoutId;
    private isInitialized;
    private capturePromise;
    private hasRequestedInnerCameraSession;
    private pendingCapture;
    private previewDecision;
    private previewResolve;
    private isMobile;
    private isLandscape;
    /**
     * Internal state that controls overlay visibility.
     * Synchronized with isOpen but managed independently to ensure proper encapsulation.
     */
    private isOverlayVisible;
    constructor();
    deviceId: string;
    isOpen: boolean;
    initializationTimeoutDuration: number;
    autoCaptureTimeoutDuration: number;
    hints: FaceDetectionHint | undefined;
    accessibilityTexts: FaceAccessibilityTexts;
    uiTexts: {
        step1Title?: string;
        step1Description?: string;
        step2Title?: string;
        step2Description?: string;
        step3Title?: string;
        step3Description?: string;
        faceInstruction?: string;
        landscapeTitle?: string;
        landscapeSubtitle?: string;
        landscapeButtonLabel?: string;
        landscapeButtonAriaLabel?: string;
        orientationErrorMessage?: string;
        deviceOrientationText?: string;
        landscapeOrientationText?: string;
        portraitOrientationText?: string;
    };
    private get effectiveUiTexts();
    showBackButton: boolean;
    enableOrientationLock: boolean;
    /**
     * Aria labels for all interactive elements. These are intentionally separated
     * from visible texts to allow independent translation/localization.
     */
    ariaLabels: Partial<FaceAriaLabels>;
    /**
     * Text labels for UI elements that need translation.
     */
    texts: Partial<FaceTexts>;
    /**
     * Controls whether the post-capture preview screen (review/retake) is
     * shown before the SDK returns the captured image. When false (the
     * default), `capture` dispatches immediately after a photo is taken,
     * matching this component's behavior prior to ZIM-971. Opt in per
     * consumer/integration — do not flip this default without coordinating
     * with existing integrations, since it changes when `capture`/`close` fire.
     */
    showPreviewScreen: boolean;
    /**
     * Texts for the preview screen shown after a capture (review/retake).
     */
    previewScreenTexts: Partial<FacePreviewScreenTexts>;
    /**
     * Aria labels for the preview screen's buttons. Separated from
     * `previewScreenTexts` to allow independent translation/localization.
     */
    previewScreenAriaLabels: Partial<FacePreviewScreenAriaLabels>;
    private static readonly DEFAULT_ARIA_LABELS;
    private static readonly DEFAULT_TEXTS;
    private get mergedAriaLabels();
    private getResolvedText;
    private get backButtonAriaLabel();
    private get faceInstructionText();
    private get forcePortraitModeAriaLabel();
    canLockOrientation: boolean;
    private _deviceIdValid;
    detectionState: FaceDetectionState;
    isInPreview: boolean;
    private showingPreview;
    private isFirstUpdate;
    detectionText: (faceState: FaceDetectionState) => string;
    static readonly styles: lit.CSSResult;
    private isMobileDevice;
    getCameraConstraints(): MediaStreamConstraints;
    private handleOrientationChange;
    private debounceOrientationChange;
    private enforcePortraitMode;
    private enableInteractions;
    private lockToPortraitMode;
    private unlockOrientation;
    private getOptimalCameraConstraints;
    connectedCallback(): void;
    private _handleVisibilityChange;
    private _handleFocus;
    private _handleBlur;
    private isDeviceIdValid;
    private requestCameraPermissionWithConstraints;
    disconnectedCallback(): void;
    private shouldBlockCapture;
    private shouldBlockAllInteractions;
    private _handleOutsideClick;
    updated(changedProperties: Map<string, any>): void;
    /**
     * Synchronizes the internal camera and overlay state with the isOpen property.
     * This ensures the IDRnD camera, overlay visibility, and cleanup are all coordinated.
     */
    private syncCameraState;
    private clearInitializationTimeout;
    private startAutoCaptureTimeout;
    private clearAutoCaptureTimeout;
    private onBeforeInitialized;
    private onInitialized;
    private onBeforeOpened;
    private onOpened;
    private onDetection;
    private onBeforeCaptured;
    private onCaptured;
    private onFacePreviewContinue;
    private onFacePreviewRetake;
    private onClosed;
    private onFailure;
    private handleKeydown;
    private closeCamera;
    private cancelCapture;
    private handleForcePortraitMode;
    private showOrientationMessage;
    liveCamera(): lit_html.TemplateResult<1>;
    render(): lit_html.TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'live-face-camera': LiveFaceCamera;
    }
}

type FaceCameraError = {
    code: number;
    message: string;
};
declare const PermissionNotGrantedError: (message: string) => FaceCameraError;
declare const UnexpectedError: (message: string) => FaceCameraError;
declare const TimeoutError: (message: string) => FaceCameraError;
declare const AutoCaptureTimeoutError: (message: string) => FaceCameraError;

type DocumentCaptureType = 'auto' | 'id' | 'passport';
type ResolvedDocumentCaptureType = Exclude<DocumentCaptureType, 'auto'>;
type DocumentTypeSource = 'host' | 'aspect' | 'aspect-sticky' | 'fallback';

type Dimension = {
    width: number;
    height: number;
};
type Corner = {
    x: number;
    y: number;
};
type MappedCorners = {
    topLeft: Corner;
    topRight: Corner;
    bottomLeft: Corner;
    bottomRight: Corner;
};
type CaptureQualityGatePolicy = {
    platform: 'desktop' | 'mobile';
    resolutionGate: 'enforced' | 'bypassed';
    coverageGate: 'enforced' | 'bypassed';
    resolutionBypassReason?: 'desktop-webcam-preview-floor' | 'samsung-id-stability';
    coverageBypassReason?: 'desktop-legacy-stickman-flow' | 'samsung-id-stability';
};
type CaptureQualityGuidance = {
    guidanceState: 'move-closer' | 'slightly-closer' | 'center' | 'move-back' | 'ready';
    hardGate?: {
        requiredLongAxisPx: number;
        documentLongAxisPx: number;
        missingPx: number;
    };
    qualityTarget?: {
        targetDpi: number;
        estimatedDpi: number;
        missingDpi: number;
        missingPx: number;
        met: boolean;
    };
    tooCloseRisk?: {
        shortRatio: number;
        longRatio: number;
    };
    documentType: 'id' | 'passport';
    documentTypeSource: DocumentTypeSource;
    inferredDocumentType?: 'id' | 'passport';
    documentAspect?: number;
    documentTypeConfidence: number;
    selectedEstimatedDpi?: number;
    outOfFrameStreak?: number;
    assureIdDpiComparison?: {
        horizontalResolution: number;
        delta: number;
        side: 0 | 1;
        light: number;
    };
    gatePolicy?: CaptureQualityGatePolicy;
    blockingGate?: 'resolution' | 'coverage';
    coverage?: {
        docWidth: number;
        docHeight: number;
        shortRatio: number;
        longRatio: number;
        estimatedId1Dpi: number;
        estimatedId3Dpi: number;
        gateDocumentType: 'id' | 'passport';
        inferredDocumentType?: 'id' | 'passport';
        effectiveDocumentType: 'id' | 'passport';
        documentTypeSource: DocumentTypeSource;
        docAspect?: number;
        documentAspect?: number;
        aspectDelta?: number;
        documentTypeConfidence: number;
        selectedEstimatedDpi: number;
        gateRequiredLongAxisPx: number;
        gateMissingPx: number;
    };
};
type DetectResponse = {
    isGood: boolean;
    isSharp?: boolean;
    isAdequateDpi?: boolean;
    isGlareFree?: boolean;
    image?: ImageData;
    dimensions?: Dimension;
    corners?: MappedCorners;
    failedChecks: string[];
    captureQuality?: CaptureQualityGuidance;
};

declare const resizeImageFromBlob: (imageBlob: Blob) => Promise<string>;

interface ISmartCaptureModule {
    isInitializing: boolean;
    isInitialized: boolean;
    /**
     * Initializes the Smart Capture Module
     * @returns true if init succeeds or if the module was already initialized, returns false if init was already called and is in progress.
     * @throws and error if initialize fails.
     */
    init: () => Promise<boolean>;
    detect: (imgData: CaptureResponse) => Promise<DetectResponse>;
    crop: (imgBlob: ArrayBuffer, captureData: DetectResponse) => Promise<ImageData>;
}

declare class SmartCaptureModule implements ISmartCaptureModule {
    #private;
    private constructor();
    static getInstance: () => SmartCaptureModule;
    private _initialized;
    get isInitialized(): boolean;
    private _initializing;
    get isInitializing(): boolean;
    private barcodeReaderId;
    private hiddenCanvas;
    init: () => Promise<boolean>;
    private addBarcodeReaderDiv;
    private processEncodedFrame;
    private mapCorners;
    private imageDataToBlob;
    detect: (imgData: CaptureResponse) => Promise<DetectResponse>;
    crop: (imgBlob: ArrayBuffer, captureData: DetectResponse) => Promise<ImageData>;
}

declare class SmartCaptureWorker {
    private smartCapture?;
    private workerGlobalContext;
    constructor(workerGlobalContext: any);
    private postMessage;
    private onError;
    private onMessage;
    private onInitialize;
    private onPerformQualityCheck;
    private resolveCheck;
    private checkQuality;
}

/**
 * @public
 */
type IImageResult = {
    /**
     * @public
     */
    quality: {
        blurCheck?: boolean;
        glareCheck?: boolean;
        resolutionCheck?: boolean;
        coordinateCheck?: boolean;
    };
    /**
     * @public
     */
    image: Uint8Array;
    /**
     * @public
     */
    coords: {
        height: number;
        width: number;
        x: number;
        y: number;
    };
    /**
     * @public
     */
    isGood: boolean;
    /**
     * @public
     */
    failedChecks: String[];
};

declare class SmartCaptureHost {
    private smartCaptureWorker?;
    private requestCounter;
    private createRequestId;
    createWorker: (workerScriptUrl: string) => Promise<void>;
    private createCrossDomainWorker;
    private createWorkerFallback;
    checkImage: (image: any) => Promise<IImageResult>;
    private makeRequest;
    private testSameOrigin;
}

type DocCameraError = {
    code: string;
    message: string;
};
declare const SequenceBreak: (isIOS?: boolean) => DocCameraError;
declare const StartFail: (message: string) => DocCameraError;
declare const RuntimeError: (message: string) => DocCameraError;
declare const AutoCaptureTimeout: (message?: string) => DocCameraError;

type SamsungLensPreference = 'main' | 'first-back' | {
    deviceId: string;
};
type SamsungStillCaptureLensPreference = 'first-back' | {
    deviceId: string;
};
type SamsungStillPhotoSettingsMode = 'max' | 'default' | 'max-width' | 'preview-aspect';
type SamsungPostStreamTuning = 'disabled' | 'main-parity' | 'focus-continuous' | 'focus-continuous-poi-center';
type CameraDpiStrategyOverrides = {
    ios17Zoom?: 1 | 1.3 | 1.6;
    /** @experimental Demo-only Samsung DPI experiment. */
    samsungZoom?: 1.5 | 1.75 | 1.9 | 2 | 2.15 | 2.25 | 2.37;
    /** @experimental Demo-only Samsung DPI experiment.
     * 1920/2160 are spike values to measure whether the preview track alone
     * can deliver document long-axis >= 1477px (AssureID hard gate for passport)
     * without needing ImageCapture.takePhoto(). Samsung HAL may clamp these.
     */
    samsungPortraitHeightIdeal?: 1200 | 1440 | 1920 | 2160;
    /** @experimental Demo-only Samsung DPI experiment. */
    samsungPortraitWidthIdeal?: number;
    /** @experimental Demo-only Samsung lens selection experiment. */
    samsungLensPreference?: SamsungLensPreference;
    /** @experimental Demo-only Samsung post-stream tuning experiment. */
    samsungPostStreamTuning?: SamsungPostStreamTuning;
    /** @experimental Demo-only Samsung AF settle experiment. */
    samsungAfSettleDelayMs?: number;
    /** @experimental Demo-only Samsung manual focus experiment.
     * Setting this value implies `focusMode: 'manual'` post-stream.
     * Applied only if capabilities expose `manual` in focusMode AND the value
     * falls within the reported `focusDistance` range. When active, POI/contrast
     * post-stream tuning is bypassed to isolate the experiment.
     */
    samsungManualFocusDistance?: 0.2 | 0.25 | 0.3 | 0.35;
    /** @experimental Demo-only Samsung still capture (Iteration 4 V1).
     * Enables dpiProbe: when preview is sharp but DPI < 1477px, fires takePhoto()
     * from the same track (6.B strategy) and re-evaluates with Stickman.
     * Also forces preview to open on this device (consistency).
     * V1 accepts 'first-back' or explicit { deviceId }. blurProbe is disabled in V1.
     */
    samsungStillCaptureLensPreference?: SamsungStillCaptureLensPreference;
    /** @experimental Demo-only Samsung still capture photo settings variant. */
    samsungStillPhotoSettings?: SamsungStillPhotoSettingsMode;
};

interface ILiveDocumentCamera {
    /**
     * Document class used for capture guidance and AssureID DPI gating.
     */
    documentType: DocumentCaptureType;
    /**
     * Opt-in camera DPI experiment overrides. Defaults preserve production behavior.
     */
    cameraDpiStrategy?: CameraDpiStrategyOverrides;
    /**
     * Opt-in: enables Injection Attack Detection (IAD) signal collection for
     * this camera session (device/permission/motion telemetry surfaced on
     * captureResponse.metrics.iadSignals). Disabled by default — no IAD
     * collection, no motion/orientation permission requests, and no device
     * enumeration happen unless this is explicitly set to true.
     */
    enableInjectionAttackDetection?: boolean;
    /**
     * The video element to which the camera stream should be rendered.
     */
    getPlayer(): HTMLVideoElement | undefined;
    /**
     * Called after the player is assigned a stream from the device's camera.
     * At the end of this function you should call play on the stream video element.
     * Calling play will start the detection loop and start issuing onDetect callbacks.
     */
    onCameraEnabled(): void;
    /**
     * Called after any fatal error. You most likely want to use this to close the camera and present the error to the user.
     */
    onError: (error: DocCameraError) => void;
    /**
     * Called after each detection.
     */
    onDetect: (response: DetectResponse | undefined, cameraState: CameraState) => void;
    /**
     * Called after capture is performed.
     */
    onCapture: (response: CaptureResponse) => void;
}

type IadSignalValue = string | number | boolean | null | undefined;
interface CaptureProvenanceSignals {
    captureStartUtc?: string;
    captureEndUtc?: string;
    monotonicDurationMs?: number;
    requestedVideoConstraints?: Record<string, unknown>;
    appliedTrackSettings?: Record<string, IadSignalValue>;
    trackCapabilitiesPresent?: string[];
    permissionCameraBefore?: string;
    permissionCameraAfter?: string;
    permissionMicrophoneBefore?: string;
    permissionMicrophoneAfter?: string;
}
interface CameraDeviceFingerprintSignals {
    videoinputCount?: number;
    audioinputCount?: number;
    selectedDeviceIdHash?: string;
    selectedGroupIdHash?: string;
    /** Label hash. Undefined means "unknown", not "not a virtual camera". */
    selectedLabelHash?: string;
    selectedFacingMode?: string;
    backCameraDetected?: boolean;
    suspiciousVirtualCameraLabelHashes?: string[];
}
interface StreamIntegritySignals {
    avgFps?: number;
    fpsStdDev?: number;
    duplicateFrameRatio?: number;
    duplicateFrames?: number;
    analyzedFrames?: number;
    videoDimensionChangeCount?: number;
    trackMutedEventCount?: number;
    trackUnmutedEventCount?: number;
    trackEndedEventCount?: number;
    visibilityHiddenCount?: number;
    visibilityVisibleCount?: number;
    browserResumeCount?: number;
    canvasReadFailureCount?: number;
    sequenceBreakCount?: number;
}
interface ImageConsistencySignals {
    luminanceMean?: number;
    luminanceStdDev?: number;
    varianceMean?: number;
    varianceStdDev?: number;
}
interface ClientIntegritySignals {
    webdriver?: boolean;
    /** Which SDK produced the payload ('Web', 'Android'), not the host OS. */
    platform?: string;
    /** Host OS from User-Agent Client Hints. Web only; absent on Firefox/Safari. */
    osPlatform?: string;
    userAgent?: string;
    language?: string;
    hardwareConcurrency?: number;
    maxTouchPoints?: number;
}
interface MotionIntegritySignals {
    motionSupported?: boolean;
    orientationSupported?: boolean;
    motionPermissionState?: string;
    orientationPermissionState?: string;
    motionSamplesCount?: number;
    orientationSamplesCount?: number;
    motionCoverageMs?: number;
    sensorSamplingHzMean?: number;
    sensorSamplingHzStdDev?: number;
    accelerationMagnitudeMean?: number;
    accelerationMagnitudeStdDev?: number;
    accelerationMagnitudeVariance?: number;
    rotationRateMagnitudeMean?: number;
    rotationRateMagnitudeStdDev?: number;
    rotationRateMagnitudeVariance?: number;
    orientationChangeCount?: number;
    motionFlatlineRatio?: number;
}
interface ReplayProtectionSignals {
    nonce?: string | null;
    timestampUtc?: string | null;
}
interface InjectionAttackSignals {
    schemaVersion: '1.0.0';
    captureProvenance: CaptureProvenanceSignals;
    cameraDeviceFingerprint: CameraDeviceFingerprintSignals;
    streamIntegrity: StreamIntegritySignals;
    imageConsistency: ImageConsistencySignals;
    clientIntegrity: ClientIntegritySignals;
    motionIntegrity?: MotionIntegritySignals;
    replayProtection?: ReplayProtectionSignals;
}

declare enum CameraState {
    MoveCloser = 0,
    OutOfFrame = 1,
    FixGlare = 2,
    FixBlur = 3,
    Capturing = 4,
    TapToCapture = 5,
    Countdown = 6
}
interface FrameMetrics {
    totalFramesProcessed: number;
    framesWithGlare: number;
    framesWithBlur: number;
    framesWithLowRes: number;
    framesOutOfBoundary: number;
    lastProcessingDurationMs: number;
}
declare class WebRtcCamera {
    private static readonly DETECTION_INTERVAL_MS;
    private static readonly LOG;
    private hiddenCanvas;
    private hiddenContext;
    private sessionId;
    private isStarted;
    private isDetecting;
    private detectTimeout?;
    private isCapturing;
    private parent;
    private smartCaptureModule;
    private player?;
    private lastFrameDetected;
    private cameraStartPromise?;
    private readonly originalVideoConstraints;
    private totalFramesProcessed;
    private framesWithGlare;
    private framesWithBlur;
    private framesWithLowRes;
    private framesOutOfBoundary;
    private lastProcessingDurationMs;
    private static readonly WARM_UP_MISS_MAX;
    private warmUpMissCount;
    private static readonly STABILITY_WINDOW_SIZE;
    private static readonly STABILITY_WINDOW_SIZE_ANDROID;
    private static readonly STABILITY_WINDOW_SIZE_SAMSUNG;
    private static readonly STABILITY_GOOD_THRESHOLD;
    private static readonly STABILITY_GOOD_THRESHOLD_ANDROID;
    private static readonly STABILITY_GOOD_THRESHOLD_SAMSUNG;
    private recentFrameResults;
    private stabilityWindowSize;
    private stabilityGoodThreshold;
    /**
     * The approved capture cohort for this session. Camera and quality policy
     * remain selected from this value independently (ZIM-2351, ADR 0002). The
     * A53 demo experiment may reuse Samsung acquisition without changing it.
     */
    private deviceCohort;
    private isSamsungA53AcquisitionTestActive;
    private get usesSamsungCameraStrategy();
    private get samsungA53AcquisitionTestRequested();
    private stillProbeInFlight;
    private lastStillProbeAt;
    private stillProbeAttemptCounter;
    private static readonly STILL_PROBE_COOLDOWN_MS;
    private captureCommitted;
    private triedBasicConstraints;
    private activeTrack;
    private cachedEcRange;
    private cachedConstraintPayload;
    private ecAdjustInFlight;
    private currentEc;
    private lastEcAdjustTime;
    private lastDocumentCorners;
    private resolvedDocumentType;
    private readonly captureQualityEngine;
    private lastCaptureQualityAssessment;
    private lastKnownCaptureQualityAssessment;
    private selectedDpiStrategy;
    private lastTrackSettings;
    private lastKnownCoverageFrameIndex;
    private consecutiveOutOfFrameFrames;
    private static readonly EC_RATE_LIMIT_MS;
    private static readonly EC_TARGET_LUMINANCE;
    private static readonly EC_DEAD_ZONE;
    private static readonly PREFILTER_VARIANCE_THRESHOLD;
    private readonly iad;
    private restartDetectionBind;
    private visibilityChangeBind;
    private metaDataBind;
    runDetectionBind: () => void;
    constructor(parent: ILiveDocumentCamera, smartCaptureModule: ISmartCaptureModule);
    private initSmartCapture;
    private resetMetrics;
    getMetrics(): FrameMetrics;
    /**
     * Returns undefined unless IAD collection was enabled for this session
     * (see enableInjectionAttackDetection on ILiveDocumentCamera).
     */
    getInjectionAttackSignals(): InjectionAttackSignals | undefined;
    /**
     * Camera constraints optimized for document capture quality.
     *
     * Standard W3C constraints:
     * - facingMode: Prefers back camera for document capture
     * - aspectRatio: 4:3 ratio (1.33) helps users capture documents without getting too close.
     *   The 4:3 ratio matches most camera sensors, improving focus and DPI at a comfortable distance.
     *
     * W3C Image Capture API constraints (standard, but partially supported — filtered at runtime):
     * - focusMode: 'continuous' - Enables continuous autofocus for sharper document capture.
     *   Best-effort constraint: filtered if unsupported, also applied post-stream via
     *   applyConstraints() for maximum compatibility (especially iOS/Safari).
     * - exposureMode: 'continuous' - Instructs the device to continuously auto-expose based on
     *   ambient light. Replaces fixed brightness/contrast values that caused overexposure on
     *   mid-tier Android devices in bright environments. Applied post-stream on Android via
     *   applyImageCaptureConstraints() with a getCapabilities() check for hardware safety.
     *
     * Non-standard vendor constraints (calibrated through extensive testing):
     * - saturation: 15 - Reduced from 100 for natural document color reproduction (ZIM-2058).
     *   High saturation (100) caused overexposure on non-Samsung Android devices.
     * - sharpness: 5 - Maximum sharpness supported by most cameras (scale 0-5). Improves edge
     *   definition of text and document details for better OCR accuracy.
     *
     * Browser/Device support:
     * - Supported: Chrome/Android (all constraints)
     * - Partial support: Safari/iOS (varies by device; saturation/sharpness filtered at runtime)
     * - Not supported: Firefox (basic constraints only)
     *
     * All advanced values above are filtered at runtime via filterUnsupportedConstraints()
     * to prevent errors on unsupported browsers.
     */
    private videoConstraints;
    private finalizeCameraConstraints;
    /**
     * Apply desktop (UVC webcam) camera constraints. Desktop-only: it assumes the device is
     * neither iOS nor Android, keeps mobile DPI floors out of getUserMedia, and leaves mobile
     * camera paths unchanged.
     */
    private applyDesktopConstraints;
    /**
     * Apply iOS-specific camera constraints based on device and iOS version.
     */
    private applyIOSConstraints;
    /**
     * Workaround for iOS 16 devices that require capturing from further away.
     * Bumps resolution and adjusts aspect ratio to compensate for distance.
     */
    private applyIOS16Workaround;
    /**
     * Apply iOS 15 specific width constraints.
     */
    private applyIOS15Constraints;
    /**
     * Apply Android-specific camera constraints.
     */
    private applyAndroidConstraints;
    /**
     * Reads device evidence once per Android camera open. The original value and
     * provenance still determine the approved cohort. The demo-only A53
     * experiment additionally requires policy-admissible evidence before it can
     * opt into its dedicated acquisition strategy.
     */
    private readDeviceModelEvidence;
    private getSupportedConstraintsSnapshot;
    private applyDpiStrategyDecision;
    private getSamsungPostStreamTuning;
    /**
     * Returns basic constraints without advanced quality settings.
     * Used as fallback when advanced constraints are not supported or cause errors.
     */
    private getBasicConstraints;
    /**
     * Filters out advanced or conditionally-supported media track constraints that are not
     * reported as available by the current browser. This prevents errors when calling getUserMedia
     * on browsers that don't implement these constraints.
     *
     * Note: some filtered constraints (focusMode, exposureMode) are W3C standard but have uneven
     * browser support; others (saturation, contrast, sharpness, brightness, zoom) are non-standard
     * extensions.
     *
     * Pure function that returns a new constraints object without mutating input.
     *
     * @param constraints - The constraints to filter
     * @returns A new constraints object with only supported properties
     */
    private filterUnsupportedConstraints;
    startCamera(): Promise<void>;
    /**
     * Cleanup for a start attempt that never brought the camera up — getUserMedia
     * rejected, or a start path bailed out. Without this, the best-effort sensor
     * init leaves motion/orientation listeners attached with no camera behind
     * them: startCameraInternal()'s error path only reports via onError().
     *
     * Awaits the sensor init before detaching, because it is deliberately not
     * awaited on the happy path and would otherwise attach its listeners after
     * this cleanup ran. The session is re-checked afterwards so a newer session's
     * listeners are never torn down.
     */
    private releaseSensorsIfCameraNeverStarted;
    /**
     * Attempts to get the best back facing camera and then start it.
     *
     * getDevice will not always return accurate data until after get user media has been called once. So the first time this is called it starts the camera fitting the constraints, but after starting that camera it checks with get devices if there is a better camera fitting our constraints. If there is it will add its ID to the constraints can perform this function again, this time not checking with get devices.
     *
     * @param iteration the current attempt number to search for the proper camera device.
     */
    private startCameraInternal;
    private onCameraStreamObtained;
    /**
     * True when `sessionId` is no longer the active session, meaning the
     * enableCamera() call it belongs to must abandon its setup. Ends the track
     * observation that call started so attach/remove stay symmetric on the
     * abandoned paths too — endTrackObservation() is scoped to `track`, so it
     * cannot tear down an observation a newer session has already begun.
     */
    private shouldAbandonCameraSetup;
    private enableCamera;
    /**
     * Applies ALL ImageCapture constraints in a single applyConstraints() call on Android.
     */
    private applyImageCaptureConstraints;
    private applySamsungPostStreamConstraints;
    private armSamsungManualFocus;
    private applyBaseIPhoneZoomIfNeeded;
    private waitForSamsungAfSettleDelay;
    private updateTrackSettings;
    private buildConstraintPayload;
    private applyContrast;
    /**
     * Computes mean luminance and spatial variance of the center region in a single pass.
     * Samples every 4th pixel (~0.5ms on 1440x1080).
     * Variance is used as a pre-filter: a blank scene (no document) has very low variance
     * and can skip the expensive Stickman call.
     */
    private computeFrameStats;
    /**
     * Dynamically adjusts exposureCompensation based on frame luminance (Android only).
     * Rate-limited to every 2s with a ±15 dead zone to prevent oscillation.
     * Bidirectional: bright scenes get negative EC, dark scenes get positive EC.
     * Clamped to ±50% of device range with per-cycle step cap of 2.
     */
    private adjustExposureIfNeeded;
    /**
     * Applies continuous focus mode post-stream (iOS/Safari fallback).
     */
    private applyFocusModeIfSupported;
    stopDetection(): void;
    resetStabilityWindow(): void;
    private resetAdaptiveEcState;
    endCamera(): void;
    private addEvents;
    private removeEvents;
    private runDetection;
    private getFirstBackCameraDevice;
    private getSamsungMainLensDevice;
    private getDeviceBySamsungLensPreference;
    private describeSamsungLensPreference;
    private getDevice;
    private onLoadedMetaData;
    private onVisibilityChange;
    private restartDetectionAfterBrowserResume;
    private stopMediaTracks;
    private sequenceBreak;
    private processFrameForDetection;
    private detect;
    private resolveCaptureState;
    private handleLiveCapture;
    private shouldTriggerDpiProbe;
    private getStillProbePhotoMode;
    private getStillProbePreviewDiagnostics;
    private getPhotoSettingsLabel;
    private alignPhotoDimension;
    private buildStillPhotoSettings;
    private buildPreviewAspectPhotoSettings;
    private triggerStillProbe;
    private createStillProbeImageCapture;
    private resolveStillProbePhotoSettings;
    private takeStillProbePhoto;
    private decodeStillProbeImage;
    private detectStillProbeFrame;
    private isStillGateOk;
    private dispatchStillProbeCapture;
    private assessCaptureQuality;
    private getCaptureQualityGateState;
    private getAssureIdGatePolicy;
    private resolveAssureIdGateState;
    private getBlockingGate;
    private getCaptureQualitySummary;
    private getGatedDetectResponse;
    private updateFrameMetrics;
    private updateOutOfFrameStreak;
    private updateStabilityWindow;
    private determineFailureState;
    private grabFreshFrame;
    triggerCapture(manualMode?: boolean): Promise<void>;
}

interface SelectedFrameQualityMetrics {
    isAdequateDpi?: boolean;
    isSharp?: boolean;
    isGlareFree?: boolean;
    isGood?: boolean;
}
type CaptureMetrics = FrameMetrics & {
    captureTimeMs: number;
    captureMode: 'AUTO' | 'MANUAL';
    timeBeforeManualSwitchMs?: number;
    /**
     * Whether the session launched directly in manual (tap-to-capture) mode.
     * Distinct from the user disabling auto mid-session — does not feed
     * hasDisabledAutoCapture. Optional to keep this exported type backward
     * compatible; always emitted by the SDK.
     */
    startedInManual?: boolean;
    sdkVersion: string;
    iadSignals?: InjectionAttackSignals;
    selectedFrameQuality: SelectedFrameQualityMetrics;
};

type CaptureResponse = {
    isGood?: boolean;
    isAdequateDpi?: boolean;
    isSharp?: boolean;
    isGlareFree?: boolean;
    failedChecks?: string[];
    imageData?: ImageData;
    imageWidth?: number;
    imageHeight?: number;
    isPortraitOrientation?: boolean;
    metrics?: CaptureMetrics;
    imageBase64?: string;
};

type DocumentHint = {
    title: string;
    description: string;
};

type DocumentDetectionHint = {
    moveCloserHint?: DocumentHint;
    fixBlurHint?: DocumentHint;
    fixGlareHint?: DocumentHint;
    outOfFrameHint?: DocumentHint;
    capturingHint?: DocumentHint;
    /**
     * Shown when the document is in view but the AssureID resolution gate fails
     * (not enough pixels for downstream verification). Tells the user to move
     * the document slightly closer while keeping all corners inside the frame.
     */
    assureIdResolutionHint?: DocumentHint;
    /**
     * Shown when the document is too close to the frame edges and the AssureID
     * coverage gate fails. Tells the user to move slightly farther back so all
     * four corners fit inside the frame.
     */
    assureIdCoverageHint?: DocumentHint;
};

type CancelConfirmationTexts = {
    title: string;
    confirmButtonText: string;
    dismissButtonText: string;
};
/**
 * Aria labels for this modal's buttons. Separated from `texts` to allow
 * independent translation/localization, consistent with `live-document-camera`.
 */
type CancelConfirmationAriaLabels = {
    confirmButton: string;
    dismissButton: string;
};
/**
 * Confirmation dialog shown when the user selects "End identity check" from the
 * preview/confirmation step shown after capture. Internal to the SDK — not part
 * of the public API, and controlled via `show()`/`hide()` by whichever internal
 * component composes it, not by consumer-set properties.
 */
declare class DocumentCancelConfirmationModal extends LitElement {
    static readonly ConfirmEventName: string;
    static readonly DismissEventName: string;
    static styles: lit.CSSResult;
    private open;
    texts: Partial<CancelConfirmationTexts>;
    ariaLabels: Partial<CancelConfirmationAriaLabels>;
    private static readonly DEFAULT_TEXTS;
    private static readonly DEFAULT_ARIA_LABELS;
    private get mergedTexts();
    private get mergedAriaLabels();
    private readonly eventDispatcher;
    private previouslyFocusedElement;
    private confirmButtonRef;
    private dismissButtonRef;
    private readonly handleDocumentKeydown;
    /** Shows the dialog. Called by whichever internal component composes this one. */
    show(): void;
    /** Hides the dialog. Called by whichever internal component composes this one. */
    hide(): void;
    updated(changedProperties: Map<string, unknown>): void;
    disconnectedCallback(): void;
    private confirm;
    private dismiss;
    render(): lit_html.TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'document-cancel-confirmation-modal': DocumentCancelConfirmationModal;
    }
}

type QualityExamplesTexts = {
    title: string;
    goodLabel: string;
    goodCaption: string;
    badLabel: string;
    cornersCaption: string;
    coveredCaption: string;
    blurryCaption: string;
    glareCaption: string;
    closeAltText: string;
};
/**
 * Static reference screen showing examples of good/bad quality photos, opened
 * from the "Examples of good and bad quality photos" link on the preview
 * screen. Internal to the SDK — composed inside `document-preview-screen`,
 * not mounted or configured directly by consumers (aside from `texts`).
 */
declare class DocumentQualityExamples extends LitElement {
    static styles: lit.CSSResult;
    private open;
    texts: Partial<QualityExamplesTexts>;
    private static readonly DEFAULT_TEXTS;
    private get mergedTexts();
    private readonly closeButtonRef;
    private previouslyFocusedElement;
    private readonly handleDocumentKeydown;
    /** Shows the screen. Called by whichever internal component composes this one. */
    show(): void;
    /** Hides the screen. Called by whichever internal component composes this one. */
    hide(): void;
    updated(changedProperties: Map<string, unknown>): void;
    disconnectedCallback(): void;
    private close;
    render(): lit_html.TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'document-quality-examples': DocumentQualityExamples;
    }
}

type PreviewScreenTexts = {
    title: string;
    body: string;
    photoAltText: string;
    examplesLinkText: string;
    continueButtonText: string;
    retakeButtonText: string;
    endCheckButtonText: string;
    goodLabel: string;
    goodCaption: string;
    badLabel: string;
    cornersCaption: string;
    coveredCaption: string;
    blurryCaption: string;
    glareCaption: string;
};
/**
 * Aria labels for this screen's buttons. Separated from `texts` to allow
 * independent translation/localization, consistent with `live-document-camera`.
 */
type PreviewScreenAriaLabels = {
    examplesLink: string;
    continueButton: string;
    retakeButton: string;
    endCheckButton: string;
};
/**
 * Confirmation screen shown after a document capture, letting the user review
 * the photo before continuing, retaking it, or ending the identity check.
 * Internal to the SDK — composed inside `live-document-camera`'s own capture
 * flow, not mounted or configured directly by consumers (aside from `texts`).
 * Controlled via `show(captureResponse)`/`hide()` by whichever internal
 * component composes it; dispatches `continue`/`retake`/`end` for that parent
 * to react to.
 */
declare class DocumentPreviewScreen extends LitElement {
    static readonly ContinueEventName = "continue";
    static readonly RetakeEventName = "retake";
    static readonly EndEventName = "end";
    static styles: lit.CSSResult;
    private open;
    private captureResponse;
    texts: Partial<PreviewScreenTexts>;
    previewAriaLabels: Partial<PreviewScreenAriaLabels>;
    cancelConfirmationTexts: Partial<CancelConfirmationTexts>;
    cancelConfirmationAriaLabels: Partial<CancelConfirmationAriaLabels>;
    qualityExamplesTexts: Partial<QualityExamplesTexts>;
    private static readonly DEFAULT_TEXTS;
    private static readonly DEFAULT_ARIA_LABELS;
    private get mergedTexts();
    private get mergedAriaLabels();
    private readonly cancelModalRef;
    private readonly qualityExamplesRef;
    private readonly dialogRef;
    private previouslyFocusedElement;
    private getFocusableElements;
    private readonly handleDocumentKeydown;
    /** Shows the screen with the given capture response. Called by `live-document-camera`. */
    show(captureResponse: CaptureResponse): void;
    /** Hides the screen. Called by `live-document-camera`. */
    hide(): void;
    updated(changedProperties: Map<string, unknown>): void;
    disconnectedCallback(): void;
    private continue;
    private retake;
    private requestEndCheck;
    private confirmEndCheck;
    private dismissEndCheck;
    private showExamples;
    /**
     * The default English copy bolds "clear", "in focus", and "directly face
     * on" per design. That emphasis is tied to this exact English phrasing, so
     * it only applies to the default text — a client-provided `texts.body`
     * translation renders as plain text instead of guessing which words to
     * re-bold.
     */
    private renderBody;
    private renderExamplesGrid;
    render(): lit_html.TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'document-preview-screen': DocumentPreviewScreen;
    }
}

type DotLottie = NonNullable<DotLottieWC['dotLottie']>;
type DocumentAriaLabels = {
    backButton: string;
    helpIcon: string;
    autoCaptureEnable: string;
    autoCaptureDisable: string;
    tapToCapture: string;
    closeHelpButton: string;
    helpSection: string;
};
type DocumentTexts = {
    autoCaptureText: string;
    autoCaptureOnText: string;
    autoCaptureOffText: string;
    cleanLenseText: string;
    photoCapturedText: string;
};
declare class LiveDocumentCamera extends LitElement implements ILiveDocumentCamera {
    private tabbableElements;
    setFocusToElement(elementId: string): void;
    private elementsDisabled;
    private enableTabbingOnOtherElements;
    private disableTabbingOnOtherElements;
    private previewContainerTabbingDisabled;
    private enableTabbingInContainer;
    private disableTabbingInContainer;
    static readonly OpenEventName: string;
    static readonly UserCanceledEventName: string;
    static readonly CloseEventName: string;
    static readonly CaptureEventName: string;
    static readonly DetectEventName: string;
    static readonly FailureEventName: string;
    static styles: lit.CSSResult[];
    private handleKeydown;
    textsHelpSection: {
        title: string;
        body: string;
        bodyBack: string;
        lightingTipText: string;
        framingTipText: string;
        steadyTipText: string;
        autoCaptureConfirmationText: string;
        strugglingText: string;
        closeHelpAltText: string;
    };
    /**
     * Aria labels for all interactive elements. These are intentionally separated
     * from visible texts to allow independent translation/localization.
     */
    ariaLabels: Partial<DocumentAriaLabels>;
    /**
     * Texts for the preview screen shown after a capture (review/retake/end).
     */
    previewScreenTexts: Partial<PreviewScreenTexts>;
    /**
     * Aria labels for the preview screen's buttons. Separated from
     * `previewScreenTexts` to allow independent translation/localization.
     */
    previewScreenAriaLabels: Partial<PreviewScreenAriaLabels>;
    /**
     * Texts for the "End identity check" confirmation modal, opened from the
     * preview screen.
     */
    cancelConfirmationTexts: Partial<CancelConfirmationTexts>;
    /**
     * Aria labels for the "End identity check" confirmation modal's buttons.
     */
    cancelConfirmationAriaLabels: Partial<CancelConfirmationAriaLabels>;
    /**
     * Texts for the good/bad quality examples screen, opened from the preview
     * screen.
     */
    qualityExamplesTexts: Partial<QualityExamplesTexts>;
    isOpen: boolean;
    showHelpIcon: boolean;
    showBackButton: boolean;
    texts: Partial<DocumentTexts>;
    private static readonly DEFAULT_ARIA_LABELS;
    private static readonly DEFAULT_TEXTS;
    private get mergedAriaLabels();
    private get mergedTexts();
    generalInfoTexts: string[];
    private get generalInfoText();
    hints: DocumentDetectionHint | undefined;
    successTime: number;
    /**
     * Controls whether the post-capture preview screen (review/retake/end) is
     * shown before dispatching `capture`. Independent of `successTime`, which
     * only controls how long the "photo taken" success overlay is shown before
     * that happens. When `false` (the default), `capture` dispatches and the
     * camera closes immediately after the success overlay, exactly like
     * `successTime <= 0` did before this property existed. Opt in per
     * consumer/integration — do not flip this default without coordinating
     * with existing integrations, since it changes when `capture`/`close` fire.
     * Default: `false`.
     */
    showPreviewScreen: boolean;
    showToggle: boolean;
    toggleAutoCaptureDelay: number;
    /**
     * Caller-owned, unlike other reset state: openCamera() never clears this.
     * Set it back to false before starting a new document, or the back-side
     * animation persists into the next front-side capture.
     */
    showBackOfDocumentAnimation: boolean;
    autoCaptureTimeout: number;
    enableAutoCaptureTimeout: boolean;
    /**
     * Enables auto-capture as the default launch mode and arms the auto-capture
     * timeout. When false, the session does not start in auto and the timeout is
     * never armed, but the user may still switch to auto via the toggle (when the
     * toggle is shown). Defaults to true (current behaviour). Undocumented for
     * general customers — see internal SDK docs.
     */
    enableAutoCapture: boolean;
    /**
     * Makes tap-to-capture available. When true and auto-capture is disabled, the
     * session launches in tap-to-capture and the toggle is shown immediately so
     * the user can switch to auto. When both are enabled, behaviour is unchanged
     * (auto default, toggle after the delay). Defaults to true. Undocumented for
     * general customers — see internal SDK docs.
     */
    enableTapToCapture: boolean;
    documentType: DocumentCaptureType;
    cameraDpiStrategy: CameraDpiStrategyOverrides;
    /**
     * Opt-in: enables Injection Attack Detection (IAD) signal collection for
     * this camera session. Disabled by default — no IAD collection, no
     * motion/orientation permission requests, and no device enumeration
     * happen unless this is explicitly set to true. Undocumented for general
     * customers — see internal SDK docs.
     */
    enableInjectionAttackDetection: boolean;
    cameraState: CameraState;
    hasShownDocumentAnimation: boolean;
    toggleDelayIsDone: boolean;
    isPortraitOrientation: boolean;
    private shouldStackLayout;
    private tapToCaptureSpinner;
    private tapToCapture;
    showHelp: boolean;
    private captured;
    private isAutoCaptureTimedOut;
    private showGuidanceMessage;
    private lastDetectResponse;
    private resolvedDocumentType;
    private autoCaptureStartTime;
    private isFirstUpdate;
    private cameraOpenTime;
    private manualSwitchTime;
    private captureModeSnapshot;
    private startedInManual;
    private drawReticulaDeferPending;
    private captureSuccessFrameCanvas?;
    private getReticleState;
    private getReticleColor;
    private resolveDocumentTypeForReticle;
    detectionHints: (docState: CameraState) => DocumentHint;
    private videoElementRef;
    private uiCanvasElementRef;
    private readonly documentAnimationRef;
    readonly documentBackAnimationRef: Ref<DotLottieWC>;
    private autoCaptureSwitchRef;
    private readonly aspectRatioStyleRef;
    private readonly previewScreenRef;
    private showingPreview;
    private readonly isPortraitOrientationQuery;
    smartCaptureModule?: ISmartCaptureModule;
    private webRtcCamera?;
    private eventDispatcher;
    private autoCaptureTimeoutId;
    private toggleDelayTimerId;
    private animationFallbackTimerId;
    private static readonly ANIMATION_FALLBACK_MS;
    private animationHasStartedPlaying;
    private guidanceMessageTimerId;
    private captureDispatchTimerId;
    private cameraUiSessionId;
    private documentAnimationPlayerWithListener;
    private documentBackAnimationPlayerWithListener;
    private documentAnimationCompleteListener;
    private documentBackAnimationCompleteListener;
    private resizeObserver;
    private resizeObserverFrameId;
    private reticleRedrawFrameId;
    private reticleRedrawTimeoutId;
    private reticleNeedsRedraw;
    private viewportResizeTimeoutId;
    private onViewportGeometryChange;
    private static readonly MIN_ROW_WIDTH;
    private static readonly RETICLE_REDRAW_DELAY_MS;
    private static readonly VIEWPORT_RESIZE_SETTLE_MS;
    private get usesStackedLayout();
    getPlayer(): HTMLVideoElement | undefined;
    private aspectRatioCssValue;
    private reticleBottomPct;
    private reticleRectPct;
    private updateVideoAspectRatio;
    private updateReticleBottomPosition;
    private updateReticleRectPosition;
    private applyDynamicPreviewStyles;
    private clearReticleRedrawTimers;
    private setTimer;
    private drawCurrentAutoCaptureFrame;
    private scheduleReticleRedraw;
    private updateResponsiveLayout;
    private scheduleResponsiveLayoutUpdate;
    private observeHostSize;
    private startAutoCaptureTimeout;
    private clearAutoCaptureTimeout;
    private clearToggleDelayTimer;
    private clearAnimationFallbackTimer;
    private clearGuidanceMessageTimer;
    private clearCaptureDispatchTimer;
    private isCurrentCameraUiSession;
    private removeAnimationCompleteListeners;
    private addAnimationCompleteListeners;
    private get bothModesDisabled();
    private get autoModeOn();
    private get tapModeOn();
    private get initialTapToCapture();
    private get toggleIsUserVisible();
    private get revealToggleImmediately();
    private get autoCaptureTimeoutArmed();
    private onAutoCaptureTimeout;
    private captureCurrentPreviewFrame;
    private clearCaptureSuccessFrame;
    private scheduleDeferredReticleWork;
    private retryDrawAutoCaptureFrame;
    private retryReticleRedraw;
    private getVideoFrameSize;
    private getAutoCaptureFrameSize;
    private getReticleCornerColor;
    private drawSuccessSnapshotIfNeeded;
    private getAutoCaptureCanvasAriaLabel;
    drawAutoCaptureFrame(autoCapture?: boolean, autoCaptureToggled?: boolean): void;
    onDocumentAnimationComplete(source?: DotLottie | null, sessionId?: number): void;
    private onOrientationChange;
    private onVideoGeometryChanged;
    private onTapToCaptureSwitchChange;
    private deactivateAutoCaptureMode;
    private activateAutoCaptureMode;
    private setAutoCaptureSwitchChecked;
    private onTapToCaptureButtonClick;
    onCameraEnabled(): void;
    onDetect(response: DetectResponse | undefined, cameraState: CameraState): void;
    private getCaptureTimeMs;
    private getTimeBeforeManualSwitchMs;
    onCapture(response: CaptureResponse): void;
    private showPreview;
    private onPreviewContinue;
    private onPreviewRetake;
    private onPreviewEnd;
    onError(error: DocCameraError): void;
    openCamera(): void;
    private closeCamera;
    private cancelCapture;
    private helpToggle;
    connectedCallback(): void;
    disconnectedCallback(): void;
    updated(changedProperties: Map<string, any>): void;
    private handleShowHelpTabbing;
    private handleShowingPreviewTabbing;
    private handleIsOpenChange;
    private resetCameraUiStateOnClose;
    private openOrCloseCameraForCurrentState;
    private handleLayoutChange;
    private handleAutoCaptureTimeoutChange;
    private documentAnimation;
    private backOfDocumentAnimation;
    private shouldShowCleanLensOverlay;
    private guidanceMessage;
    private capturedMessage;
    private shouldShowDetectionHintMessage;
    private getCaptureButtonContainerClass;
    private captureButtonContainer;
    private manualActionsSection;
    private generalInfoSection;
    private video;
    private cameraPreview;
    private helpSection;
    render(): TemplateResult<1>;
}

/**
 * Configuration options for auto-capture timeout functionality
 */
interface TimeoutConfig {
    /**
     * Timeout duration in milliseconds for auto-capture
     * Default: 60000 (1 minute)
     * Minimum: Must be greater than toggleAutoCaptureDelay
     * Recommended: 30-120 seconds
     */
    autoCaptureTimeout: number;
    /**
     * Whether to enable auto-capture timeout functionality
     * Default: true
     */
    enableAutoCaptureTimeout: boolean;
}
/**
 * Status information about the current timeout state
 */
interface TimeoutStatus {
    /**
     * Whether the timeout has been triggered
     */
    isTimedOut: boolean;
    /**
     * Whether a timeout is currently active
     */
    isActive: boolean;
    /**
     * Remaining time in milliseconds (if available)
     */
    remainingTime?: number;
}
/**
 * Validation result for timeout configuration
 */
interface TimeoutValidationResult {
    /**
     * Whether the configuration is valid
     */
    isValid: boolean;
    /**
     * Array of validation errors
     */
    errors: string[];
    /**
     * Array of validation warnings
     */
    warnings: string[];
    /**
     * Adjusted timeout value (if auto-adjusted)
     */
    adjustedTimeout?: number;
}

type SDKMetadata = {
    make?: string;
    model?: string;
    software?: string;
    imageDescription?: string;
    dateTimeOriginal?: string;
    dateTime?: string;
    orientation?: number;
    imageWidth?: number;
    imageLength?: number;
    userComment?: string;
};
declare function addMetadata(imgBase64: string, metadata?: SDKMetadata): string;

declare const isIpadIOS13OrAbove: () => boolean;
declare const isAndroid: () => boolean;
declare const isIOS: () => boolean;
declare const isWindows: () => boolean;
declare const isMacOS: () => boolean;
declare const iOSversion: () => number[];
declare const isiOS15: () => boolean;
declare function isiOS163OrLess(): boolean;
declare function isiOS164Plus(): boolean;
declare function isiOS17(): boolean;
declare function isBaseIPhoneZoomProfile(track: MediaStreamTrack | null): boolean;
declare const isDeviceAffectedByIOS16Issue: () => boolean;
/**
 * @deprecated Device recognition is internal. This compatibility wrapper keeps
 * the historical Note10/S10 eligibility result and must not select policy.
 */
declare const isSamsungNote10OrS10OrNewer: () => Promise<boolean>;
declare const isLiveCaptureSupported: () => boolean;
declare const isBackCameraLabel: (cameraLabel: string) => boolean;

export { AutoCaptureTimeout, AutoCaptureTimeoutError, CameraState, LiveDocumentCamera, LiveFaceCamera, PermissionNotGrantedError, RuntimeError, SequenceBreak, SmartCaptureHost, SmartCaptureModule, SmartCaptureWorker, StartFail, TimeoutError, UnexpectedError, WebRtcCamera, addMetadata, iOSversion, isAndroid, isBackCameraLabel, isBaseIPhoneZoomProfile, isDeviceAffectedByIOS16Issue, isIOS, isIpadIOS13OrAbove, isLiveCaptureSupported, isMacOS, isSamsungNote10OrS10OrNewer, isWindows, isiOS15, isiOS163OrLess, isiOS164Plus, isiOS17, resizeImageFromBlob };
export type { CameraDpiStrategyOverrides, CaptureMetrics, CaptureQualityGatePolicy, CaptureQualityGuidance, CaptureResponse, Corner, DetectResponse, Dimension, DocCameraError, DocumentCaptureType, DocumentHint, FaceAccessibilityTexts, FaceCameraError, FaceDetectionHint, FrameMetrics, InjectionAttackSignals, MappedCorners, ResolvedDocumentCaptureType, SDKMetadata, TimeoutConfig, TimeoutStatus, TimeoutValidationResult };
