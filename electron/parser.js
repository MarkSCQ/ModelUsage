"use strict";
/**
 * Session Parser - Core calculation methods based on CodMate
 * https://github.com/loocor/codmate
 *
 * Data locations (from CodMate):
 * - Claude sessions: ~/.claude/projects/
 * - Codex sessions: ~/.codex/sessions/
 * - Gemini sessions: ~/.gemini/tmp/
 *
 * Uses SQLite for persistent caching with incremental updates
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.SessionParser = exports.PRICING = exports.SESSION_DIRS = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const readline = __importStar(require("readline"));
const database_1 = require("./database");
Object.defineProperty(exports, "closeDatabase", { enumerable: true, get: function () { return database_1.closeDatabase; } });
// Session directories (following CodMate's conventions)
exports.SESSION_DIRS = {
    claude: path.join(os.homedir(), '.claude', 'projects'),
    codex: path.join(os.homedir(), '.codex', 'sessions'),
    gemini: path.join(os.homedir(), '.gemini', 'tmp'),
};
// Model pricing per 1M tokens (USD)
exports.PRICING = {
    // Claude models
    'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-5-sonnet-20240620': { input: 3.0, output: 15.0 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
    // GPT models
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    o1: { input: 15.0, output: 60.0 },
    'o1-mini': { input: 1.1, output: 4.4 },
    'o3-mini': { input: 1.1, output: 4.4 },
    // Gemini models
    'gemini-2.0-flash': { input: 0.1, output: 0.4 },
    'gemini-1.5-pro': { input: 1.25, output: 5.0 },
    'gemini-1.5-flash': { input: 0.075, output: 0.3 },
    // Default
    default: { input: 3.0, output: 15.0 },
};
class SessionParser {
    constructor() {
        this.cache = new Map();
        this.db = null;
        this.lastSyncTime = 0;
        this.syncInterval = 5000; // 5 seconds minimum between syncs
        this.dbInitPromise = null;
        // Initialize database asynchronously
        this.dbInitPromise = this.initDb();
    }
    async initDb() {
        this.db = await (0, database_1.getDatabase)();
    }
    async ensureDb() {
        if (this.dbInitPromise) {
            await this.dbInitPromise;
            this.dbInitPromise = null;
        }
        if (!this.db) {
            this.db = await (0, database_1.getDatabase)();
        }
        return this.db;
    }
    clearCache() {
        this.cache.clear();
    }
    /**
     * Get database statistics
     */
    async getDbStats() {
        const db = await this.ensureDb();
        return db.getStats();
    }
    /**
     * Get pricing for a model
     */
    getModelPricing(model) {
        if (!model)
            return exports.PRICING['default'];
        // Try exact match
        if (exports.PRICING[model])
            return exports.PRICING[model];
        // Try prefix match
        for (const key of Object.keys(exports.PRICING)) {
            if (model.startsWith(key) || model.includes(key)) {
                return exports.PRICING[key];
            }
        }
        // Determine by model family
        if (model.includes('opus'))
            return exports.PRICING['claude-3-opus-20240229'];
        if (model.includes('sonnet'))
            return exports.PRICING['claude-3-5-sonnet-20241022'];
        if (model.includes('haiku'))
            return exports.PRICING['claude-3-haiku-20240307'];
        if (model.includes('gpt-4o-mini'))
            return exports.PRICING['gpt-4o-mini'];
        if (model.includes('gpt-4o'))
            return exports.PRICING['gpt-4o'];
        if (model.includes('gemini'))
            return exports.PRICING['gemini-2.0-flash'];
        return exports.PRICING['default'];
    }
    /**
     * Calculate cost for token usage
     */
    calculateCost(inputTokens, outputTokens, model) {
        const pricing = this.getModelPricing(model);
        const inputCost = (inputTokens / 1000000) * pricing.input;
        const outputCost = (outputTokens / 1000000) * pricing.output;
        return inputCost + outputCost;
    }
    /**
     * Find all session files in a directory
     */
    async findSessionFiles(baseDir, extensions = ['.jsonl', '.json']) {
        const files = [];
        if (!fs.existsSync(baseDir)) {
            return files;
        }
        const walk = (dir) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        walk(fullPath);
                    }
                    else if (extensions.some((ext) => entry.name.endsWith(ext))) {
                        files.push(fullPath);
                    }
                }
            }
            catch {
                // Ignore permission errors
            }
        };
        walk(baseDir);
        return files.sort((a, b) => {
            try {
                return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
            }
            catch {
                return 0;
            }
        });
    }
    /**
     * Extract project name from Claude session path
     * Path format: ~/.claude/projects/{encoded-project-path}/{session-id}.jsonl
     * Encoded path format: -home-user-path-to-project -> /home/user/path/to/project
     */
    extractClaudeProjectName(filePath, baseDir) {
        const relativePath = path.relative(baseDir, filePath);
        const parts = relativePath.split(path.sep);
        // First part should be project name (encoded)
        if (parts.length > 0) {
            const encoded = parts[0];
            // Handle encoded path format like -home-qinsc-trees-project
            if (encoded.startsWith('-')) {
                // Convert -home-qinsc-trees-project to /home/qinsc/trees/project
                const decoded = encoded.replace(/^-/, '/').replace(/-/g, '/');
                // Get the last meaningful part as project name
                const decodedParts = decoded.split('/').filter(p => p);
                // Return last 2 parts to give more context (e.g., "trees/project" instead of just "project")
                if (decodedParts.length >= 2) {
                    return decodedParts.slice(-2).join('/');
                }
                return decodedParts[decodedParts.length - 1] || encoded;
            }
            return encoded;
        }
        return 'Unknown';
    }
    /**
     * Extract project name from a path (cwd)
     * Returns the last 2 parts of the path for better context
     */
    extractProjectFromPath(cwdPath) {
        const parts = cwdPath.split(path.sep).filter(p => p);
        if (parts.length >= 2) {
            return parts.slice(-2).join('/');
        }
        return parts[parts.length - 1] || 'Unknown';
    }
    /**
     * Parse a Claude Code JSONL session file
     */
    async parseClaudeSession(filePath) {
        const projectName = this.extractClaudeProjectName(filePath, exports.SESSION_DIRS.claude);
        const stats = {
            path: filePath,
            provider: 'claude',
            sessionId: path.basename(path.dirname(filePath)),
            project: projectName,
            messages: 0,
            userMessages: 0,
            assistantMessages: 0,
            toolUses: 0,
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
            costUsd: 0,
            model: null,
            firstMessage: null,
            lastMessage: null,
            duration: 0,
        };
        try {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity,
            });
            for await (const line of rl) {
                if (!line.trim())
                    continue;
                try {
                    const event = JSON.parse(line);
                    stats.messages++;
                    // Track message types
                    const eventType = event.type || '';
                    const messageRole = event.message?.role || event.role || '';
                    if (eventType === 'user' || messageRole === 'user')
                        stats.userMessages++;
                    else if (eventType === 'assistant' || messageRole === 'assistant')
                        stats.assistantMessages++;
                    // Track tool usage
                    if (event.type === 'tool_use' ||
                        event.tool_use ||
                        (event.message?.content &&
                            Array.isArray(event.message.content) &&
                            event.message.content.some((c) => c.type === 'tool_use'))) {
                        stats.toolUses++;
                    }
                    // Extract token usage
                    const usage = event.message?.usage || event.usage || {};
                    if (usage.input_tokens)
                        stats.inputTokens += usage.input_tokens;
                    if (usage.output_tokens)
                        stats.outputTokens += usage.output_tokens;
                    if (usage.cache_read_input_tokens)
                        stats.cacheReadTokens += usage.cache_read_input_tokens;
                    if (usage.cache_creation_input_tokens)
                        stats.cacheCreationTokens += usage.cache_creation_input_tokens;
                    // Track cost if available
                    if (event.costUsd)
                        stats.costUsd += event.costUsd;
                    // Track timestamps
                    const timestamp = event.timestamp || event.ts;
                    if (timestamp) {
                        if (!stats.firstMessage)
                            stats.firstMessage = timestamp;
                        stats.lastMessage = timestamp;
                    }
                    // Track model
                    const model = event.message?.model || event.model;
                    if (model)
                        stats.model = model;
                }
                catch {
                    // Skip invalid JSON lines
                }
            }
            // Calculate cost if not provided
            if (stats.costUsd === 0 && (stats.inputTokens > 0 || stats.outputTokens > 0)) {
                stats.costUsd = this.calculateCost(stats.inputTokens, stats.outputTokens, stats.model);
            }
            // Calculate duration
            if (stats.firstMessage && stats.lastMessage) {
                const start = new Date(stats.firstMessage).getTime();
                const end = new Date(stats.lastMessage).getTime();
                stats.duration = Math.max(0, end - start);
            }
        }
        catch (e) {
            console.error(`Error parsing ${filePath}:`, e.message);
        }
        return stats;
    }
    /**
     * Parse a Codex session file
     */
    async parseCodexSession(filePath) {
        const stats = {
            path: filePath,
            provider: 'codex',
            sessionId: path.basename(filePath, path.extname(filePath)),
            project: undefined,
            messages: 0,
            userMessages: 0,
            assistantMessages: 0,
            toolUses: 0,
            inputTokens: 0,
            outputTokens: 0,
            costUsd: 0,
            model: null,
            firstMessage: null,
            lastMessage: null,
            duration: 0,
        };
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (filePath.endsWith('.jsonl')) {
                const lines = content.split('\n').filter((l) => l.trim());
                let lastTotalInput = 0;
                let lastTotalOutput = 0;
                for (const line of lines) {
                    try {
                        const event = JSON.parse(line);
                        stats.messages++;
                        // Extract project from session_meta cwd
                        if (event.type === 'session_meta' && event.payload?.cwd) {
                            stats.project = this.extractProjectFromPath(event.payload.cwd);
                        }
                        // Check message role from response_item payload
                        const payload = event.payload;
                        if (payload?.type === 'message') {
                            if (payload.role === 'user')
                                stats.userMessages++;
                            else if (payload.role === 'assistant')
                                stats.assistantMessages++;
                        }
                        // Check for event_msg types
                        if (event.type === 'event_msg' && payload) {
                            if (payload.type === 'user_message')
                                stats.userMessages++;
                            else if (payload.type === 'agent_message')
                                stats.assistantMessages++;
                            // Token usage from token_count event
                            if (payload.type === 'token_count' && payload.info?.total_token_usage) {
                                const usage = payload.info.total_token_usage;
                                // total_token_usage is cumulative, so we track the latest
                                lastTotalInput = usage.input_tokens || 0;
                                lastTotalOutput = usage.output_tokens || 0;
                            }
                        }
                        // Model from turn_context
                        if (event.type === 'turn_context' && payload?.model) {
                            stats.model = payload.model;
                        }
                        const ts = event.timestamp || event.created_at;
                        if (ts) {
                            if (!stats.firstMessage)
                                stats.firstMessage = ts;
                            stats.lastMessage = ts;
                        }
                    }
                    catch {
                        // Skip invalid lines
                    }
                }
                // Use the final cumulative token counts
                stats.inputTokens = lastTotalInput;
                stats.outputTokens = lastTotalOutput;
            }
            else {
                const data = JSON.parse(content);
                if (Array.isArray(data)) {
                    stats.messages = data.length;
                    for (const msg of data) {
                        if (msg.role === 'user')
                            stats.userMessages++;
                        else if (msg.role === 'assistant')
                            stats.assistantMessages++;
                    }
                }
            }
            if (stats.inputTokens > 0 || stats.outputTokens > 0) {
                stats.costUsd = this.calculateCost(stats.inputTokens, stats.outputTokens, stats.model);
            }
        }
        catch (e) {
            console.error(`Error parsing ${filePath}:`, e.message);
        }
        return stats;
    }
    /**
     * Parse a Gemini session file
     */
    async parseGeminiSession(filePath) {
        const stats = {
            path: filePath,
            provider: 'gemini',
            sessionId: path.basename(filePath, path.extname(filePath)),
            messages: 0,
            userMessages: 0,
            assistantMessages: 0,
            inputTokens: 0,
            outputTokens: 0,
            costUsd: 0,
            model: 'gemini-2.0-flash',
            firstMessage: null,
            lastMessage: null,
            duration: 0,
        };
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').filter((l) => l.trim());
            for (const line of lines) {
                try {
                    const event = JSON.parse(line);
                    stats.messages++;
                    if (event.role === 'user')
                        stats.userMessages++;
                    else if (event.role === 'model')
                        stats.assistantMessages++;
                    if (event.usageMetadata) {
                        stats.inputTokens += event.usageMetadata.promptTokenCount || 0;
                        stats.outputTokens += event.usageMetadata.candidatesTokenCount || 0;
                    }
                    if (event.model)
                        stats.model = event.model;
                }
                catch {
                    // Skip invalid lines
                }
            }
            if (stats.inputTokens > 0 || stats.outputTokens > 0) {
                stats.costUsd = this.calculateCost(stats.inputTokens, stats.outputTokens, stats.model);
            }
        }
        catch (e) {
            console.error(`Error parsing ${filePath}:`, e.message);
        }
        return stats;
    }
    /**
     * Sync sessions from files to database (incremental update)
     */
    async syncProvider(provider) {
        const db = await this.ensureDb();
        const baseDir = exports.SESSION_DIRS[provider];
        if (!baseDir || !fs.existsSync(baseDir)) {
            return { added: 0, updated: 0, deleted: 0 };
        }
        const files = await this.findSessionFiles(baseDir);
        const existingFiles = new Set(files);
        let added = 0;
        let updated = 0;
        // Process each file
        for (const filePath of files) {
            try {
                const stat = fs.statSync(filePath);
                const mtime = stat.mtime.getTime();
                const size = stat.size;
                // Check if file needs parsing
                if (db.needsUpdate(filePath, mtime, size)) {
                    let session;
                    switch (provider) {
                        case 'claude':
                            session = await this.parseClaudeSession(filePath);
                            break;
                        case 'codex':
                            session = await this.parseCodexSession(filePath);
                            break;
                        case 'gemini':
                            session = await this.parseGeminiSession(filePath);
                            break;
                        default:
                            continue;
                    }
                    if (session.messages > 0) {
                        const isNew = !db.getFileRecord(filePath);
                        db.upsertSession(session);
                        db.upsertFileRecord(filePath, provider, mtime, size);
                        if (isNew)
                            added++;
                        else
                            updated++;
                    }
                }
            }
            catch (e) {
                console.error(`Error processing ${filePath}:`, e.message);
            }
        }
        // Cleanup deleted files
        const deleted = db.cleanupDeletedFiles(provider, existingFiles);
        return { added, updated, deleted };
    }
    /**
     * Sync all providers
     */
    async syncAll() {
        const startTime = Date.now();
        const [claude, codex, gemini] = await Promise.all([
            this.syncProvider('claude'),
            this.syncProvider('codex'),
            this.syncProvider('gemini'),
        ]);
        this.lastSyncTime = Date.now();
        const duration = Date.now() - startTime;
        console.log(`[DB Sync] Duration: ${duration}ms | Claude: +${claude.added}/-${claude.deleted} | Codex: +${codex.added}/-${codex.deleted} | Gemini: +${gemini.added}/-${gemini.deleted}`);
        return { claude, codex, gemini, duration };
    }
    /**
     * Get all sessions for a provider (from database with auto-sync)
     */
    async getSessions(provider) {
        const db = await this.ensureDb();
        const cacheKey = `sessions-${provider}`;
        // Use memory cache if available and recent
        const now = Date.now();
        if (this.cache.has(cacheKey) && (now - this.lastSyncTime) < this.syncInterval) {
            return this.cache.get(cacheKey);
        }
        const baseDir = exports.SESSION_DIRS[provider];
        if (!baseDir || !fs.existsSync(baseDir)) {
            return [];
        }
        // Sync this provider's files
        await this.syncProvider(provider);
        // Get sessions from database
        const sessions = db.getSessions(provider);
        this.cache.set(cacheKey, sessions);
        return sessions;
    }
    /**
     * Get aggregated usage for all providers
     * Uses incremental sync for better performance
     */
    async getAllUsage() {
        const db = await this.ensureDb();
        // Sync all providers first (incremental - only parses changed files)
        await this.syncAll();
        const usage = {
            providers: {},
            totals: {
                sessions: 0,
                messages: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                costUsd: 0,
            },
            byModel: {},
            byDate: {},
            byProject: {},
            recentSessions: [],
        };
        const providers = ['claude', 'codex', 'gemini'];
        for (const provider of providers) {
            // Get sessions from database (already synced)
            const sessions = db.getSessions(provider);
            const providerStats = {
                sessions: sessions.length,
                messages: 0,
                inputTokens: 0,
                outputTokens: 0,
                costUsd: 0,
                available: fs.existsSync(exports.SESSION_DIRS[provider]),
            };
            for (const session of sessions) {
                providerStats.messages += session.messages;
                providerStats.inputTokens += session.inputTokens;
                providerStats.outputTokens += session.outputTokens;
                providerStats.costUsd += session.costUsd;
                // Aggregate by model
                const model = session.model || 'unknown';
                if (!usage.byModel[model]) {
                    usage.byModel[model] = { sessions: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
                }
                usage.byModel[model].sessions++;
                usage.byModel[model].inputTokens += session.inputTokens;
                usage.byModel[model].outputTokens += session.outputTokens;
                usage.byModel[model].costUsd += session.costUsd;
                // Aggregate by date
                if (session.lastMessage) {
                    const date = new Date(session.lastMessage).toISOString().split('T')[0];
                    if (!usage.byDate[date]) {
                        usage.byDate[date] = { sessions: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
                    }
                    usage.byDate[date].sessions++;
                    usage.byDate[date].inputTokens += session.inputTokens;
                    usage.byDate[date].outputTokens += session.outputTokens;
                    usage.byDate[date].costUsd += session.costUsd;
                }
                // Aggregate by project
                const projectName = session.project || `${provider}-sessions`;
                if (!usage.byProject[projectName]) {
                    usage.byProject[projectName] = {
                        sessions: 0,
                        messages: 0,
                        inputTokens: 0,
                        outputTokens: 0,
                        costUsd: 0,
                        provider: provider,
                        lastActivity: null,
                    };
                }
                usage.byProject[projectName].sessions++;
                usage.byProject[projectName].messages += session.messages;
                usage.byProject[projectName].inputTokens += session.inputTokens;
                usage.byProject[projectName].outputTokens += session.outputTokens;
                usage.byProject[projectName].costUsd += session.costUsd;
                // Track last activity
                if (session.lastMessage) {
                    const currentLast = usage.byProject[projectName].lastActivity;
                    if (!currentLast || new Date(session.lastMessage) > new Date(currentLast)) {
                        usage.byProject[projectName].lastActivity = session.lastMessage;
                    }
                }
            }
            usage.providers[provider] = providerStats;
            usage.totals.sessions += providerStats.sessions;
            usage.totals.messages += providerStats.messages;
            usage.totals.inputTokens += providerStats.inputTokens;
            usage.totals.outputTokens += providerStats.outputTokens;
            usage.totals.costUsd += providerStats.costUsd;
            // Add to recent sessions
            usage.recentSessions.push(...sessions.slice(0, 10));
        }
        usage.totals.totalTokens = usage.totals.inputTokens + usage.totals.outputTokens;
        // Sort recent sessions by date
        usage.recentSessions.sort((a, b) => {
            const dateA = a.lastMessage ? new Date(a.lastMessage).getTime() : 0;
            const dateB = b.lastMessage ? new Date(b.lastMessage).getTime() : 0;
            return dateB - dateA;
        });
        usage.recentSessions = usage.recentSessions.slice(0, 20);
        return usage;
    }
    /**
     * Force re-parse all files (clear database and rebuild)
     */
    async forceRebuild() {
        const db = await this.ensureDb();
        console.log('[DB] Force rebuilding database...');
        db.clearAll();
        this.cache.clear();
        await this.syncAll();
        console.log('[DB] Rebuild complete');
    }
}
exports.SessionParser = SessionParser;
