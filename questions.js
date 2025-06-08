// questions.js - Main Data Aggregator (Corrected for consistent _ptX_ handling)

window.allQuestions = [];
window.allCorrectAnswers = {}; // This will store answers for both original and generated
const MAX_PARTS_PER_TOPIC = 12; // Increased to match index.html, adjust as needed

// No longer using addOriginalType as files from Gemini should have the 'type' field

/**
 * Loads questions and answers for a specific topic, board, and year,
 * checking for multiple part files.
 * Assumes files have been processed by Gemini and contain 'type' field.
 * Variable names are expected to include '_data_ptX_'.
 * @param {string} topicAbbr - The abbreviation for the topic (e.g., "EMQP", "PARTICLES").
 * @param {string} board - The exam board (e.g., "AQA").
 * @param {string} year - The specification year (e.g., "2016").
 * @param {number} maxParts - The maximum number of parts to check for (e.g., 12).
 */
function loadTopicWithParts(topicAbbr, board, year, maxParts) {
    const spec = `${board}_${year.slice(-2)}`; // e.g., AQA_16
    let questionsLoadedForThisTopicSet = 0;
    let errorsEncountered = false;

    for (let i = 1; i <= maxParts; i++) {
        const partSuffix = `_pt${i}`;
        const partVarQ = `questions_data${partSuffix}_${topicAbbr}_${spec}`; // e.g., questions_data_pt1_EMQP_AQA_16
        const partVarA = `correct_answers_data${partSuffix}_${topicAbbr}_${spec}`; // e.g., correct_answers_data_pt1_EMQP_AQA_16
        const partFileName = `questions_${topicAbbr}_${spec}${partSuffix}.js`; // For logging reference

        if (typeof window[partVarQ] !== 'undefined' && typeof window[partVarA] !== 'undefined') {
            try {
                const questionsFromFile = window[partVarQ]; // Already contains 'type' if processed by Gemini
                window.allQuestions = window.allQuestions.concat(questionsFromFile);
                Object.assign(window.allCorrectAnswers, window[partVarA]);
                console.log(`[Aggregator] Loaded ${questionsFromFile.length} question objects from ${topicAbbr} ${board} ${year} (Part ${i} via ${partVarQ}).`);
                questionsLoadedForThisTopicSet += questionsFromFile.length;
            } catch (e) {
                const errorMsg = `[Aggregator] Error processing ${topicAbbr} ${board} ${year} (Part ${i} - ${partVarQ}): ${e.message}`;
                console.error(errorMsg);
                errorsEncountered = true;
            }
        } else {
            // Only log detailed "not found" for the first part if it's missing, 
            // otherwise, it's expected that not all parts up to maxParts will exist.
            if (i === 1 && (typeof window[partVarQ] === 'undefined' || typeof window[partVarA] === 'undefined')) {
                 console.warn(`[Aggregator] Data for ${topicAbbr} ${board} ${year} (Part 1 - variables ${partVarQ} or ${partVarA}) not found. Ensure '${partFileName}' is loaded and variables are correct.`);
            } else if (typeof window[partVarQ] !== 'undefined' && typeof window[partVarA] === 'undefined'){
                 console.warn(`[Aggregator] Questions variable ${partVarQ} found, but answers variable ${partVarA} not found for ${partFileName}.`);
                 errorsEncountered = true;
            } else if (typeof window[partVarQ] === 'undefined' && typeof window[partVarA] !== 'undefined'){
                 console.warn(`[Aggregator] Answers variable ${partVarA} found, but questions variable ${partVarQ} not found for ${partFileName}.`);
                 errorsEncountered = true;
            }
        }
    }

    if (questionsLoadedForThisTopicSet === 0 && errorsEncountered) {
        console.error(`[Aggregator] CRITICAL FAILURE for ${topicAbbr} ${board} ${year}: No questions loaded despite some files/variables potentially being found but having errors. Check logs above.`);
    } else if (questionsLoadedForThisTopicSet === 0) {
         console.warn(`[Aggregator] WARNING: No questions were loaded for ANY part of ${topicAbbr} ${board} ${year}. This could be because the corresponding .js files (e.g., questions_${topicAbbr}_${spec}_pt1.js, etc.) were not found, are empty, or the variable names within them do not match expectations (e.g., questions_data_pt1_${topicAbbr}_${spec}, etc.).`);
    }
}

// --- Ensure topicsByCategory is defined globally ---
if (typeof window.topicsByCategory === "undefined") {
    window.topicsByCategory = {};
}
const topicsByCategory = window.topicsByCategory;

// --- Load All Defined Question Sets ---
loadTopicWithParts("EMQP", "AQA", "2016", MAX_PARTS_PER_TOPIC);
loadTopicWithParts("PARTICLES", "AQA", "2016", MAX_PARTS_PER_TOPIC);
loadTopicWithParts("MECHANICS", "AQA", "2008", MAX_PARTS_PER_TOPIC);
// Add more calls to loadTopicWithParts here for other topics.

// --- Final Sanity Checks and Logging ---
allQuestions.forEach(q => {
    if (!q.type) {
        // If data comes straight from your new scraper (before Gemini), it won't have 'type'.
        // The Gemini step should add 'type: "original"' to these and 'type: "generated_similar"' to new ones.
        // For now, if type is missing, we'll assume it's an original question from the scraper.
        q.type = "original"; 
        // console.warn(`[Aggregator Validation] Question ID "${q.id}" is missing 'type' field. Defaulting to 'original'. This is expected for raw scraper output.`);
    }
    if (q.topic && typeof q.topic === 'string') {
        let topicFoundInCategory = false;
        const upperCaseTopic = q.topic.toUpperCase();
        for (const category in topicsByCategory) {
            if (topicsByCategory[category].includes(upperCaseTopic)) {
                topicFoundInCategory = true;
                break;
            }
        }
        if (!topicFoundInCategory) {
            console.warn(`[Aggregator Validation] Topic "${q.topic}" (from question ID "${q.id}") not found in topicsByCategory. Check consistency. Normalized to "${upperCaseTopic}".`);
        }
    } else if (q.id) {
        console.warn(`[Aggregator Validation] Question ID "${q.id}" is missing a topic or topic is not a string.`);
    }
});

console.log(`[Aggregator] FINAL: Total question objects loaded into allQuestions: ${allQuestions.length}`);
console.log(`[Aggregator] FINAL: Total unique answer keys in allCorrectAnswers: ${Object.keys(allCorrectAnswers).length}`);

if (allQuestions.length === 0) {
    let criticalErrorMsg = "[Aggregator] CRITICAL OVERALL: No questions were loaded into allQuestions. ";
    if (Object.keys(allCorrectAnswers).length > 0) {
        criticalErrorMsg += "However, some answers were loaded. This points to an issue with the question arrays (e.g., `questions_data_ptX_...`) in your .js files or the aggregation logic. ";
    } else {
        criticalErrorMsg += "No answers were loaded either. This usually means that either the <script> tags in index.html are incorrect (pointing to non-existent files, or files with wrong names/paths), OR the variable names inside your .js data files do not match what this aggregator script (questions.js) expects (e.g., 'questions_data_pt1_EMQP_AQA_16'). ";
    }
    criticalErrorMsg += "Please check the console for 404 errors (file not found) and the specific warnings/errors from the loadTopicWithParts function calls above.";
    console.error(criticalErrorMsg);
} else if (Object.keys(allCorrectAnswers).length === 0 && allQuestions.length > 0) { // Modified condition
     console.error("[Aggregator] CRITICAL: allCorrectAnswers object is empty, but questions were loaded. This indicates a serious issue with the answer data objects (e.g., `correct_answers_data_ptX_...`) in your .js files or the aggregation logic. Check previous logs from `loadTopicWithParts`.");
}


const questionIds = allQuestions.map(q => q.id);
const uniqueQuestionIds = new Set(questionIds);
if (questionIds.length !== uniqueQuestionIds.size) {
    console.warn(`[Aggregator Validation] Duplicate question IDs found! Total: ${questionIds.length}, Unique: ${uniqueQuestionIds.size}. This can lead to unexpected behavior.`);
    const idCounts = {};
    questionIds.forEach(id => { idCounts[id] = (idCounts[id] || 0) + 1; });
    const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);
    console.warn("[Aggregator Validation] Duplicate IDs are:", duplicates.map(([id, count]) => `${id} (x${count})`).join(', '));
}