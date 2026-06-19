// Version of the parse pipeline (prompts + model chain). Stamped onto a job
// when its result is produced, and matched on cache lookup so the result cache
// only serves results from the current pipeline. Bump this whenever a change
// could alter parse output (new model, changed prompt) to invalidate the cache.
export const PARSER_VERSION = "2";
