/** Object-level advanced settings (§5.2 SAB Product Definition). */

export type ObjAdvSection =
  | "primary" | "calendar" | "constraints" | "addinfo" | "notification"
  | "dataprovider" | "filemanager" | "places" | "fieldtracking"
  | "autoassignment" | "compositekey" | "fieldupdate" | "questionnaire";

export type CalendarRecurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type CalendarPlatformTab = "web" | "mobile";
export type CriteriaTokenKind = "field" | "constant" | "operator" | "function" | "brace" | "condition";

export interface CriteriaToken {
  id: string;
  kind: CriteriaTokenKind;
  value: string;
}

export type ConstraintMessageType = "information" | "warning" | "error";

/** Per-severity messages — each type can have its own description. */
export interface ConstraintMessage {
  /** Which type is currently selected in the editor UI */
  activeType: ConstraintMessageType;
  information: string;
  warning: string;
  error: string;
}

export interface CalendarEntryActions {
  phone: boolean;
  email: boolean;
  message: boolean;
  share: boolean;
}

/** One configured object calendar (§5.10). */
export interface CalendarEntry {
  id: string;
  title: string;
  calendarName: string;
  displayName: string;
  description: string;
  elements: string;
  endDate: string;
  geoLink: string;
  color: string;
  icon: string;
  recurrenceEnabled: boolean;
  recurrence: CalendarRecurrence;
  wholeDayEvent: boolean;
  enableEventCreation: boolean;
  enableEventAction: boolean;
  viewDetails: string;
  actions: CalendarEntryActions;
  /** Serialized condition preview (kept in sync with criteriaTokens). */
  condition: string;
  criteriaTokens: CriteriaToken[];
  platformTab: CalendarPlatformTab;
}

export type WizardObjectType = "Normal" | "Assignment" | "Collection" | "Questionnaire";

export type DataProviderType = "wsdp" | "inbound" | "outbound";
export type FileStorageType = "fileServer" | "tableServer" | "gitServer";
export type FileSaveAs = "file" | "table" | "git";
export type FileSizeUnit = "KB" | "MB";
export type DocumentCategory = "customer" | "client" | "HR" | "server" | "IT";
export type DocumentFrequency = "anyDate" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type DocumentAccess = "anyone" | "assignUser";
export type DocumentCardinality = "single" | "multiple";
export type FileManagerTab = "attachment" | "document";

export interface FileAttachmentSettings {
  saveAs: FileSaveAs;
  extensions: string[];
  sizeUnit: FileSizeUnit;
  sizeValue: number;
}

export interface FileDocumentSettings {
  documentName: string;
  category: DocumentCategory | "";
  saveAs: FileSaveAs;
  frequency: DocumentFrequency;
  /** Ordered tokens that build the file-name format preview. */
  formatParts: string[];
  cardinality: DocumentCardinality;
  extensions: string[];
  sizeUnit: FileSizeUnit;
  sizeValue: number;
  access: DocumentAccess;
}
export type AssignmentMode = "roundRobin" | "capacityBased" | "manualDefault";
export type FieldUpdateTrigger = "create" | "update";

export type NotificationPlatform = "email" | "browser" | "push" | "googleChat" | "whatsapp";
export type NotificationFromProfile = "org" | "user";
export type NotificationTemplateMode = "default" | "upload";
export type NotificationTriggerSource = "processFlow" | "events";
export type NotificationScheduleFrequency = "once" | "recurring";
export type NotificationIntervalUnit = "minutes" | "hours" | "days";
export type NotificationRecordEvent =
  | "created"
  | "createdAndEdited"
  | "createdAndEditedMeetCriteria";

export interface NotificationEntry {
  id: string;
  name: string;
  associateWithUserAssignment: boolean;
  platform: NotificationPlatform;
  separateMailPerRecipient: boolean;
  recipients: string;
  cc: string;
  bcc: string;
  showCcBcc: boolean;
  subject: string;
  fromProfile: NotificationFromProfile;
  templateName: string;
  templateMode: NotificationTemplateMode;
  attachmentCount: number;
  messageBody: string;
  layoutName: string;
  notificationActions: string[];
  whatsappParamsConfigured: boolean;
  linkedObjectIds: string[];
  /** Trigger Event tab */
  triggerSource: NotificationTriggerSource;
  enableScheduler: boolean;
  scheduleFrequency: NotificationScheduleFrequency;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  intervalValue: string;
  intervalUnit: NotificationIntervalUnit;
  recordEvent: NotificationRecordEvent | "";
  /** Conditions tab */
  treatNullAsZero: boolean;
  criteriaTokens: CriteriaToken[];
  conditionSummary: string;
}

export interface FieldUpdateStubRule {
  trigger: FieldUpdateTrigger;
  targetFieldId?: string;
  valueExpression: string;
}

export interface ObjectSettings {
  primaryInfo: { pluralLabel: string; moduleName: string };
  calendar: {
    entries: CalendarEntry[];
  };
  constraints: {
    constraintName: string;
    enableCriteria: boolean;
    enableResultCount: boolean;
    criteriaTokens: CriteriaToken[];
    criteriaCondition: string;
    criteriaMessage: ConstraintMessage;
    resultCountObject: string;
    resultCountMin: string;
    resultCountMax: string;
    resultCountMessage: ConstraintMessage;
  };
  addInfo: {
    isStoreEnable: boolean;
    trackRecordHistory: boolean;
    enableReport: boolean;
    addNotesAndAttachments: boolean;
    allowCrossApplicationSharing: boolean;
    allowRecordSharing: boolean;
    isMobileEnabled: boolean;
  };
  notification: {
    entries: NotificationEntry[];
  };
  dataProvider: {
    enabled: boolean;
    providerType: DataProviderType;
    connectionId: string;
    dataObjectName: string;
    onTheFlyRetrieval: boolean;
    syncOnLoad: boolean;
    cacheResults: boolean;
  };
  fileManager: {
    activeTab: FileManagerTab;
    attachment: FileAttachmentSettings;
    document: FileDocumentSettings;
  };
  places: {
    enableGeo: boolean;
    autoDetect: boolean;
    showMap: boolean;
    geolocationFieldId?: string;
    defaultMapZoom: number;
  };
  fieldTracking: {
    trackCreated: boolean;
    trackModified: boolean;
    trackDeleted: boolean;
    logHistory: boolean;
    trackedFieldIds: string[];
    retentionDays?: number;
  };
  autoAssignment: {
    enabled: boolean;
    assignmentMode: AssignmentMode;
    assigneeLookupFieldId?: string;
    defaultAssignee: string;
  };
  compositeKey: { enabled: boolean; fieldIds: string[] };
  fieldUpdate: {
    enabled: boolean;
    onCreate: boolean;
    onUpdate: boolean;
    runBeforeSave: boolean;
    stubRule: FieldUpdateStubRule;
  };
  questionnaire: {
    enabled: boolean;
    allowPartialSave: boolean;
    showProgressBar: boolean;
    randomiseQuestions: boolean;
    multiStepEnabled: boolean;
    stepsCount: number;
    likertScaleEnabled: boolean;
  };
}

export interface SettingsFieldRef {
  id: string;
  label: string;
  fieldType: string;
  isPrimary?: boolean;
}

export interface SettingsValidationBlocker {
  message: string;
  fieldId?: string;
  settingsSection?: ObjAdvSection;
}

export interface ObjectIdentityContext {
  apiName: string;
  displayName: string;
  description?: string;
  primaryFieldLabel: string;
  primaryFieldType: string;
}

export interface SettingsSectionSummary {
  section: string;
  summary: string;
}

/** Simulated integration connections for Data Provider UI (§5.11). */
export const MOCK_DATA_CONNECTIONS = [
  { id: "conn_prod", label: "Production API" },
  { id: "conn_staging", label: "Staging WSDP" },
  { id: "conn_hr", label: "HR Inbound Feed" },
] as const;

const BASE_DEFAULTS: ObjectSettings = {
  primaryInfo: { pluralLabel: "", moduleName: "" },
  calendar: { entries: [] },
  constraints: {
    constraintName: "",
    enableCriteria: false,
    enableResultCount: false,
    criteriaTokens: [],
    criteriaCondition: "",
    criteriaMessage: { activeType: "information", information: "", warning: "", error: "" },
    resultCountObject: "",
    resultCountMin: "",
    resultCountMax: "",
    resultCountMessage: { activeType: "information", information: "", warning: "", error: "" },
  },
  addInfo: {
    isStoreEnable: true,
    trackRecordHistory: false,
    enableReport: false,
    addNotesAndAttachments: false,
    allowCrossApplicationSharing: false,
    allowRecordSharing: false,
    isMobileEnabled: false,
  },
  notification: { entries: [] },
  dataProvider: {
    enabled: false,
    providerType: "wsdp",
    connectionId: "",
    dataObjectName: "",
    onTheFlyRetrieval: true,
    syncOnLoad: false,
    cacheResults: false,
  },
  fileManager: {
    activeTab: "attachment",
    attachment: {
      saveAs: "file",
      extensions: [],
      sizeUnit: "KB",
      sizeValue: 1024,
    },
    document: {
      documentName: "",
      category: "",
      saveAs: "file",
      frequency: "anyDate",
      formatParts: ["DD", "-", "MM", "-", "YY"],
      cardinality: "single",
      extensions: [],
      sizeUnit: "KB",
      sizeValue: 1024,
      access: "anyone",
    },
  },
  places: { enableGeo: false, autoDetect: false, showMap: false, defaultMapZoom: 12 },
  fieldTracking: {
    trackCreated: false,
    trackModified: false,
    trackDeleted: false,
    logHistory: false,
    trackedFieldIds: [],
  },
  autoAssignment: { enabled: false, assignmentMode: "roundRobin", defaultAssignee: "" },
  compositeKey: { enabled: false, fieldIds: [] },
  fieldUpdate: {
    enabled: false,
    onCreate: false,
    onUpdate: false,
    runBeforeSave: false,
    stubRule: { trigger: "create", valueExpression: "" },
  },
  questionnaire: {
    enabled: false,
    allowPartialSave: false,
    showProgressBar: false,
    randomiseQuestions: false,
    multiStepEnabled: false,
    stepsCount: 3,
    likertScaleEnabled: false,
  },
};

/** Simple plural suggestion from display name. */
export function suggestPlural(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "";
  if (/[sSxZz]$/.test(trimmed) || /(?:ch|sh)$/i.test(trimmed)) return `${trimmed}es`;
  if (/[^aeiou]y$/i.test(trimmed)) return `${trimmed.slice(0, -1)}ies`;
  return `${trimmed}s`;
}

export function defaultObjectSettings(objectType?: string): ObjectSettings {
  const s = structuredClone(BASE_DEFAULTS);
  if (objectType === "Questionnaire") {
    s.questionnaire.enabled = true;
    s.questionnaire.showProgressBar = true;
    s.questionnaire.multiStepEnabled = true;
  }
  if (objectType === "Assignment") {
    s.autoAssignment.enabled = true;
  }
  return s;
}

type LegacyConstraints = {
  allowDuplication?: boolean;
  isReadOnly?: boolean;
  isAuditable?: boolean;
  allowRecordCloning?: boolean;
  softDelete?: boolean;
  requireUniquePrimary?: boolean;
};
type LegacyAutoAssignment = { roundRobin?: boolean; capacityBased?: boolean; assignmentMode?: AssignmentMode };

function blankConstraintMessage(): ConstraintMessage {
  return { activeType: "information", information: "", warning: "", error: "" };
}

/** Accept new per-severity shape or legacy `{ type, description }`. */
function normalizeConstraintMessage(
  base: ConstraintMessage,
  incoming?: Partial<ConstraintMessage> & { type?: ConstraintMessageType; description?: string } | null,
): ConstraintMessage {
  const blank = blankConstraintMessage();
  if (!incoming) return { ...blank, ...base };

  const legacyType = incoming.type;
  const legacyDesc = typeof incoming.description === "string" ? incoming.description : undefined;
  const hasNewShape =
    "information" in incoming || "warning" in incoming || "error" in incoming || "activeType" in incoming;

  if (hasNewShape) {
    return {
      ...blank,
      ...base,
      information: incoming.information ?? base.information ?? "",
      warning: incoming.warning ?? base.warning ?? "",
      error: incoming.error ?? base.error ?? "",
      activeType: incoming.activeType ?? base.activeType ?? "information",
    };
  }

  // Legacy single-type message → seed that severity's description
  const next = { ...blank, ...base };
  if (legacyType && legacyDesc !== undefined) {
    next[legacyType] = legacyDesc;
    next.activeType = legacyType;
  }
  return next;
}

function migrateConstraints(
  base: ObjectSettings["constraints"],
  partial?: Partial<ObjectSettings["constraints"]> & LegacyConstraints,
): ObjectSettings["constraints"] {
  if (!partial) return base;
  // New shape already present
  if ("constraintName" in partial || "enableCriteria" in partial || "enableResultCount" in partial) {
    return {
      ...base,
      ...partial,
      criteriaTokens: Array.isArray(partial.criteriaTokens) ? partial.criteriaTokens : base.criteriaTokens,
      criteriaMessage: normalizeConstraintMessage(base.criteriaMessage, partial.criteriaMessage as ConstraintMessage),
      resultCountMessage: normalizeConstraintMessage(base.resultCountMessage, partial.resultCountMessage as ConstraintMessage),
    };
  }
  // Legacy toggles ignored — map to empty new constraint config
  return base;
}

function migrateAutoAssignment(
  base: ObjectSettings["autoAssignment"],
  partial?: Partial<ObjectSettings["autoAssignment"]> & LegacyAutoAssignment,
): ObjectSettings["autoAssignment"] {
  if (!partial) return base;
  const legacy = partial as LegacyAutoAssignment;
  let assignmentMode = partial.assignmentMode ?? base.assignmentMode;
  if (!partial.assignmentMode) {
    if (legacy.capacityBased) assignmentMode = "capacityBased";
    else if (legacy.roundRobin) assignmentMode = "roundRobin";
  }
  const { roundRobin: _r, capacityBased: _c, ...rest } = partial as LegacyAutoAssignment & Partial<ObjectSettings["autoAssignment"]>;
  return { ...base, ...rest, assignmentMode };
}

export function serializeCriteriaTokens(tokens: CriteriaToken[]): string {
  return tokens.map(t => t.value).join(" ").replace(/\s+/g, " ").trim();
}

export function defaultDocumentFormatParts(frequency: DocumentFrequency): string[] {
  switch (frequency) {
    case "anyDate":
    case "daily":
      return ["DD", "-", "MM", "-", "YY"];
    case "weekly":
      return ["W", "-", "{0}", "-", "MM", "-", "YY"];
    case "monthly":
      return ["MM", "-", "YY"];
    case "quarterly":
      return ["Q", "-", "{0}", "-", "MM", "-", "YY", "-", "MM", "-", "YY"];
    case "yearly":
      return ["YY"];
  }
}

export function previewDocumentFormat(parts: string[]): string {
  return parts.join("").replace(/-+/g, "-").replace(/\/+/g, "/");
}

function blankAttachment(): FileAttachmentSettings {
  return {
    saveAs: "file",
    extensions: [],
    sizeUnit: "KB",
    sizeValue: 1024,
  };
}

function blankDocument(): FileDocumentSettings {
  return {
    documentName: "",
    category: "",
    saveAs: "file",
    frequency: "anyDate",
    formatParts: defaultDocumentFormatParts("anyDate"),
    cardinality: "single",
    extensions: [],
    sizeUnit: "KB",
    sizeValue: 1024,
    access: "anyone",
  };
}

function migrateFileManager(
  base: ObjectSettings["fileManager"],
  partial?: Partial<ObjectSettings["fileManager"]> & {
    allowAttachments?: boolean;
    allowDocuments?: boolean;
    allowMultiple?: boolean;
    maxFileMB?: number;
    allowedExtensions?: string;
    storageType?: FileStorageType;
    attachment?: Partial<FileAttachmentSettings>;
    document?: Partial<FileDocumentSettings>;
    activeTab?: FileManagerTab;
  },
): ObjectSettings["fileManager"] {
  if (!partial) return base;

  // New shape
  if (partial.attachment || partial.document || partial.activeTab) {
    const att = { ...blankAttachment(), ...base.attachment, ...partial.attachment };
    const doc = { ...blankDocument(), ...base.document, ...partial.document };
    return {
      activeTab: partial.activeTab ?? base.activeTab,
      attachment: {
        ...att,
        extensions: Array.isArray(partial.attachment?.extensions)
          ? partial.attachment!.extensions
          : Array.isArray(att.extensions) ? att.extensions : [],
      },
      document: {
        ...doc,
        extensions: Array.isArray(partial.document?.extensions)
          ? partial.document!.extensions
          : Array.isArray(doc.extensions) ? doc.extensions : [],
        formatParts: Array.isArray(partial.document?.formatParts)
          ? partial.document!.formatParts
          : Array.isArray(doc.formatParts) ? doc.formatParts : defaultDocumentFormatParts(doc.frequency),
      },
    };
  }

  // Legacy flat toggles
  const legacy = partial as {
    allowAttachments?: boolean;
    allowDocuments?: boolean;
    allowMultiple?: boolean;
    maxFileMB?: number;
    allowedExtensions?: string;
    storageType?: FileStorageType;
  };
  if (
    legacy.allowAttachments !== undefined
    || legacy.allowDocuments !== undefined
    || legacy.storageType
    || legacy.maxFileMB
    || legacy.allowedExtensions
  ) {
    const saveAs: FileSaveAs =
      legacy.storageType === "tableServer" ? "table"
        : legacy.storageType === "gitServer" ? "git"
          : "file";
    const exts = (legacy.allowedExtensions ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    const sizeValue = legacy.maxFileMB ?? 10;
    return {
      activeTab: legacy.allowDocuments && !legacy.allowAttachments ? "document" : "attachment",
      attachment: {
        saveAs,
        extensions: exts,
        sizeUnit: "MB",
        sizeValue,
      },
      document: {
        ...blankDocument(),
        saveAs,
        extensions: exts,
        sizeUnit: "MB",
        sizeValue,
        cardinality: legacy.allowMultiple ? "multiple" : "single",
      },
    };
  }

  return base;
}

export function createBlankCalendarEntry(): CalendarEntry {
  return {
    id: `cal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    calendarName: "",
    displayName: "",
    description: "",
    elements: "",
    endDate: "",
    geoLink: "",
    color: "#60A5FA",
    icon: "list",
    recurrenceEnabled: true,
    recurrence: "none",
    wholeDayEvent: false,
    enableEventCreation: false,
    enableEventAction: false,
    viewDetails: "",
    actions: { phone: false, email: false, message: false, share: false },
    condition: "",
    criteriaTokens: [],
    platformTab: "web",
  };
}

export function createBlankNotificationEntry(defaultObjectId?: string): NotificationEntry {
  return {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    associateWithUserAssignment: false,
    platform: "email",
    separateMailPerRecipient: false,
    recipients: "",
    cc: "",
    bcc: "",
    showCcBcc: false,
    subject: "",
    fromProfile: "org",
    templateName: "",
    templateMode: "default",
    attachmentCount: 0,
    messageBody: "",
    layoutName: "",
    notificationActions: [],
    whatsappParamsConfigured: false,
    linkedObjectIds: defaultObjectId ? [defaultObjectId] : [],
    triggerSource: "events",
    enableScheduler: false,
    scheduleFrequency: "once",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    intervalValue: "",
    intervalUnit: "hours",
    recordEvent: "created",
    treatNullAsZero: false,
    criteriaTokens: [],
    conditionSummary: "",
  };
}

function migrateNotificationEntry(e: Partial<NotificationEntry> & {
  onCreate?: boolean;
  onUpdate?: boolean;
  onDelete?: boolean;
  conditionEnabled?: boolean;
}): NotificationEntry {
  const blank = createBlankNotificationEntry();
  const merged: NotificationEntry = {
    ...blank,
    ...e,
    criteriaTokens: Array.isArray(e.criteriaTokens) ? e.criteriaTokens : blank.criteriaTokens,
    notificationActions: Array.isArray(e.notificationActions) ? e.notificationActions : blank.notificationActions,
    linkedObjectIds: Array.isArray(e.linkedObjectIds) ? e.linkedObjectIds : blank.linkedObjectIds,
  };

  // Legacy create/update/delete toggles → record event
  if (!e.recordEvent && !e.triggerSource) {
    if (e.onCreate && e.onUpdate) merged.recordEvent = "createdAndEdited";
    else if (e.onCreate) merged.recordEvent = "created";
    else if (e.onUpdate) merged.recordEvent = "createdAndEdited";
    merged.triggerSource = "events";
  }

  if (e.conditionEnabled && !merged.conditionSummary && merged.criteriaTokens.length) {
    merged.conditionSummary = serializeCriteriaTokens(merged.criteriaTokens);
  }

  return merged;
}

function migrateNotification(
  base: ObjectSettings["notification"],
  partial?: Partial<ObjectSettings["notification"]> & {
    onCreate?: boolean;
    onUpdate?: boolean;
    onDelete?: boolean;
    notifyOwner?: boolean;
    channels?: { email?: boolean; browser?: boolean; push?: boolean; chat?: boolean };
    stubRule?: { event?: string; conditionSummary?: string; recipientSummary?: string };
    entries?: NotificationEntry[];
  },
): ObjectSettings["notification"] {
  if (!partial) return base;
  if (Array.isArray(partial.entries)) {
    return { entries: partial.entries.map(e => migrateNotificationEntry(e)) };
  }

  const legacy = partial as {
    onCreate?: boolean;
    onUpdate?: boolean;
    onDelete?: boolean;
    notifyOwner?: boolean;
    channels?: { email?: boolean; browser?: boolean; push?: boolean; chat?: boolean };
    stubRule?: { event?: string; conditionSummary?: string; recipientSummary?: string };
  };
  if (legacy.onCreate || legacy.onUpdate || legacy.onDelete) {
    const entry = createBlankNotificationEntry();
    entry.name = "Migrated notification";
    entry.triggerSource = "events";
    entry.recordEvent = legacy.onCreate && legacy.onUpdate
      ? "createdAndEdited"
      : legacy.onCreate
        ? "created"
        : "createdAndEdited";
    entry.recipients = legacy.notifyOwner
      ? "Owner"
      : (legacy.stubRule?.recipientSummary ?? "");
    entry.conditionSummary = legacy.stubRule?.conditionSummary ?? "";
    const ch = legacy.channels;
    if (ch?.email) entry.platform = "email";
    else if (ch?.browser) entry.platform = "browser";
    else if (ch?.push) entry.platform = "push";
    else if (ch?.chat) entry.platform = "googleChat";
    return { entries: [entry] };
  }

  return base;
}

function migrateCalendar(
  base: ObjectSettings["calendar"],
  partial?: Partial<ObjectSettings["calendar"]> & {
    enabled?: boolean;
    showWeekends?: boolean;
    defaultView?: string;
    startFieldId?: string;
    endFieldId?: string;
    titleFieldId?: string;
    referenceFieldIds?: string[];
    recurrence?: CalendarRecurrence;
    calendarAccessInApp?: boolean;
    entries?: CalendarEntry[];
  },
): ObjectSettings["calendar"] {
  if (!partial) return base;
  if (Array.isArray(partial.entries)) {
    return {
      entries: partial.entries.map(e => {
        const blank = createBlankCalendarEntry();
        const legacy = e as CalendarEntry & { permissionsTab?: CalendarPlatformTab; detailsTab?: CalendarPlatformTab };
        return {
          ...blank,
          ...e,
          actions: { ...blank.actions, ...e.actions },
          criteriaTokens: Array.isArray(e.criteriaTokens) ? e.criteriaTokens : blank.criteriaTokens,
          platformTab: e.platformTab ?? legacy.permissionsTab ?? blank.platformTab,
        };
      }),
    };
  }
  // Legacy flat calendar → one entry when previously enabled
  if (partial.enabled) {
    const entry = createBlankCalendarEntry();
    entry.title = partial.titleFieldId ?? "";
    entry.endDate = partial.endFieldId ?? "";
    entry.recurrence = partial.recurrence ?? "none";
    entry.recurrenceEnabled = true;
    return { entries: [entry] };
  }
  return base;
}

function migrateAddInfo(
  base: ObjectSettings["addInfo"],
  partial?: Partial<ObjectSettings["addInfo"]> & {
    isVisible?: boolean;
    isSearchable?: boolean;
    isExportable?: boolean;
    defaultListLayout?: string;
  },
): ObjectSettings["addInfo"] {
  if (!partial) return base;
  const {
    isVisible: _v,
    isSearchable: _s,
    isExportable: _e,
    defaultListLayout: _d,
    ...rest
  } = partial;
  return { ...base, ...rest };
}

export function mergeObjectSettings(
  partial?: Partial<ObjectSettings> | ObjectSettings | null,
  objectType?: string,
): ObjectSettings {
  const base = defaultObjectSettings(objectType);
  if (!partial) return base;

  const dataProviderPartial = partial.dataProvider ?? {};
  const placesPartial = partial.places ?? {};
  const fieldTrackingPartial = partial.fieldTracking ?? {};
  const fieldUpdatePartial = partial.fieldUpdate ?? {};
  const questionnairePartial = partial.questionnaire ?? {};

  return {
    primaryInfo: { ...base.primaryInfo, ...partial.primaryInfo },
    calendar: migrateCalendar(base.calendar, partial.calendar),
    constraints: migrateConstraints(base.constraints, partial.constraints),
    addInfo: migrateAddInfo(base.addInfo, partial.addInfo),
    notification: migrateNotification(base.notification, partial.notification),
    dataProvider: { ...base.dataProvider, ...dataProviderPartial },
    fileManager: migrateFileManager(base.fileManager, partial.fileManager),
    places: { ...base.places, ...placesPartial },
    fieldTracking: {
      ...base.fieldTracking,
      ...fieldTrackingPartial,
      trackedFieldIds: fieldTrackingPartial.trackedFieldIds ?? base.fieldTracking.trackedFieldIds,
    },
    autoAssignment: migrateAutoAssignment(base.autoAssignment, partial.autoAssignment),
    compositeKey: {
      ...base.compositeKey,
      ...partial.compositeKey,
      fieldIds: partial.compositeKey?.fieldIds ?? base.compositeKey.fieldIds,
    },
    fieldUpdate: {
      ...base.fieldUpdate,
      ...fieldUpdatePartial,
      stubRule: { ...base.fieldUpdate.stubRule, ...fieldUpdatePartial.stubRule },
    },
    questionnaire: { ...base.questionnaire, ...questionnairePartial },
  };
}

export function summarizeEnabledFeatures(settings: ObjectSettings): string[] {
  const features: string[] = [];
  if (settings.calendar.entries.length > 0) features.push("Calendar");
  if (settings.constraints.constraintName || settings.constraints.enableCriteria || settings.constraints.enableResultCount) {
    features.push("Constraints");
  }
  if (settings.addInfo.isStoreEnable) features.push("Store");
  if (settings.addInfo.enableReport) features.push("Reports");
  if (settings.addInfo.isMobileEnabled) features.push("Mobile");
  if (settings.notification.entries.length > 0) features.push("Notifications");
  if (settings.dataProvider.enabled) features.push("Data Provider");
  if (
    settings.fileManager.attachment.extensions.length > 0
    || settings.fileManager.document.documentName
    || settings.fileManager.document.extensions.length > 0
  ) {
    features.push("File Manager");
  }
  if (settings.places.enableGeo) features.push("Places");
  if (settings.fieldTracking.trackCreated || settings.fieldTracking.logHistory) features.push("Field Tracking");
  if (settings.autoAssignment.enabled) features.push("Auto Assign");
  if (settings.compositeKey.enabled) features.push("Composite Key");
  if (settings.fieldUpdate.enabled) features.push("Field Update");
  if (settings.questionnaire.enabled) features.push("Questionnaire");
  return features;
}

function fieldLabel(fields: SettingsFieldRef[], id?: string): string {
  if (!id) return "";
  return fields.find(f => f.id === id)?.label ?? id;
}

/** Per-section one-line summaries for properties panel (C4). */
export function summarizeSettingsSections(
  settings: ObjectSettings,
  fields: SettingsFieldRef[] = [],
): SettingsSectionSummary[] {
  const out: SettingsSectionSummary[] = [];

  const pi = [settings.primaryInfo.pluralLabel, settings.primaryInfo.moduleName].filter(Boolean);
  if (pi.length) out.push({ section: "Primary Info", summary: pi.join(" · ") });

  if (settings.calendar.entries.length > 0) {
    const names = settings.calendar.entries.map(e => e.calendarName || e.title || e.displayName).filter(Boolean);
    out.push({
      section: "Calendar",
      summary: names.length ? `${names.length}: ${names.slice(0, 2).join(", ")}${names.length > 2 ? "…" : ""}` : `${settings.calendar.entries.length} configured`,
    });
  }

  const constraintParts: string[] = [];
  if (settings.constraints.constraintName) constraintParts.push(settings.constraints.constraintName);
  if (settings.constraints.enableCriteria) constraintParts.push("Criteria");
  if (settings.constraints.enableResultCount) constraintParts.push("Result count");
  if (constraintParts.length) out.push({ section: "Constraints", summary: constraintParts.join(" · ") });

  const addParts: string[] = [];
  if (settings.addInfo.isStoreEnable) addParts.push("Store");
  if (settings.addInfo.trackRecordHistory) addParts.push("History");
  if (settings.addInfo.enableReport) addParts.push("Reports");
  if (settings.addInfo.addNotesAndAttachments) addParts.push("Notes");
  if (settings.addInfo.allowCrossApplicationSharing) addParts.push("Cross-app share");
  if (settings.addInfo.allowRecordSharing) addParts.push("Record share");
  if (settings.addInfo.isMobileEnabled) addParts.push("Mobile");
  if (addParts.length) out.push({ section: "Add Info", summary: addParts.join(" · ") });

  if (settings.notification.entries.length > 0) {
    const names = settings.notification.entries.map(e => e.name).filter(Boolean);
    out.push({
      section: "Notification",
      summary: names.length
        ? `${names.length}: ${names.slice(0, 2).join(", ")}${names.length > 2 ? "…" : ""}`
        : `${settings.notification.entries.length} configured`,
    });
  }

  if (settings.dataProvider.enabled) {
    out.push({
      section: "Data Provider",
      summary: `${settings.dataProvider.providerType.toUpperCase()}${settings.dataProvider.connectionId ? ` · ${settings.dataProvider.connectionId}` : ""}`,
    });
  }

  const fmConfigured =
    settings.fileManager.attachment.extensions.length > 0
    || Boolean(settings.fileManager.document.documentName.trim())
    || settings.fileManager.document.extensions.length > 0;
  if (fmConfigured) {
    const saveLabel = settings.fileManager.activeTab === "document"
      ? settings.fileManager.document.saveAs
      : settings.fileManager.attachment.saveAs;
    const size = settings.fileManager.activeTab === "document"
      ? settings.fileManager.document
      : settings.fileManager.attachment;
    out.push({
      section: "File Manager",
      summary: `${settings.fileManager.activeTab} · ${saveLabel} · ${size.sizeValue}${size.sizeUnit}`,
    });
  }

  if (settings.places.enableGeo) {
    out.push({
      section: "Places",
      summary: fieldLabel(fields, settings.places.geolocationFieldId) || "Geolocation enabled",
    });
  }

  const trackParts = [
    settings.fieldTracking.trackCreated && "created",
    settings.fieldTracking.trackModified && "modified",
    settings.fieldTracking.logHistory && "history",
  ].filter(Boolean);
  if (trackParts.length) out.push({ section: "Field Tracking", summary: trackParts.join(", ") });

  if (settings.autoAssignment.enabled) {
    out.push({ section: "Auto Assignment", summary: settings.autoAssignment.assignmentMode });
  }

  if (settings.compositeKey.enabled && settings.compositeKey.fieldIds.length >= 2) {
    const names = settings.compositeKey.fieldIds.map(id => fieldLabel(fields, id)).filter(Boolean);
    out.push({ section: "Composite Key", summary: names.length ? names.join(" + ") : `${settings.compositeKey.fieldIds.length} fields` });
  }

  if (settings.fieldUpdate.enabled) {
    const triggers = [settings.fieldUpdate.onCreate && "create", settings.fieldUpdate.onUpdate && "update"].filter(Boolean);
    out.push({ section: "Field Update", summary: triggers.join("/") || "Rules enabled" });
  }

  if (settings.questionnaire.enabled) {
    const qParts = [settings.questionnaire.multiStepEnabled ? `${settings.questionnaire.stepsCount} steps` : null, settings.questionnaire.showProgressBar ? "progress" : null].filter(Boolean);
    out.push({ section: "Questionnaire", summary: qParts.join(" · ") || "Survey mode" });
  }

  return out;
}

export function countConfiguredSections(settings: ObjectSettings): number {
  return summarizeSettingsSections(settings).length;
}

export function getSuggestedSettings(
  objectType: WizardObjectType,
  fields: SettingsFieldRef[],
): { section: ObjAdvSection; reason: string }[] {
  const suggestions: { section: ObjAdvSection; reason: string }[] = [];
  const hasDate = fields.some(f => f.fieldType === "Date Picker" || f.fieldType === "Date & Time" || f.fieldType === "Date");
  const hasGeo = fields.some(f => f.fieldType === "Geolocation");
  const hasLookup = fields.some(f => f.fieldType === "Lookup" || f.fieldType === "Master Details");
  const hasImage = fields.some(f => f.fieldType === "Image" || f.fieldType === "File");
  const hasLikert = fields.some(f => f.fieldType === "Likert Scale");

  if (objectType === "Questionnaire") {
    suggestions.push({ section: "questionnaire", reason: "Questionnaire object type" });
  }
  if (objectType === "Assignment") {
    suggestions.push({ section: "autoassignment", reason: "Assignment object type" });
  }
  if (hasDate) suggestions.push({ section: "calendar", reason: "Date field added" });
  if (hasGeo) suggestions.push({ section: "places", reason: "Geolocation field added" });
  if (hasImage) suggestions.push({ section: "filemanager", reason: "File/image field added" });
  if (hasLikert) suggestions.push({ section: "questionnaire", reason: "Likert scale field added" });
  if (hasLookup && !suggestions.some(s => s.section === "fieldtracking")) {
    suggestions.push({ section: "fieldtracking", reason: "Relationship fields — consider audit tracking" });
  }
  return suggestions;
}

function entryHasTrigger(entry: NotificationEntry): boolean {
  if (entry.triggerSource === "events") return Boolean(entry.recordEvent);
  if (entry.triggerSource === "processFlow") {
    if (!entry.enableScheduler) return true;
    if (entry.scheduleFrequency === "once") {
      return Boolean(entry.startDate.trim() && entry.startTime.trim());
    }
    return Boolean(
      entry.startDate.trim()
      && entry.startTime.trim()
      && entry.endDate.trim()
      && entry.endTime.trim()
      && entry.intervalValue.trim(),
    );
  }
  return false;
}

function isDateField(fieldType: string): boolean {
  return fieldType === "Date Picker" || fieldType === "Date & Time" || fieldType === "Date" || fieldType === "Time";
}

function isGeoField(fieldType: string): boolean {
  return fieldType === "Geolocation";
}

function isFileField(fieldType: string): boolean {
  return fieldType === "Image" || fieldType === "File";
}

function isValidExtensions(ext: string): boolean {
  if (!ext.trim()) return true;
  return ext.split(",").every(part => /^\.?[a-z0-9]+$/i.test(part.trim()));
}

/** Settings dependency validation (PR-10 / §5.15). */
export function collectSettingsBlockers(
  settings: ObjectSettings,
  fields: SettingsFieldRef[],
  objectType: WizardObjectType,
): SettingsValidationBlocker[] {
  const blockers: SettingsValidationBlocker[] = [];
  const primaryField = fields.find(f => f.isPrimary);

  if (settings.calendar.entries.length > 0) {
    const incomplete = settings.calendar.entries.find(e => !e.calendarName.trim() || !e.title.trim());
    if (incomplete) {
      blockers.push({
        message: "Each calendar requires a Title and Calendar Name",
        settingsSection: "calendar",
      });
    }
  }

  if (settings.compositeKey.enabled) {
    if (settings.compositeKey.fieldIds.length < 2) {
      blockers.push({ message: "Composite key requires at least 2 fields selected", settingsSection: "compositekey" });
    }
    if (primaryField && settings.compositeKey.fieldIds.includes(primaryField.id)) {
      blockers.push({ message: "Primary field cannot be part of the composite key", settingsSection: "compositekey" });
    }
  }

  if (settings.questionnaire.enabled && objectType !== "Questionnaire") {
    blockers.push({ message: "Questionnaire mode requires object type Questionnaire", settingsSection: "questionnaire" });
  }

  if (settings.places.enableGeo) {
    const geoFields = fields.filter(f => isGeoField(f.fieldType));
    if (geoFields.length === 0) {
      blockers.push({ message: "Places requires a Geolocation field", settingsSection: "places" });
    } else if (geoFields.length > 1 && !settings.places.geolocationFieldId) {
      blockers.push({ message: "Select a geolocation field for Places", settingsSection: "places" });
    }
  }

  const fmHasConfig =
    settings.fileManager.attachment.extensions.length > 0
    || Boolean(settings.fileManager.document.documentName.trim())
    || settings.fileManager.document.extensions.length > 0;
  if (fmHasConfig && !fields.some(f => isFileField(f.fieldType))) {
    blockers.push({
      message: "File Manager works best with an Image or File field",
      settingsSection: "filemanager",
    });
  }

  if (settings.fileManager.attachment.sizeValue <= 0 || settings.fileManager.document.sizeValue <= 0) {
    blockers.push({ message: "File size must be greater than 0", settingsSection: "filemanager" });
  }

  const allExts = [
    ...settings.fileManager.attachment.extensions,
    ...settings.fileManager.document.extensions,
  ].join(",");
  if (!isValidExtensions(allExts)) {
    blockers.push({ message: "Allowed extensions must be like .pdf or .png", settingsSection: "filemanager" });
  }

  if (settings.notification.entries.length > 0) {
    const incomplete = settings.notification.entries.find(e => {
      if (!e.name.trim()) return true;
      if (!entryHasTrigger(e)) return true;
      if (e.platform === "email" && !e.recipients.trim() && !e.associateWithUserAssignment) return true;
      if (e.platform === "browser" && !e.messageBody.trim()) return true;
      if (e.platform === "browser" && !e.recipients.trim() && !e.associateWithUserAssignment) return true;
      if (e.platform === "push" && !e.subject.trim()) return true;
      if (e.platform === "push" && !e.recipients.trim() && !e.associateWithUserAssignment) return true;
      if (e.platform === "googleChat" && !e.messageBody.trim()) return true;
      if (e.platform === "whatsapp" && !e.templateName.trim() && !e.whatsappParamsConfigured) return true;
      if (e.platform === "whatsapp" && !e.recipients.trim() && !e.associateWithUserAssignment) return true;
      return false;
    });
    if (incomplete) {
      blockers.push({
        message: "Each notification needs a name, at least one trigger, and delivery details for the selected channel",
        settingsSection: "notification",
      });
    }
  }

  if (settings.autoAssignment.enabled && !settings.autoAssignment.assigneeLookupFieldId && !settings.autoAssignment.defaultAssignee.trim()) {
    blockers.push({ message: "Auto assignment requires an assignee lookup field or default assignee", settingsSection: "autoassignment" });
  }

  if (settings.fieldUpdate.enabled && settings.fieldUpdate.stubRule.valueExpression.trim() && !settings.fieldUpdate.stubRule.targetFieldId) {
    blockers.push({ message: "Field update rule requires a target field", settingsSection: "fieldupdate" });
  }

  if (settings.dataProvider.enabled && !settings.dataProvider.connectionId) {
    blockers.push({ message: "Data Provider requires a connection", settingsSection: "dataprovider" });
  }

  if ((settings.constraints.enableCriteria || settings.constraints.enableResultCount) && !settings.constraints.constraintName.trim()) {
    blockers.push({ message: "Constraint name is required when criteria or result count is enabled", settingsSection: "constraints" });
  }

  if (settings.constraints.enableResultCount && !settings.constraints.resultCountObject.trim()) {
    blockers.push({ message: "Result count requires a selected object", settingsSection: "constraints" });
  }

  return blockers;
}

/** Deferred to Automation / Integrations slices (§8 plan B5). */
export const DEFERRED_SETTINGS_SLICES = {
  wsdpMapping: "Connection mapping, payload/API config, and execution logs — Integrations slice (§5.11)",
  fieldUpdateRules: "Multi-rule field update editor with conditions — Automation slice (§5.6/§5.7)",
  portation: "Portation / version / locking — Move & Release slice (§5.2)",
} as const;
