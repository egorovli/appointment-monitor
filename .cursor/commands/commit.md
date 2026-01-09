# Commit Command

## Prerequisites

**CRITICAL: GitHub MCP Availability Check**

Before proceeding with ANY step, verify GitHub MCP is available by calling `mcp_github_get_me`.

If GitHub MCP is NOT available or the call fails:

**⛔ CRITICAL ERROR: GITHUB MCP IS NOT AVAILABLE**

The commit command REQUIRES GitHub MCP to function properly. Cannot proceed without GitHub integration for issue linking.

Please ensure:
1. GitHub MCP server is configured in Cursor settings
2. You are authenticated with valid GitHub credentials
3. The MCP server is running and accessible

**STOP IMMEDIATELY. Do not proceed with any commit operation.**

---

## Execution Steps

### 1) Determine Active Changes

Use staged files if any exist, otherwise consider all changed files.
Run `git status` and `git diff --staged` (or `git diff` if nothing staged) to understand the scope.

### 2) Analyze Changes Thoroughly

- Review each changed file to understand the purpose and impact
- Identify the type of change (feature, fix, refactor, etc.)
- Note any breaking changes or important behavioral modifications
- Understand the context and motivation behind the changes

### 3) Find Relevant GitHub Issues

**If the user explicitly provides issue references as command arguments, use those directly.**

Otherwise, perform a thorough search to find fitting issues:

#### Search Strategy (use ALL of these approaches):

1. **Search by keywords from changes**:
   - Extract meaningful terms from file names, function names, and change content
   - Use `mcp_github_search_issues` with relevant keywords in query

2. **Search by title/body patterns**:
   - Use `mcp_github_search_issues` with queries like:
     - `is:open "keyword"` - search in title and body
     - `is:open in:title "keyword"` - search specifically in titles
     - `is:open in:body "keyword"` - search in issue body

3. **Search recent/active issues**:
   - `is:open sort:updated-desc` - recently updated open issues
   - `is:open assignee:@me` - issues assigned to current user
   - `is:open updated:>={date}` - issues updated in recent period

4. **Search by label/area**:
   - If changes are in `web/`, search with `label:web`
   - If changes are in `api/`, search with `label:api`
   - Use `label:bug`, `label:enhancement`, etc. as appropriate

5. **List issues for broader context**:
   - Use `mcp_github_list_issues` with `state: "open"` to browse recent issues
   - Filter by labels relevant to the changed code area

6. **Examine issue details** (if initial searches return candidates):
   - Use `mcp_github_issue_read` with `method: "get"` to fetch full issue details
   - Check if issue descriptions or context match the changes

#### Selection Criteria:
- Prioritize issues that closely match the intent of the changes
- A changeset may relate to multiple issues - include all relevant ones
- Prefer open/in-progress issues over closed ones
- Consider parent issues or related tracking issues

### 4) Create Issue If None Found

If no relevant issue exists after thorough search:
- Create one using `mcp_github_issue_write` with `method: "create"`
- Use a descriptive title that captures the change
- Write a proper description explaining the change
- Assign to current user
- Use latest milestone if available
- Add appropriate labels (e.g., `web`, `api`, `bug`, `enhancement`)

### 5) Write Detailed Commit Message

Follow Conventional Commits format with comprehensive details:

#### Header (required):
```
<type>[optional scope]: <short description>
```
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`, `build`
- **Scope** (optional): module/area in parentheses, e.g., `feat(web):`, `fix(api):`
- **Description**: imperative mood, concise, professional, slightly passive-aggressive tone

#### Body (required for non-trivial changes):
```

<detailed description of what changed and why>

<justification: why this change is necessary>

- Bullet points for specific changes
- Explain the motivation and context
- Note any important implementation details
- Mention any trade-offs or alternatives considered
```

#### Justification (important):

Always include WHY this change is necessary. Sources for justification:
1. **From linked GitHub issues** - extract from issue title, description, or comments
2. **From code context** - deduce from the problem being solved (bug fix, missing feature, tech debt)
3. **From business logic** - explain the user/business need being addressed

If a GitHub issue has good context, quote or paraphrase it. If not, deduce the justification from the nature of the changes themselves.

#### Footer (required):
```

References #XXX, #YYY
```

#### Example of a detailed commit:
```
feat(api): implement rate limiting for authentication endpoints

Add configurable rate limiting to protect authentication endpoints from
brute force attacks. The implementation uses a sliding window algorithm
with Redis-backed storage for distributed deployments.

Why: Security audit identified authentication endpoints as vulnerable to
credential stuffing attacks. Production logs showed repeated login attempts
from single IPs averaging 200+ requests/minute during attack windows.

Changes:
- Add rate limiter middleware with configurable limits
- Apply 5 requests/minute limit to /auth/login endpoint
- Apply 10 requests/minute limit to /auth/otp endpoints
- Add rate limit headers to responses (X-RateLimit-*)
- Include bypass mechanism for health checks

The sliding window approach was chosen over fixed window to prevent
burst attacks at window boundaries. Redis storage enables consistent
rate limiting across multiple API instances.

References #42, #38
```

### 6) Execute Git Commit

Run `git commit` with the prepared message.

If there are staged changes, commit those. Otherwise, stage all changes first with `git add -A`.

---

## Important Notes

- Use GitHub MCP (`mcp_github_*`) for ALL GitHub interactions
- Use other MCPs as needed: context7 MCP, sequential-thinking MCP
- Refer to AGENTS.md and CLAUDE.md for additional rules and conventions
- Be thorough in issue search - spending extra time finding the right issue is better than creating duplicates
- Commit messages are permanent documentation - make them count
