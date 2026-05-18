const uploadForm = document.querySelector("#upload-unit-form");
const uploadInput = document.querySelector("#unit-plan-file");
const uploadStatus = document.querySelector("#upload-status");
const authStatusElement = document.querySelector("#unit-auth-status");
const uploadButton = document.querySelector("#upload-unit-button");
const clearButton = document.querySelector("#clear-unit-file");
const importTemplateButton = document.querySelector("#import-template-button");
const previewFileButton = document.querySelector("#preview-file-button");
const previewTemplateButton = document.querySelector("#preview-template-button");
const previewPanel = document.querySelector("#unit-preview-panel");
const previewForm = document.querySelector("#unit-preview-form");
const previewSource = document.querySelector("#preview-source");
const savePreviewButton = document.querySelector("#save-preview-button");

const manualForm = document.querySelector("#manual-unit-form");
const saveManualUnitButton = document.querySelector("#save-manual-unit-button");
const cancelManualUploadButton = document.querySelector("#cancel-manual-upload");
const clearManualFormButton = document.querySelector("#clear-manual-form");
const lessonList = document.querySelector("#lesson-list");
const addLessonButton = document.querySelector("#add-lesson");

const previewFields = {
    title: document.querySelector("#preview-title"),
    topic: document.querySelector("#preview-topic"),
    yearLevel: document.querySelector("#preview-year-level"),
    subjectStream: document.querySelector("#preview-subject-stream"),
    durationWeeks: document.querySelector("#preview-duration-weeks"),
    term: document.querySelector("#preview-term"),
    overview: document.querySelector("#preview-overview"),
    unitAims: document.querySelector("#preview-aims"),
    unitValues: {
        whanaungatanga: document.querySelector("#preview-value-whanaungatanga"),
        rangatiratanga: document.querySelector("#preview-value-rangatiratanga"),
        manaakitanga: document.querySelector("#preview-value-manaakitanga"),
        kaitiakitanga: document.querySelector("#preview-value-kaitiakitanga")
    },
    contexts: {
        environment: document.querySelector("#preview-context-environment"),
        mentalEmotional: document.querySelector("#preview-context-mental-emotional"),
        culture: document.querySelector("#preview-context-culture"),
        social: document.querySelector("#preview-context-social"),
        technology: document.querySelector("#preview-context-technology")
    },
    curriculumLinks: {
        localCurriculumLinks: document.querySelector("#preview-local-curriculum-links"),
        mataurangaMaori: document.querySelector("#preview-matauranga-maori"),
        skills: {
            literacy: document.querySelector("#preview-skill-literacy"),
            numeracy: document.querySelector("#preview-skill-numeracy"),
            digitalTech: document.querySelector("#preview-skill-digital-tech"),
            practical: document.querySelector("#preview-skill-practical")
        },
        healthSafety: document.querySelector("#preview-health-safety")
    },
    assessmentLink: document.querySelector("#preview-assessment-link"),
    notes: document.querySelector("#preview-notes"),
    lessonsJson: document.querySelector("#preview-lessons-json")
};

const manualFields = {
    title: document.querySelector("#manual-title"),
    topic: document.querySelector("#manual-topic"),
    strand: document.querySelector("#manual-strand"),
    yearLevel: document.querySelector("#manual-year-level"),
    subjectStream: document.querySelector("#manual-subject-stream"),
    durationWeeks: document.querySelector("#manual-duration-weeks"),
    term: document.querySelector("#manual-term"),
    overview: document.querySelector("#manual-overview"),
    unitAims: document.querySelector("#manual-aims"),
    unitValues: {
        whanaungatanga: document.querySelector("#manual-value-whanaungatanga"),
        rangatiratanga: document.querySelector("#manual-value-rangatiratanga"),
        manaakitanga: document.querySelector("#manual-value-manaakitanga"),
        kaitiakitanga: document.querySelector("#manual-value-kaitiakitanga")
    },
    contexts: {
        environment: document.querySelector("#manual-context-environment"),
        mentalEmotional: document.querySelector("#manual-context-mental-emotional"),
        culture: document.querySelector("#manual-context-culture"),
        social: document.querySelector("#manual-context-social"),
        technology: document.querySelector("#manual-context-technology")
    },
    curriculumLinks: {
        localCurriculumLinks: document.querySelector("#manual-local-curriculum-links"),
        mataurangaMaori: document.querySelector("#manual-matauranga-maori"),
        skills: {
            literacy: document.querySelector("#manual-skill-literacy"),
            numeracy: document.querySelector("#manual-skill-numeracy"),
            digitalTech: document.querySelector("#manual-skill-digital-tech"),
            practical: document.querySelector("#manual-skill-practical")
        },
        healthSafety: document.querySelector("#manual-health-safety")
    },
    assessmentLink: document.querySelector("#manual-assessment-link"),
    notes: document.querySelector("#manual-notes")
};

const UPLOAD_HUB_AUTH_STORAGE_KEY = "hub_google_auth_v1";
let hasReadyFilePreview = false;

const YEAR_LEVEL_OPTIONS = ["Junior", "Year 7", "Year 8", "Middle", "Year 9", "Year 10", "Senior", "Year 11", "Year 12", "Year 13"];
const SCHOOL_VALUE_KEYS = ["whanaungatanga", "rangatiratanga", "manaakitanga", "kaitiakitanga"];
const CONTEXT_KEYS = ["environment", "mentalEmotional", "culture", "social", "technology"];
const SCHOOL_VALUE_LABELS = {
    whanaungatanga: "Whanaungatanga",
    rangatiratanga: "Rangatiratanga",
    manaakitanga: "Manaakitanga",
    kaitiakitanga: "Kaitiakitanga"
};
const CONTEXT_LABELS = {
    environment: "Environment",
    mentalEmotional: "Mental-Emotional",
    culture: "Culture",
    social: "Social",
    technology: "Technology"
};
const CURRICULUM_LINK_KEYS = ["localCurriculumLinks", "mataurangaMaori", "skills", "healthSafety"];
const SKILL_KEYS = ["literacy", "numeracy", "digitalTech", "practical"];
const CURRICULUM_LINK_LABELS = {
    localCurriculumLinks: "Local Curriculum Links",
    mataurangaMaori: "Matauranga Maori",
    skills: "Skills",
    healthSafety: "Health & Safety"
};
const SKILL_LABELS = {
    literacy: "Literacy",
    numeracy: "Numeracy",
    digitalTech: "Digital Tech",
    practical: "Practical"
};

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function getHubStoredAuthRaw() {
    try {
        return localStorage.getItem(UPLOAD_HUB_AUTH_STORAGE_KEY) || sessionStorage.getItem(UPLOAD_HUB_AUTH_STORAGE_KEY) || "";
    } catch (_error) {
        return "";
    }
}

function getSignedInEmail() {
    const raw = getHubStoredAuthRaw();
    if (!raw) {
        return "";
    }

    try {
        const data = JSON.parse(raw);
        return normalizeEmail(data?.profile?.email || "");
    } catch (_error) {
        return "";
    }
}

function withUserEmailHeader(headers = {}) {
    const email = getSignedInEmail();
    if (!email) {
        return headers;
    }

    return {
        ...headers,
        "x-user-email": email
    };
}

function setStatus(message, isError = false) {
    if (!uploadStatus) {
        return;
    }

    if (!message) {
        uploadStatus.hidden = true;
        uploadStatus.textContent = "";
        uploadStatus.classList.remove("is-success", "is-error");
        return;
    }

    uploadStatus.hidden = false;
    uploadStatus.textContent = message;
    uploadStatus.classList.remove("is-success", "is-error");
    uploadStatus.classList.add(isError ? "is-error" : "is-success");
}

function setActionButtonsDisabled(disabled) {
    const buttons = [
        uploadButton,
        importTemplateButton,
        previewFileButton,
        previewTemplateButton,
        savePreviewButton,
        saveManualUnitButton,
        addLessonButton,
        clearManualFormButton,
        cancelManualUploadButton
    ];

    buttons.forEach((button) => {
        if (button) {
            button.disabled = Boolean(disabled);
        }
    });

    if (!disabled && uploadButton) {
        uploadButton.disabled = !hasReadyFilePreview;
    }
}

function resetFilePreviewState() {
    hasReadyFilePreview = false;
    if (previewPanel) {
        previewPanel.hidden = true;
    }
    if (uploadButton) {
        uploadButton.disabled = true;
    }
}

function joinLines(value) {
    if (!Array.isArray(value)) {
        return "";
    }

    return value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join("\n");
}

function getSelectValues(selectElement) {
    if (!selectElement) {
        return [];
    }

    return Array.from(selectElement.selectedOptions || [])
        .map((option) => String(option.value || option.textContent || "").trim())
        .filter(Boolean);
}

function setSelectValues(selectElement, values) {
    if (!selectElement) {
        return;
    }

    const selectedValues = Array.isArray(values)
        ? values.map((value) => String(value || "").trim()).filter(Boolean)
        : String(values || "").split(/\s*,\s*/).map((value) => value.trim()).filter(Boolean);

    Array.from(selectElement.options || []).forEach((option) => {
        const optionValue = String(option.value || option.textContent || "").trim();
        option.selected = selectedValues.includes(optionValue);
    });
}

function normalizeYearLevelText(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
    }

    return String(value || "")
        .split(/\s*,\s*/)
        .map((item) => item.trim())
        .filter(Boolean)
        .join(", ");
}

function inferYearLevelSelections(value) {
    const text = Array.isArray(value)
        ? value.map((item) => String(item || "").trim()).filter(Boolean).join(" ")
        : String(value || "");
    const lower = text.toLowerCase();
    const selected = new Set();

    if (/\bjunior\b/.test(lower)) selected.add("Junior");
    if (/\bmiddle\b/.test(lower)) selected.add("Middle");
    if (/\bsenior\b/.test(lower)) selected.add("Senior");

    for (let year = 7; year <= 13; year += 1) {
        const yearPattern = new RegExp(`\\byear\\s*${year}\\b`);
        if (yearPattern.test(lower) || new RegExp(`\\b${year}\\b`).test(lower)) {
            selected.add(`Year ${year}`);
        }
    }

    if (/\b7\s*(?:and|&)\s*8\b/.test(lower) || /\byear\s*7\s*(?:and|&)\s*8\b/.test(lower)) {
        selected.add("Year 7");
        selected.add("Year 8");
    }

    if (/\b8\s*(?:and|&)\s*9\b/.test(lower) || /\byear\s*8\s*(?:and|&)\s*9\b/.test(lower)) {
        selected.add("Year 8");
        selected.add("Year 9");
    }

    if (/\b9\s*(?:and|&)\s*10\b/.test(lower) || /\byear\s*9\s*(?:and|&)\s*10\b/.test(lower)) {
        selected.add("Year 9");
        selected.add("Year 10");
    }

    if (/\b10\s*(?:and|&)\s*11\b/.test(lower) || /\byear\s*10\s*(?:and|&)\s*11\b/.test(lower)) {
        selected.add("Year 10");
        selected.add("Year 11");
    }

    if (/\b11\s*(?:and|&)\s*12\b/.test(lower) || /\byear\s*11\s*(?:and|&)\s*12\b/.test(lower)) {
        selected.add("Year 11");
        selected.add("Year 12");
    }

    if (/\b12\s*(?:and|&)\s*13\b/.test(lower) || /\byear\s*12\s*(?:and|&)\s*13\b/.test(lower)) {
        selected.add("Year 12");
        selected.add("Year 13");
    }

    if (/\b7\s*[-–]\s*8\b/.test(lower) || /\byear\s*7\s*[-–]\s*8\b/.test(lower)) {
        selected.add("Year 7");
        selected.add("Year 8");
    }

    if (/\b8\s*[-–]\s*9\b/.test(lower) || /\byear\s*8\s*[-–]\s*9\b/.test(lower)) {
        selected.add("Year 8");
        selected.add("Year 9");
    }

    if (/\b9\s*[-–]\s*10\b/.test(lower) || /\byear\s*9\s*[-–]\s*10\b/.test(lower)) {
        selected.add("Year 9");
        selected.add("Year 10");
    }

    if (/\b10\s*[-–]\s*11\b/.test(lower) || /\byear\s*10\s*[-–]\s*11\b/.test(lower)) {
        selected.add("Year 10");
        selected.add("Year 11");
    }

    if (/\b11\s*[-–]\s*12\b/.test(lower) || /\byear\s*11\s*[-–]\s*12\b/.test(lower)) {
        selected.add("Year 11");
        selected.add("Year 12");
    }

    if (/\b12\s*[-–]\s*13\b/.test(lower) || /\byear\s*12\s*[-–]\s*13\b/.test(lower)) {
        selected.add("Year 12");
        selected.add("Year 13");
    }

    return YEAR_LEVEL_OPTIONS.filter((option) => selected.has(option));
}

function normalizeLines(value) {
    return String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function autoResizeTextarea(textarea) {
    if (!textarea) {
        return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function autoResizeSchoolValueTextareas() {
    const schoolValueTextareas = document.querySelectorAll(".school-value-card textarea");
    schoolValueTextareas.forEach((textarea) => {
        autoResizeTextarea(textarea);

        if (!textarea.dataset.autoResizeBound) {
            textarea.addEventListener("input", () => {
                autoResizeTextarea(textarea);
            });
            textarea.dataset.autoResizeBound = "true";
        }
    });
}

function autoResizeContextTextareas() {
    const contextTextareas = document.querySelectorAll(".contexts-row textarea");
    contextTextareas.forEach((textarea) => {
        autoResizeTextarea(textarea);

        if (!textarea.dataset.autoResizeBound) {
            textarea.addEventListener("input", () => {
                autoResizeTextarea(textarea);
            });
            textarea.dataset.autoResizeBound = "true";
        }
    });
}

function autoResizeLocalCurriculumTextareas() {
    const localCurriculumTextareas = document.querySelectorAll(".local-curriculum-table textarea");
    localCurriculumTextareas.forEach((textarea) => {
        autoResizeTextarea(textarea);

        if (!textarea.dataset.autoResizeBound) {
            textarea.addEventListener("input", () => {
                autoResizeTextarea(textarea);
            });
            textarea.dataset.autoResizeBound = "true";
        }
    });
}

function autoResizeSkillsTextareas() {
    const skillsTextareas = document.querySelectorAll(".skills-row textarea");
    skillsTextareas.forEach((textarea) => {
        autoResizeTextarea(textarea);

        if (!textarea.dataset.autoResizeBound) {
            textarea.addEventListener("input", () => {
                autoResizeTextarea(textarea);
            });
            textarea.dataset.autoResizeBound = "true";
        }
    });
}

function autoResizeHealthSafetyTextarea() {
    const healthSafetyTextarea = document.querySelector("#manual-health-safety, #preview-health-safety");
    if (healthSafetyTextarea) {
        autoResizeTextarea(healthSafetyTextarea);

        if (!healthSafetyTextarea.dataset.autoResizeBound) {
            healthSafetyTextarea.addEventListener("input", () => {
                autoResizeTextarea(healthSafetyTextarea);
            });
            healthSafetyTextarea.dataset.autoResizeBound = "true";
        }
    }
}

function getSchoolValueResponses(group) {
    const responses = {};
    SCHOOL_VALUE_KEYS.forEach((key) => {
        responses[key] = String(group?.[key]?.value || "").trim();
    });
    return responses;
}

function setSchoolValueResponses(group, responses = {}) {
    SCHOOL_VALUE_KEYS.forEach((key) => {
        if (group?.[key]) {
            group[key].value = String(responses[key] || "").trim();
            autoResizeTextarea(group[key]);
        }
    });
}

function schoolValueResponsesToUnitValues(responses) {
    return SCHOOL_VALUE_KEYS
        .map((key) => {
            const response = String(responses[key] || "").trim();
            if (!response) {
                return "";
            }
            return `${SCHOOL_VALUE_LABELS[key]}: ${response}`;
        })
        .filter(Boolean);
}

function parseUnitValuesToResponses(unitValues) {
    const responseMap = {
        whanaungatanga: "",
        rangatiratanga: "",
        manaakitanga: "",
        kaitiakitanga: ""
    };

    const lines = Array.isArray(unitValues)
        ? unitValues.map((line) => String(line || "").trim()).filter(Boolean)
        : String(unitValues || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    let currentKey = "";
    lines.forEach((line) => {
        const lower = line.toLowerCase();
        const matchedKey = SCHOOL_VALUE_KEYS.find((key) => lower.startsWith(SCHOOL_VALUE_LABELS[key].toLowerCase()));

        if (matchedKey) {
            currentKey = matchedKey;
            const remainder = line.replace(new RegExp(`^${SCHOOL_VALUE_LABELS[matchedKey]}\s*:?\s*`, "i"), "").trim();
            if (remainder) {
                responseMap[matchedKey] = responseMap[matchedKey]
                    ? `${responseMap[matchedKey]}\n${remainder}`
                    : remainder;
            }
            return;
        }

        if (currentKey) {
            responseMap[currentKey] = responseMap[currentKey]
                ? `${responseMap[currentKey]}\n${line}`
                : line;
        }
    });

    return responseMap;
}

function getContextResponses(group) {
    const responses = {};
    CONTEXT_KEYS.forEach((key) => {
        responses[key] = String(group?.[key]?.value || "").trim();
    });
    return responses;
}

function setContextResponses(group, responses = {}) {
    CONTEXT_KEYS.forEach((key) => {
        if (group?.[key]) {
            group[key].value = String(responses[key] || "").trim();
            autoResizeTextarea(group[key]);
        }
    });
}

function contextResponsesToArray(responses) {
    return CONTEXT_KEYS
        .map((key) => {
            const response = String(responses[key] || "").trim();
            if (!response) {
                return "";
            }
            return `${CONTEXT_LABELS[key]}: ${response}`;
        })
        .filter(Boolean);
}

function parseContextsToResponses(contexts) {
    const responseMap = {
        environment: "",
        mentalEmotional: "",
        culture: "",
        social: "",
        technology: ""
    };

    const lines = Array.isArray(contexts)
        ? contexts.map((line) => String(line || "").trim()).filter(Boolean)
        : String(contexts || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    let currentKey = "";
    lines.forEach((line) => {
        const lower = line.toLowerCase();
        const matchedKey = CONTEXT_KEYS.find((key) => lower.startsWith(CONTEXT_LABELS[key].toLowerCase()));

        if (matchedKey) {
            currentKey = matchedKey;
            const remainder = line.replace(new RegExp(`^${CONTEXT_LABELS[matchedKey]}\s*:?\s*`, "i"), "").trim();
            if (remainder) {
                responseMap[matchedKey] = responseMap[matchedKey]
                    ? `${responseMap[matchedKey]}\n${remainder}`
                    : remainder;
            }
            return;
        }

        if (currentKey) {
            responseMap[currentKey] = responseMap[currentKey]
                ? `${responseMap[currentKey]}\n${line}`
                : line;
        }
    });

    return responseMap;
}

function getCurriculumLinkResponses(group) {
    const responses = {};
    CURRICULUM_LINK_KEYS.forEach((key) => {
        if (key === "skills") {
            const skillResponses = {};
            SKILL_KEYS.forEach((skillKey) => {
                skillResponses[skillKey] = String(group?.skills?.[skillKey]?.value || "").trim();
            });
            responses.skills = skillResponses;
            return;
        }

        responses[key] = String(group?.[key]?.value || "").trim();
    });
    return responses;
}

function setCurriculumLinkResponses(group, responses = {}) {
    CURRICULUM_LINK_KEYS.forEach((key) => {
        if (key === "skills") {
            const skillResponses = responses.skills && typeof responses.skills === "object"
                ? responses.skills
                : {};
            SKILL_KEYS.forEach((skillKey) => {
                if (group?.skills?.[skillKey]) {
                    group.skills[skillKey].value = String(skillResponses[skillKey] || "").trim();
                    autoResizeTextarea(group.skills[skillKey]);
                }
            });
            return;
        }

        if (group?.[key]) {
            group[key].value = String(responses[key] || "").trim();
            autoResizeTextarea(group[key]);
        }
    });
}

function curriculumResponsesToLines(responses) {
    const lines = [];

    CURRICULUM_LINK_KEYS.forEach((key) => {
        if (key === "skills") {
            const skillResponses = responses.skills && typeof responses.skills === "object"
                ? responses.skills
                : {};
            const hasAnySkill = SKILL_KEYS.some((skillKey) => normalizeLines(skillResponses[skillKey] || "").length);
            if (!hasAnySkill) {
                return;
            }

            lines.push("Skills:");
            SKILL_KEYS.forEach((skillKey) => {
                const responseLines = normalizeLines(skillResponses[skillKey] || "");
                if (!responseLines.length) {
                    return;
                }
                lines.push(`${SKILL_LABELS[skillKey]}: ${responseLines[0]}`);
                responseLines.slice(1).forEach((line) => {
                    lines.push(line);
                });
            });
            return;
        }

        const responseLines = normalizeLines(responses[key] || "");
        if (!responseLines.length) {
            return;
        }

        lines.push(`${CURRICULUM_LINK_LABELS[key]}: ${responseLines[0]}`);
        responseLines.slice(1).forEach((line) => {
            lines.push(line);
        });
    });

    return lines;
}

function sanitizeHealthSafetyContent(content) {
    const text = String(content || "").trim();
    if (!text) {
        return "";
    }

    const lines = text.split(/\r?\n/).map((line) => line.trim());
    const sectionStarts = /\b(slideshow|reporting|assessment|lesson|curriculum\s*achievement|new\s*zealand|level\s*\d|technological|learning\s*outcomes|LEVEL\s*\d)\b/i;
    const result = [];

    for (const line of lines) {
        if (!line) {
            continue;
        }

        const idx = line.search(sectionStarts);
        if (idx === 0) {
            break;
        }

        if (idx > 0) {
            const trimmed = line.slice(0, idx).trim();
            if (trimmed) {
                result.push(trimmed);
            }
            break;
        }

        result.push(line);
    }

    return result.join("\n").trim();
}

function parseCurriculumLinksToResponses(curriculumLinks) {
    const responseMap = {
        localCurriculumLinks: "",
        mataurangaMaori: "",
        skills: {
            literacy: "",
            numeracy: "",
            digitalTech: "",
            practical: ""
        },
        healthSafety: ""
    };

    const lines = Array.isArray(curriculumLinks)
        ? curriculumLinks.map((line) => String(line || "").trim()).filter(Boolean)
        : String(curriculumLinks || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    let currentKey = "";
    let currentSkillKey = "";
    lines.forEach((line) => {
        const lower = line.toLowerCase();
        const localPrefix = /^local\s*curriculum\s*links?/i;
        const mataurangaPrefix = /^(m[aā]tauranga\s*m[aā]ori|matauranga\s*maori)/i;
        const skillsPrefix = /^skills?\b/i;
        const healthSafetyPrefix = /^(health\s*(?:&|and)\s*safety|safety\s*issues?)\b/i;
        const literacyPrefix = /^literacy\b/i;
        const numeracyPrefix = /^numeracy\b/i;
        const digitalTechPrefix = /^(digital\s*tech|digital\s*technology)\b/i;
        const practicalPrefix = /^practical\b/i;

        if (localPrefix.test(lower)) {
            currentKey = "localCurriculumLinks";
            currentSkillKey = "";
            const remainder = line.replace(localPrefix, "").replace(/^\s*:?\s*/, "").trim();
            if (remainder) {
                responseMap.localCurriculumLinks = responseMap.localCurriculumLinks
                    ? `${responseMap.localCurriculumLinks}\n${remainder}`
                    : remainder;
            }
            return;
        }

        if (mataurangaPrefix.test(lower)) {
            currentKey = "mataurangaMaori";
            currentSkillKey = "";
            const remainder = line.replace(mataurangaPrefix, "").replace(/^\s*:?\s*/, "").trim();
            if (remainder) {
                responseMap.mataurangaMaori = responseMap.mataurangaMaori
                    ? `${responseMap.mataurangaMaori}\n${remainder}`
                    : remainder;
            }
            return;
        }

        if (skillsPrefix.test(lower)) {
            currentKey = "skills";
            currentSkillKey = currentSkillKey || "literacy";
            const remainder = line.replace(skillsPrefix, "").replace(/^\s*:?\s*/, "").trim();
            if (remainder) {
                responseMap.skills[currentSkillKey] = responseMap.skills[currentSkillKey]
                    ? `${responseMap.skills[currentSkillKey]}\n${remainder}`
                    : remainder;
            }
            return;
        }

        if (healthSafetyPrefix.test(lower)) {
            currentKey = "healthSafety";
            currentSkillKey = "";
            const remainder = line.replace(healthSafetyPrefix, "").replace(/^\s*:?\s*/, "").trim();
            if (remainder) {
                responseMap.healthSafety = responseMap.healthSafety
                    ? `${responseMap.healthSafety}\n${remainder}`
                    : remainder;
            }
            return;
        }

        if (currentKey === "skills") {
            if (literacyPrefix.test(lower)) {
                currentSkillKey = "literacy";
                const remainder = line.replace(literacyPrefix, "").replace(/^\s*:?\s*/, "").trim();
                if (remainder) {
                    responseMap.skills.literacy = responseMap.skills.literacy
                        ? `${responseMap.skills.literacy}\n${remainder}`
                        : remainder;
                }
                return;
            }

            if (numeracyPrefix.test(lower)) {
                currentSkillKey = "numeracy";
                const remainder = line.replace(numeracyPrefix, "").replace(/^\s*:?\s*/, "").trim();
                if (remainder) {
                    responseMap.skills.numeracy = responseMap.skills.numeracy
                        ? `${responseMap.skills.numeracy}\n${remainder}`
                        : remainder;
                }
                return;
            }

            if (digitalTechPrefix.test(lower)) {
                currentSkillKey = "digitalTech";
                const remainder = line.replace(digitalTechPrefix, "").replace(/^\s*:?\s*/, "").trim();
                if (remainder) {
                    responseMap.skills.digitalTech = responseMap.skills.digitalTech
                        ? `${responseMap.skills.digitalTech}\n${remainder}`
                        : remainder;
                }
                return;
            }

            if (practicalPrefix.test(lower)) {
                currentSkillKey = "practical";
                const remainder = line.replace(practicalPrefix, "").replace(/^\s*:?\s*/, "").trim();
                if (remainder) {
                    responseMap.skills.practical = responseMap.skills.practical
                        ? `${responseMap.skills.practical}\n${remainder}`
                        : remainder;
                }
                return;
            }
        }

        if (!currentKey && !responseMap.localCurriculumLinks) {
            currentKey = "localCurriculumLinks";
        }

        if (currentKey) {
            if (currentKey === "skills") {
                currentSkillKey = currentSkillKey || "literacy";
                responseMap.skills[currentSkillKey] = responseMap.skills[currentSkillKey]
                    ? `${responseMap.skills[currentSkillKey]}\n${line}`
                    : line;
                return;
            }

            responseMap[currentKey] = responseMap[currentKey]
                ? `${responseMap[currentKey]}\n${line}`
                : line;
        }
    });

    responseMap.healthSafety = sanitizeHealthSafetyContent(responseMap.healthSafety);

    return responseMap;
}

function parseLessonsJson(value) {
    const source = String(value || "").trim();
    if (!source) {
        return [];
    }

    const parsed = JSON.parse(source);
    if (!Array.isArray(parsed)) {
        throw new Error("Lessons JSON must be an array.");
    }

    return parsed;
}

function createLessonRow(lesson = {}) {
    if (!lessonList) {
        return null;
    }

    const row = document.createElement("div");
    row.className = "lesson-row";
    row.dataset.lessonRow = "true";

    row.innerHTML = `
        <div class="lesson-row-header">
            <div>
                <p class="section-kicker">Lesson <span data-lesson-number></span></p>
                <h3>Lesson details</h3>
            </div>
            <button type="button" class="button button-secondary lesson-remove">Remove</button>
        </div>
        <div class="lesson-row-grid">
            <div class="field">
                <label>Lesson Title</label>
                <input name="lessonTitle" type="text" placeholder="Lesson title" required>
            </div>
            <div class="field">
                <label>Week / Session</label>
                <input name="lessonWeek" type="text" placeholder="Week 1, Session 2">
            </div>
            <div class="field">
                <label>Calendar Date</label>
                <input name="lessonDate" type="date">
            </div>
            <div class="field">
                <label>Duration Minutes</label>
                <input name="lessonDurationMinutes" type="number" min="1" step="1" value="60">
            </div>
            <div class="field">
                <label>Activity Type</label>
                <input name="lessonType" type="text" placeholder="Programming, Digital Media, ...">
            </div>
            <div class="field">
                <label>Card Colour</label>
                <select name="lessonCardColor">
                    <option>Rose</option>
                    <option>Violet</option>
                    <option>Azure</option>
                    <option>Amber</option>
                    <option>Teal</option>
                    <option>Slate</option>
                </select>
            </div>
            <div class="field field-wide">
                <label>Activity Name</label>
                <input name="activityName" type="text" placeholder="Card title for the Activity Library">
            </div>
            <div class="field">
                <label>Lesson Year Level</label>
                <input name="lessonYearLevel" type="text" placeholder="e.g. Year 9, Year 10 or Junior">
            </div>
            <div class="field">
                <label>Lesson Link</label>
                <input name="lessonLinkUrl" type="url" placeholder="https://... (optional)">
            </div>
            <div class="field field-wide">
                <label>Lesson Focus</label>
                <textarea name="lessonFocus" placeholder="What are students learning or doing?"></textarea>
            </div>
            <div class="field field-wide">
                <label>Lesson Notes</label>
                <textarea name="lessonNotes" placeholder="Teacher notes, resources, or setup reminders"></textarea>
            </div>
            <label class="checkbox-field lesson-toggle"><input name="publishActivity" type="checkbox"> Publish to Activity Library</label>
            <label class="checkbox-field lesson-toggle"><input name="addToCalendar" type="checkbox"> Add to Calendar</label>
        </div>
    `;

    const lessonTitle = row.querySelector('[name="lessonTitle"]');
    const lessonWeek = row.querySelector('[name="lessonWeek"]');
    const lessonDate = row.querySelector('[name="lessonDate"]');
    const lessonDurationMinutes = row.querySelector('[name="lessonDurationMinutes"]');
    const lessonType = row.querySelector('[name="lessonType"]');
    const lessonCardColor = row.querySelector('[name="lessonCardColor"]');
    const activityName = row.querySelector('[name="activityName"]');
    const lessonYearLevel = row.querySelector('[name="lessonYearLevel"]');
    const lessonLinkUrl = row.querySelector('[name="lessonLinkUrl"]');
    const lessonFocus = row.querySelector('[name="lessonFocus"]');
    const lessonNotes = row.querySelector('[name="lessonNotes"]');
    const publishActivity = row.querySelector('[name="publishActivity"]');
    const addToCalendar = row.querySelector('[name="addToCalendar"]');

    lessonTitle.value = String(lesson.lessonTitle || lesson.title || "").trim();
    lessonWeek.value = String(lesson.lessonWeek || lesson.week_label || lesson.week || "").trim();
    lessonDate.value = String(lesson.lessonDate || lesson.calendar_date || "").trim();
    lessonDurationMinutes.value = String(lesson.lessonDurationMinutes || lesson.duration_minutes || 60).trim();
    lessonType.value = String(lesson.lessonType || lesson.activity_type || "").trim();
    lessonCardColor.value = String(lesson.lessonCardColor || lesson.card_color || "Rose").trim() || "Rose";
    activityName.value = String(lesson.activityName || lesson.activity_name || "").trim();
    lessonYearLevel.value = String(lesson.lessonYearLevel || lesson.year_level || "").trim();
    lessonLinkUrl.value = String(lesson.lessonLinkUrl || lesson.link_url || lesson.resource_link || "").trim();
    lessonFocus.value = String(lesson.lessonFocus || lesson.focus || "").trim();
    lessonNotes.value = String(lesson.lessonNotes || lesson.notes || "").trim();
    publishActivity.checked = Boolean(lesson.publishActivity ?? lesson.publish_activity);
    addToCalendar.checked = Boolean(lesson.addToCalendar ?? lesson.add_to_calendar);

    row.querySelector(".lesson-remove").addEventListener("click", () => {
        row.remove();
        if (!lessonList.querySelector("[data-lesson-row]")) {
            lessonList.appendChild(createLessonRow());
        }
        renumberLessons();
    });

    return row;
}

function renumberLessons() {
    if (!lessonList) {
        return;
    }

    const rows = Array.from(lessonList.querySelectorAll("[data-lesson-row]"));
    rows.forEach((row, index) => {
        const number = row.querySelector("[data-lesson-number]");
        if (number) {
            number.textContent = String(index + 1);
        }
    });
}

function collectLessons() {
    if (!lessonList) {
        return [];
    }

    return Array.from(lessonList.querySelectorAll("[data-lesson-row]"))
        .map((row, index) => ({
            lesson_index: index + 1,
            lessonTitle: String(row.querySelector('[name="lessonTitle"]')?.value || "").trim(),
            lessonWeek: String(row.querySelector('[name="lessonWeek"]')?.value || "").trim(),
            lessonDate: String(row.querySelector('[name="lessonDate"]')?.value || "").trim(),
            lessonDurationMinutes: Number.parseInt(row.querySelector('[name="lessonDurationMinutes"]')?.value || "60", 10) || 60,
            lessonType: String(row.querySelector('[name="lessonType"]')?.value || "").trim(),
            lessonCardColor: String(row.querySelector('[name="lessonCardColor"]')?.value || "Rose").trim() || "Rose",
            activityName: String(row.querySelector('[name="activityName"]')?.value || "").trim(),
            lessonYearLevel: String(row.querySelector('[name="lessonYearLevel"]')?.value || "").trim(),
            lessonLinkUrl: String(row.querySelector('[name="lessonLinkUrl"]')?.value || "").trim(),
            lessonFocus: String(row.querySelector('[name="lessonFocus"]')?.value || "").trim(),
            lessonNotes: String(row.querySelector('[name="lessonNotes"]')?.value || "").trim(),
            publishActivity: Boolean(row.querySelector('[name="publishActivity"]')?.checked),
            addToCalendar: Boolean(row.querySelector('[name="addToCalendar"]')?.checked)
        }))
        .filter((lesson) => Boolean(lesson.lessonTitle || lesson.activityName || lesson.lessonFocus || lesson.lessonWeek || lesson.lessonDate || lesson.lessonYearLevel || lesson.lessonLinkUrl));
}

function populateManualPlannerFromUnitPlan(unitPlan) {
    if (!manualForm || !unitPlan) {
        return;
    }

    if (manualFields.title) manualFields.title.value = String(unitPlan.title || "");
    if (manualFields.topic) manualFields.topic.value = String(unitPlan.topic || "");
    if (manualFields.strand) manualFields.strand.value = String(unitPlan.strand || unitPlan.subject_stream || "");
    setSelectValues(manualFields.yearLevel, inferYearLevelSelections(unitPlan.year_level));
    if (manualFields.subjectStream) manualFields.subjectStream.value = String(unitPlan.subject_stream || "");
    if (manualFields.durationWeeks) manualFields.durationWeeks.value = Number.parseInt(unitPlan.duration_weeks, 10) || 1;
    if (manualFields.term) manualFields.term.value = String(unitPlan.term || "");
    if (manualFields.overview) manualFields.overview.value = String(unitPlan.overview || "");
    if (manualFields.unitAims) manualFields.unitAims.value = joinLines(unitPlan.unit_aims);
    setSchoolValueResponses(manualFields.unitValues, parseUnitValuesToResponses(unitPlan.unit_values));
    setContextResponses(manualFields.contexts, parseContextsToResponses(unitPlan.contexts));
    setCurriculumLinkResponses(manualFields.curriculumLinks, parseCurriculumLinksToResponses(unitPlan.curriculum_links));
    if (manualFields.assessmentLink) manualFields.assessmentLink.value = String(unitPlan.assessment_link || "");
    if (manualFields.notes) manualFields.notes.value = String(unitPlan.notes || "");

    if (lessonList) {
        lessonList.innerHTML = "";
        const lessons = Array.isArray(unitPlan.lessons) ? unitPlan.lessons : [];
        if (!lessons.length) {
            lessonList.appendChild(createLessonRow());
        } else {
            lessons.forEach((lesson) => {
                lessonList.appendChild(createLessonRow(lesson));
            });
        }
        renumberLessons();
    }
}

function resetManualLessons() {
    if (!lessonList) {
        return;
    }

    lessonList.innerHTML = "";
    lessonList.appendChild(createLessonRow());
    renumberLessons();
}

function showPreviewPanel(unitPlan, sourceLabel) {
    if (!previewPanel) {
        return;
    }

    const lessonCount = Array.isArray(unitPlan?.lessons) ? unitPlan.lessons.length : 0;
    if (previewSource) {
        previewSource.textContent = `Preview source: ${sourceLabel || "DOCX"} (${lessonCount} lesson${lessonCount === 1 ? "" : "s"} parsed)`;
    }

    if (previewFields.title) previewFields.title.value = String(unitPlan?.title || "");
    if (previewFields.topic) previewFields.topic.value = String(unitPlan?.topic || "");
    setSelectValues(previewFields.yearLevel, inferYearLevelSelections(unitPlan?.year_level));
    if (previewFields.subjectStream) previewFields.subjectStream.value = String(unitPlan?.subject_stream || "");
    if (previewFields.durationWeeks) previewFields.durationWeeks.value = Number.parseInt(unitPlan?.duration_weeks, 10) || 1;
    if (previewFields.term) previewFields.term.value = String(unitPlan?.term || "");
    if (previewFields.overview) previewFields.overview.value = String(unitPlan?.overview || "");
    
    if (previewFields.unitAims) {
        const aimsValue = joinLines(unitPlan?.unit_aims);
        previewFields.unitAims.value = aimsValue;
    }
    
    setSchoolValueResponses(previewFields.unitValues, parseUnitValuesToResponses(unitPlan?.unit_values));
    setContextResponses(previewFields.contexts, parseContextsToResponses(unitPlan?.contexts));
    setCurriculumLinkResponses(previewFields.curriculumLinks, parseCurriculumLinksToResponses(unitPlan?.curriculum_links));
    if (previewFields.assessmentLink) previewFields.assessmentLink.value = String(unitPlan?.assessment_link || "");
    if (previewFields.notes) previewFields.notes.value = String(unitPlan?.notes || "");
    if (previewFields.lessonsJson) previewFields.lessonsJson.value = JSON.stringify(Array.isArray(unitPlan?.lessons) ? unitPlan.lessons : [], null, 2);

    populateManualPlannerFromUnitPlan(unitPlan);
    previewPanel.hidden = false;
    autoResizeSchoolValueTextareas();
    autoResizeContextTextareas();
    autoResizeLocalCurriculumTextareas();
    autoResizeSkillsTextareas();
    autoResizeHealthSafetyTextarea();
}

function collectPreviewPayload() {
    return {
        title: String(previewFields.title?.value || "").trim(),
        topic: String(previewFields.topic?.value || "").trim(),
        year_level: normalizeYearLevelText(getSelectValues(previewFields.yearLevel)),
        subject_stream: String(previewFields.subjectStream?.value || "").trim().toUpperCase(),
        duration_weeks: Number.parseInt(previewFields.durationWeeks?.value || "1", 10) || 1,
        term: String(previewFields.term?.value || "").trim(),
        overview: String(previewFields.overview?.value || "").trim(),
        unit_aims: normalizeLines(previewFields.unitAims?.value || ""),
        unit_values: schoolValueResponsesToUnitValues(getSchoolValueResponses(previewFields.unitValues)),
        contexts: contextResponsesToArray(getContextResponses(previewFields.contexts)),
        curriculum_links: curriculumResponsesToLines(getCurriculumLinkResponses(previewFields.curriculumLinks)),
        assessment_link: String(previewFields.assessmentLink?.value || "").trim(),
        notes: String(previewFields.notes?.value || "").trim(),
        lessons: parseLessonsJson(previewFields.lessonsJson?.value || "[]")
    };
}

function collectManualPayload() {
    return {
        title: String(manualFields.title?.value || "").trim(),
        topic: String(manualFields.topic?.value || "").trim(),
        strand: String(manualFields.strand?.value || "").trim(),
        year_level: normalizeYearLevelText(getSelectValues(manualFields.yearLevel)),
        subject_stream: String(manualFields.subjectStream?.value || "").trim().toUpperCase(),
        duration_weeks: Number.parseInt(manualFields.durationWeeks?.value || "1", 10) || 1,
        term: String(manualFields.term?.value || "").trim(),
        overview: String(manualFields.overview?.value || "").trim(),
        unit_aims: normalizeLines(manualFields.unitAims?.value || ""),
        unit_values: schoolValueResponsesToUnitValues(getSchoolValueResponses(manualFields.unitValues)),
        contexts: contextResponsesToArray(getContextResponses(manualFields.contexts)),
        curriculum_links: curriculumResponsesToLines(getCurriculumLinkResponses(manualFields.curriculumLinks)),
        assessment_link: String(manualFields.assessmentLink?.value || "").trim(),
        notes: String(manualFields.notes?.value || "").trim(),
        lessons: collectLessons(),
        created_by_email: getSignedInEmail(),
        created_at: new Date().toISOString()
    };
}

function renderAuthStatus() {
    if (!authStatusElement) {
        return;
    }

    const email = getSignedInEmail();
    if (email) {
        authStatusElement.classList.remove("is-missing");
        authStatusElement.textContent = `Signed in as ${email}`;
        return;
    }

    authStatusElement.classList.add("is-missing");
    authStatusElement.textContent = "Not signed in. Sign in with your school Google account before importing a unit plan.";
}

async function previewFromFile() {
    if (!uploadInput?.files?.length) {
        setStatus("Choose a .docx file before previewing.", true);
        return;
    }

    const file = uploadInput.files[0];
    if (!file) {
        setStatus("Choose a .docx file before previewing.", true);
        return;
    }

    const payload = new FormData();
    payload.append("unitPlanFile", file);

    try {
        setActionButtonsDisabled(true);
        setStatus("Parsing DOCX for preview...");

        const response = await fetch("/api/unit-plans/preview-docx", {
            method: "POST",
            headers: withUserEmailHeader(),
            body: payload
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            hasReadyFilePreview = false;
            throw new Error(result.error || `Could not preview document (HTTP ${response.status})`);
        }

        hasReadyFilePreview = true;
        showPreviewPanel(result.unitPlan || {}, result.source || file.name);
        setStatus("Preview loaded. Review it, then click Import Unit Plan.");
    } catch (error) {
        hasReadyFilePreview = false;
        setStatus(`Preview failed: ${error.message}`, true);
    } finally {
        setActionButtonsDisabled(false);
    }
}

async function previewFromTemplate() {
    try {
        setActionButtonsDisabled(true);
        setStatus("Parsing TeacherFiles template for preview...");

        const response = await fetch("/api/unit-plans/preview-docx-template", {
            method: "POST",
            headers: withUserEmailHeader({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({})
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `Could not preview template (HTTP ${response.status})`);
        }

        showPreviewPanel(result.unitPlan || {}, result.source || "TeacherFiles template");
        setStatus("Template preview loaded. Review it, then click Import Unit Plan.");
    } catch (error) {
        setStatus(`Template preview failed: ${error.message}`, true);
    } finally {
        setActionButtonsDisabled(false);
    }
}

async function importTeacherTemplateDocx() {
    try {
        setActionButtonsDisabled(true);
        setStatus("Importing unit plan from TeacherFiles template...");

        const response = await fetch("/api/unit-plans/import-docx-template", {
            method: "POST",
            headers: withUserEmailHeader({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({})
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `Could not import template (HTTP ${response.status})`);
        }

        const lessonCount = Number(result.lessonCount || 0);
        const activityCount = Number(result.createdActivities || 0);
        const calendarCount = Number(result.createdCalendarEvents || 0);

        setStatus(`Imported ${result.unitPlan?.title || "unit plan"} from ${result.source || "TeacherFiles template"}. Saved ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}, created ${activityCount} activity card${activityCount === 1 ? "" : "s"}${calendarCount ? `, and ${calendarCount} calendar event${calendarCount === 1 ? "" : "s"}` : ""}.`);
        if (uploadInput) {
            uploadInput.value = "";
        }
    } catch (error) {
        setStatus(`Template import failed: ${error.message}`, true);
    } finally {
        setActionButtonsDisabled(false);
    }
}

async function saveFromPreview(event) {
    event.preventDefault();

    let payload = null;
    try {
        payload = collectPreviewPayload();
    } catch (error) {
        setStatus(`Cannot save preview: ${error.message}`, true);
        return;
    }

    if (!payload.title || !payload.topic || !payload.year_level) {
        setStatus("Preview must include title, topic, and year level before saving.", true);
        return;
    }

    try {
        setActionButtonsDisabled(true);
        setStatus("Saving previewed unit plan...");

        const response = await fetch("/api/unit-plans", {
            method: "POST",
            headers: withUserEmailHeader({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `Could not save unit plan (HTTP ${response.status})`);
        }

        const lessonCount = Array.isArray(result?.lessons) ? result.lessons.length : 0;
        setStatus(`Saved ${result.title || "unit plan"} from preview with ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}.`);
    } catch (error) {
        setStatus(`Save from preview failed: ${error.message}`, true);
    } finally {
        setActionButtonsDisabled(false);
    }
}

async function saveManualUnitPlan(event) {
    event.preventDefault();

    const payload = collectManualPayload();
    if (!payload.title || !payload.topic || !payload.year_level) {
        setStatus("Manual planner requires title, topic, and year level.", true);
        return;
    }

    try {
        setActionButtonsDisabled(true);
        setStatus("Saving manual unit plan...");

        const response = await fetch("/api/unit-plans", {
            method: "POST",
            headers: withUserEmailHeader({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || `Could not save manual unit plan (HTTP ${response.status})`);
        }

        const lessonCount = Array.isArray(result?.lessons) ? result.lessons.length : payload.lessons.length;
        setStatus(`Saved manual unit plan ${result.title || payload.title} with ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}.`);

        manualForm?.reset();
        resetManualLessons();
    } catch (error) {
        setStatus(`Manual save failed: ${error.message}`, true);
    } finally {
        setActionButtonsDisabled(false);
    }
}

if (clearButton) {
    clearButton.addEventListener("click", () => {
        if (uploadInput) {
            uploadInput.value = "";
        }
        resetFilePreviewState();
        manualForm?.reset();
        resetManualLessons();
        setStatus("File cleared.");
    });
}

if (uploadInput) {
    uploadInput.addEventListener("change", () => {
        resetFilePreviewState();
        if (uploadInput.files?.length) {
            previewFromFile();
        }
    });
}

if (addLessonButton) {
    addLessonButton.addEventListener("click", () => {
        if (!lessonList) {
            return;
        }
        lessonList.appendChild(createLessonRow());
        renumberLessons();
    });
}

if (clearManualFormButton) {
    clearManualFormButton.addEventListener("click", () => {
        manualForm?.reset();
        autoResizeSchoolValueTextareas();
        autoResizeContextTextareas();
        autoResizeLocalCurriculumTextareas();
        autoResizeSkillsTextareas();
        autoResizeHealthSafetyTextarea();
        resetManualLessons();
        setStatus("Manual unit planner cleared.");
    });
}

if (cancelManualUploadButton) {
    cancelManualUploadButton.addEventListener("click", () => {
        window.location.href = "upload-menu.html";
    });
}

if (importTemplateButton) {
    importTemplateButton.addEventListener("click", () => {
        importTeacherTemplateDocx();
    });
}

if (previewFileButton) {
    previewFileButton.addEventListener("click", () => {
        previewFromFile();
    });
}

if (previewTemplateButton) {
    previewTemplateButton.addEventListener("click", () => {
        previewFromTemplate();
    });
}

if (previewForm) {
    previewForm.addEventListener("submit", saveFromPreview);
}

if (manualForm) {
    manualForm.addEventListener("submit", saveManualUnitPlan);
}

if (uploadForm) {
    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!hasReadyFilePreview) {
            setStatus("Preview the selected file first, then import.", true);
            return;
        }

        if (!uploadInput?.files?.length) {
            setStatus("Choose a .docx file before importing.", true);
            return;
        }

        const file = uploadInput.files[0];
        if (!file) {
            setStatus("Choose a .docx file before importing.", true);
            return;
        }

        const payload = new FormData();
        payload.append("unitPlanFile", file);

        try {
            setActionButtonsDisabled(true);
            setStatus("Importing unit plan from document...");

            const response = await fetch("/api/unit-plans/import-docx", {
                method: "POST",
                headers: withUserEmailHeader(),
                body: payload
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || `Could not import unit plan (HTTP ${response.status})`);
            }

            const lessonCount = Number(result.lessonCount || 0);
            const activityCount = Number(result.createdActivities || 0);
            const calendarCount = Number(result.createdCalendarEvents || 0);

            setStatus(`Imported ${result.unitPlan?.title || "unit plan"}. Saved ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}, created ${activityCount} activity card${activityCount === 1 ? "" : "s"}${calendarCount ? `, and ${calendarCount} calendar event${calendarCount === 1 ? "" : "s"}` : ""}.`);
            uploadInput.value = "";
            resetFilePreviewState();
        } catch (error) {
            setStatus(`Import failed: ${error.message}`, true);
        } finally {
            setActionButtonsDisabled(false);
        }
    });
}

renderAuthStatus();
resetManualLessons();
autoResizeSchoolValueTextareas();
autoResizeContextTextareas();
autoResizeLocalCurriculumTextareas();
autoResizeSkillsTextareas();
autoResizeHealthSafetyTextarea();

// Achievement Objectives Data
const ACHIEVEMENT_OBJECTIVES = {
    4: [
        {
            title: "Planning for practice",
            content: "Undertake planning that includes reviewing the effectiveness of past actions and resourcing, exploring implications for future actions and resource allocation, and considering stakeholder feedback to enable the development of an outcome."
        },
        {
            title: "Outcome development and evaluation",
            content: "Investigate a context to develop ideas for feasible outcomes. Undertake functional modelling that takes account of stakeholder feedback to select and create the outcome that best addresses the key attributes. Incorporating stakeholder feedback, evaluate the outcome's fitness for purpose in terms of how well it addresses the need or opportunity."
        }
    ],
    5: [
        {
            title: "Planning for practice",
            content: "Analyse their own and others' planning practices to inform the selection and use of planning tools. Use these to support and justify planning decisions (including those related to resource management) that will lead to the development of an outcome through to completion."
        },
        {
            title: "Outcome development and evaluation",
            content: "Analyse their own and others' outcomes to inform the development of ideas for feasible outcomes. Undertake ongoing functional modelling and evaluation that takes account of key stakeholder feedback and trialling in the physical and social environments. Use the information gained to select and develop the outcome that best addresses the specifications."
        }
    ],
    6: [
        {
            title: "Planning for practice",
            content: "Critically analyse their own and other's past and current planning practices to make an informed selection and effective use of planning tools. Use these to support and justify ongoing planning that will lead to the development of an outcome through to its completion."
        },
        {
            title: "Outcome development and evaluation",
            content: "Critically analyse their own and others' outcomes to inform the development of ideas for feasible outcomes. Undertake ongoing experimentation and functional modelling, taking account of stakeholder feedback and trialling in the physical and social environments. Use the information gained to select, justify, and develop an outcome."
        }
    ],
    7: [
        {
            title: "Advanced technological practice",
            content: "Apply advanced technological knowledge and practices in complex contexts. Analyse design challenges and develop sophisticated solutions that demonstrate sustained engagement with technological systems and processes."
        },
        {
            title: "Strategic outcome development",
            content: "Develop strategic outcomes that integrate complex technological knowledge. Critically evaluate processes and solutions against sophisticated criteria, demonstrating sustained evidence-based decision making."
        }
    ],
    8: [
        {
            title: "Expert technological application",
            content: "Demonstrate expert-level technological knowledge and sophisticated design practices. Synthesise complex information and develop innovative solutions to multifaceted technological challenges within professional contexts."
        },
        {
            title: "Professional evaluation and innovation",
            content: "Develop outcomes of professional quality that demonstrate comprehensive technological understanding. Conduct rigorous evaluation using advanced criteria, contributing innovative solutions that advance the field."
        }
    ]
};

// Initialize achievement objectives sliders
function initializeAchievementSliders() {
    // Manual form slider
    const manualSlider = document.querySelector("#manual-achievement-slider");
    const manualDisplay = document.querySelector("#manual-achievement-level-display");
    const manualObjectives = document.querySelector("#manual-achievement-objectives");
    const manualLevelInput = document.querySelector("#manual-selected-achievement-level");

    if (manualSlider) {
        manualSlider.addEventListener("input", function() {
            const level = parseInt(this.value);
            manualDisplay.textContent = `Level ${level}`;
            manualLevelInput.value = level;
            renderAchievementObjectives(manualObjectives, level);
        });
        // Initialize display
        renderAchievementObjectives(manualObjectives, 4);
    }

    // Preview form slider
    const previewSlider = document.querySelector("#preview-achievement-slider");
    const previewDisplay = document.querySelector("#preview-achievement-level-display");
    const previewObjectives = document.querySelector("#preview-achievement-objectives");
    const previewLevelInput = document.querySelector("#preview-selected-achievement-level");

    if (previewSlider) {
        previewSlider.addEventListener("input", function() {
            const level = parseInt(this.value);
            previewDisplay.textContent = `Level ${level}`;
            previewLevelInput.value = level;
            renderAchievementObjectives(previewObjectives, level);
        });
        // Initialize display
        renderAchievementObjectives(previewObjectives, 4);
    }
}

function renderAchievementObjectives(container, level) {
    if (!container || !ACHIEVEMENT_OBJECTIVES[level]) {
        return;
    }

    container.innerHTML = "";
    const objectives = ACHIEVEMENT_OBJECTIVES[level];

    objectives.forEach((objective) => {
        const objectiveDiv = document.createElement("div");
        objectiveDiv.className = "achievement-objective";

        const titleP = document.createElement("p");
        titleP.className = "achievement-objective-title";
        titleP.textContent = objective.title;

        const contentP = document.createElement("p");
        contentP.className = "achievement-objective-content";
        contentP.textContent = objective.content;

        objectiveDiv.appendChild(titleP);
        objectiveDiv.appendChild(contentP);
        container.appendChild(objectiveDiv);
    });
}

// Initialize on DOM ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAchievementSliders);
} else {
    initializeAchievementSliders();
}