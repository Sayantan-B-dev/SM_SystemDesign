## API DESIGN — DEFINITIONS-FIRST, EXHAUSTIVE EXPLANATION WITH ASCII DIAGRAMS

---

### 1. PLAIN-ENGLISH DEFINITIONS (Read First)

| Term | Definition in One Sentence (Zero Jargon) |
|------|------------------------------------------|
| **API (Application Programming Interface)** | A formal, documented contract that defines how external consumers (other services, mobile apps, frontend UIs) can interact with your code to perform specific actions or retrieve data — without needing to know how your code works internally. |
| **API Contract** | The fixed set of rules that both the provider (server) and consumer (client) agree upon: the function name, its parameters (inputs), the response structure (outputs), and the possible errors — once published, this contract should not break without a version change. |
| **Endpoint** | The specific URL path (e.g., `/v1/groups/{groupId}/admins`) where an API is exposed on the network, combined with the HTTP method (GET, POST, PUT, DELETE) that indicates the action to perform. |
| **HTTP Method (Verb)** | The action type in HTTP: GET (retrieve data), POST (create new resource), PUT/PATCH (update existing resource), DELETE (remove resource) — each maps to a specific CRUD operation. |
| **Request Payload** | The data sent by the client to the server in the body of the request (usually JSON) — contains the parameters needed for the API call (e.g., `{ "groupId": 123 }`). |
| **Response Payload** | The data returned by the server to the client after processing the request — typically contains the requested resource(s) or a success/error message. |
| **Status Code** | An HTTP numeric code (e.g., 200 OK, 404 Not Found, 500 Internal Server Error) that summarizes the outcome of the request — a standardized way to communicate success, client error, or server error. |
| **Idempotency** | A property where calling the same API multiple times with the same parameters produces the same result without unintended side effects (e.g., GET is idempotent; DELETE is idempotent; POST is usually not). |
| **Side Effect** | Any operation performed by an API that goes beyond its stated primary purpose — e.g., an API called `getAdmins` that also creates a new group if the group doesn't exist is creating unintended side effects. |
| **Pagination** | Breaking a large list of results into smaller, sequential pages (chunks) returned over multiple API calls, using parameters like `page` and `size` or `offset` and `limit` to control which chunk is returned. |
| **Fragmenting / Chunking** | Splitting a single large response payload into multiple smaller network packets or separate API responses with a continuation token, so the client can reassemble the full data without exceeding message size limits. |
| **Versioning** | The practice of including a version number in the API path (e.g., `/v1/...` or `/v2/...`) so that you can introduce breaking changes without breaking existing clients — both versions coexist until clients migrate. |
| **API Gateway** | A single entry point that sits between clients and your internal microservices; it routes requests to the correct service, enforces authentication, rate-limits, and can aggregate responses from multiple services. |
| **Service Degradation** | When a service is under heavy load, it returns a reduced, essential version of the response (e.g., returning only user names instead of full profiles) to keep the system responsive rather than failing completely. |

---

### 2. KEY TERMS GLOSSARY (With Analogies)

| Term | Analogy |
|------|---------|
| **API** | A restaurant menu. The menu lists what dishes you can order (functions), what ingredients you need to specify (parameters), and what you will receive (response), but you don't need to know how the kitchen cooks it (internal implementation). |
| **API Contract** | The printed menu — once published, you cannot change it without printing a new edition (version). |
| **Endpoint** | The specific aisle in the supermarket where you go to find a particular product (e.g., `/fruits/apples`). |
| **HTTP Method** | The action you take at that aisle: GET (look at), POST (place a new item), PUT (replace an item), DELETE (remove). |
| **Request Payload** | The order form you fill out with details (e.g., "I want 2 apples, type Gala"). |
| **Response Payload** | The bag of apples (and a receipt) you walk out with. |
| **Status Code** | The cashier's response: "200 OK" (transaction complete), "404 Not Found" (we don't sell that), "500 Internal Error" (register crashed). |
| **Idempotency** | Hitting the "elevator call" button five times — the elevator still comes once; repeated identical requests have the same final effect. |
| **Side Effect** | Ordering a pizza and the delivery driver also mows your lawn — you didn't ask for that, and it's confusing. |
| **Pagination** | Reading a book one chapter at a time instead of asking for the entire book at once. |
| **Versioning** | A restaurant having a "Classic Menu" and a "New Menu" — both exist simultaneously so old customers can still order their favorites while new customers try the new dishes. |
| **Service Degradation** | During rush hour, the restaurant only serves burgers (core item) instead of the full gourmet menu — still serves customers, just with less variety. |

---

### 3. CORE MECHANISM — WHAT AN API IS (Function Metaphor)

#### a) The Fundamental Concept: An API is a Public Function
At its heart, an API is exactly like a programming function or method:
- **Name:** What the operation is called (e.g., `getAdmins`).
- **Parameters:** What inputs the caller must provide (e.g., `groupId`).
- **Return Type:** What the caller receives (e.g., a list of Admin objects).
- **Errors/Exceptions:** What can go wrong and how those failures are communicated.

**ASCII: The Anatomy of an API (Function View)**
```
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │  FUNCTION SIGNATURE (Conceptual)                                                       │
  │                                                                                        │
  │  ResponseType functionName(ParameterType parameterName) throws ErrorType;              │
  │                                                                                        │
  │  ┌──────────────────┐  ┌─────────────┐  ┌─────────────────┐  ┌───────────────────┐   │
  │  │   Name           │  │  Parameters │  │   Return Type   │  │   Errors          │   │
  │  │  (WHAT it does)  │  │  (INPUTS)   │  │  (OUTPUT)       │  │  (EXCEPTIONS)     │   │
  │  ├──────────────────┤  ├─────────────┤  ├─────────────────┤  ├───────────────────┤   │
  │  │  getAdmins       │  │  groupId:   │  │  List<Admin>    │  │  1. GroupNotFound │   │
  │  │  (retrieve admins│  │  string     │  │  - id: string   │  │  2. GroupDeleted  │   │
  │  │   of a group)    │  │             │  │  - name: string │  │  3. AuthFailed    │   │
  │  └──────────────────┘  └─────────────┘  └─────────────────┘  └───────────────────┘   │
  │                                                                                        │
  │  The caller only needs to know this contract.                                          │
  │  The internal implementation (database queries, business logic, cache) is hidden.     │
  └────────────────────────────────────────────────────────────────────────────────────────┘
```

**ASCII: API in HTTP (RESTful)**
```
  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
  │  HTTP API Structure                                                                         │
  │                                                                                              │
  │  ┌────────────────────────────────────────────────────────────────────────────────────────┐ │
  │  │  REQUEST:                                                                              │ │
  │  │    Method: GET                                                                          │ │
  │  │    URL:    https://api.example.com/v1/groups/123/admins                               │ │
  │  │    Headers: { Authorization: Bearer token, Content-Type: application/json }           │ │
  │  │    Body:    (empty — parameters are in the URL path)                                  │ │
  │  └────────────────────────────────────────────────────────────────────────────────────────┘ │
  │                                                                                              │
  │  ┌────────────────────────────────────────────────────────────────────────────────────────┐ │
  │  │  RESPONSE:                                                                             │ │
  │  │    Status: 200 OK                                                                      │ │
  │  │    Body:    {                                                                          │ │
  │  │                "admins": [                                                             │ │
  │  │                    { "id": "u1", "name": "Alice" },                                    │ │
  │  │                    { "id": "u2", "name": "Bob" }                                       │ │
  │  │                ]                                                                       │ │
  │  │              }                                                                          │ │
  │  └────────────────────────────────────────────────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. API DESIGN CHECKLIST — THE FIVE CRITICAL QUESTIONS

| Question | Why It Matters | Example |
|----------|----------------|---------|
| **1. WHERE does this API belong?** | Place the API in the correct microservice that owns that data/domain. Group operations belong in the Group Service, not the User Service. | `getAdmins` belongs in the **Group Service** because it queries group membership. |
| **2. WHAT does it do? (Naming)** | The name must accurately describe the single action. Avoid generic names like `process` or `doStuff`. | Use `getAdmins`, not `getGroupInfo` (which would imply returning group details). |
| **3. WHAT parameters are required?** | Only include parameters that are essential. Extra optional parameters pollute the contract and introduce ambiguity. | `groupId` is essential. Do NOT add a `userList` unless the API's purpose changes. |
| **4. WHAT is the response?** | Return exactly what is needed, no more. Over-fetching wastes bandwidth and is confusing. | Return `List<Admin>` with `id` and `name`. Do NOT return full user profiles unless asked. |
| **5. WHAT errors are possible?** | Clearly define expected client errors (e.g., resource not found) vs unexpected server errors. Provide actionable error messages. | Return `404` with `"Group not found"`, not a generic `500`. |

---

### 5. HTTP METHODS — CHOOSING THE RIGHT VERB

| Method | Purpose | Idempotent? | Safe? | Body Allowed? | Example |
|--------|---------|-------------|-------|---------------|---------|
| **GET** | Retrieve a resource. | Yes | Yes | No | `GET /v1/users/123` |
| **POST** | Create a new resource or perform an action. | No | No | Yes | `POST /v1/groups` |
| **PUT** | Replace (update) a resource entirely. | Yes | No | Yes | `PUT /v1/users/123` |
| **PATCH** | Partially update a resource. | No (if applying diffs, can be idempotent if well-defined) | No | Yes | `PATCH /v1/users/123` |
| **DELETE** | Remove a resource. | Yes | No | Rarely | `DELETE /v1/users/123` |

**ASCII: Mapping CRUD to HTTP Methods**
```
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │  CRUD Operation        ──►  HTTP Method    ──►  Endpoint Pattern                    │
  ├──────────────────────────────────────────────────────────────────────────────────────┤
  │  CREATE a new group             POST        /v1/groups                             │
  │  READ all groups                GET         /v1/groups                             │
  │  READ a specific group          GET         /v1/groups/{groupId}                   │
  │  UPDATE entire group            PUT         /v1/groups/{groupId}                   │
  │  PARTIALLY update group         PATCH       /v1/groups/{groupId}                   │
  │  DELETE a group                 DELETE      /v1/groups/{groupId}                   │
  └──────────────────────────────────────────────────────────────────────────────────────┘

  Safe = does not modify state (GET, HEAD, OPTIONS).
  Idempotent = multiple identical requests produce same result (GET, PUT, DELETE, HEAD).
```

---

### 6. URL DESIGN — RESOURCE VS ACTION

#### a) Resource-Oriented Design (RESTful)
- Resources are nouns (users, groups, products).
- Actions are implied by HTTP methods.
- **Preferred:** `/v1/groups/{groupId}/admins`

#### b) Action-Oriented Design (RPC-style)
- Endpoints contain the verb directly.
- Often uses POST for everything.
- **Discouraged:** `/v1/group/getAdmins` or `/v1/actions?name=getAdmins`

**ASCII: URL Best and Worst Practices**
```
  ✅ GOOD (Resource-Oriented):
    GET    /v1/groups/{groupId}/admins
    POST   /v1/groups/{groupId}/admins          (add an admin)
    DELETE /v1/groups/{groupId}/admins/{userId} (remove an admin)

  ✅ ALSO GOOD (Action-Oriented for non-CRUD):
    POST   /v1/groups/{groupId}/join            (user joins group — not a CRUD operation)
    POST   /v1/groups/{groupId}/leave

  ❌ BAD (Ambiguous, no clear action):
    POST   /v1/group
    GET    /v1/group?action=getAdmins&groupId=123  (mixes routing with action)
    POST   /v1/admin/set?groupId=123              (vague, side effects likely)

  ❌ BAD (Redundant HTTP verb in URL):
    GET    /v1/getAdmins?groupId=123   (GET already implies "get")
    POST   /v1/createGroup             (POST already implies "create")
```

---

### 7. PARAMETERS — PATH, QUERY, BODY

| Location | When to Use | Example |
|----------|-------------|---------|
| **Path (URL)** | Identifies the specific resource being acted upon. Must be mandatory and part of the resource hierarchy. | `/v1/groups/{groupId}/admins` |
| **Query String** | Filtering, sorting, pagination, or optional parameters that are not part of the resource identity. | `/v1/groups?page=2&size=10&sort=name` |
| **Body (JSON)** | Complex parameters, large payloads, or when using POST/PUT/PATCH to send data to be created/updated. | `POST /v1/groups` with body `{"name":"Admins", "members":[...]}` |

**ASCII: Parameter Location Decision**
```
  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │  GET /v1/groups/{groupId}/admins?limit=10&offset=20                             │
  │                       ▲              ▲                   ▲                       │
  │                       │              │                   │                       │
  │                 Path Parameter   Path Parameter     Query Parameters            │
  │                 (identifies      (identifies        (optional filters,          │
  │                  the group)      the action)         pagination)                │
  └────────────────────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │  POST /v1/groups                                                                   │
  │  Body: {                                                                           │
  │    "name": "Admins",                                                               │
  │    "members": ["u1", "u2"]                                                         │
  │  }                                                                                 │
  │  ▲                                                                                 │
  │  Body (complex data, mandatory for creation)                                      │
  └────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 8. RESPONSE DESIGN — DO NOT OVER-FETCH

**Rule:** Return exactly what the caller asked for, no more, no less.

**Bad Response (Over-fetching):**
```
  GET /v1/groups/123/admins
  Response:
  {
    "groupId": 123,
    "groupName": "Dev Team",
    "createdAt": "2024-01-01",
    "admins": [
      { "id": "u1", "name": "Alice", "email": "a@x.com", "profilePic": "base64...", "age": 30, "address": {...} }
    ]
  }
  Problem: Returns group details, email, profile pic, age, address — too much.
```

**Good Response (Minimal, Focused):**
```
  GET /v1/groups/123/admins
  Response:
  {
    "admins": [
      { "id": "u1", "name": "Alice" }
    ]
  }
  If client needs email, they call another API: GET /v1/users/u1
```

**Why Over-fetching is Harmful:**
- Wastes network bandwidth (large payloads).
- Slows down parsing on the client side.
- Creates hidden coupling — if the response structure changes, client breaks.
- Violates the Single Responsibility Principle of the API.

---

### 9. ERROR DESIGN — EXPECTED VS UNEXPECTED

| Error Type | Description | HTTP Status Code | Example |
|------------|-------------|------------------|---------|
| **Validation Error** | Client sent invalid data (e.g., groupId is not a number). | 400 Bad Request | `{"error": "groupId must be an integer"}` |
| **Authentication Error** | Client did not provide valid credentials. | 401 Unauthorized | `{"error": "Missing or invalid API key"}` |
| **Authorization Error** | Client is authenticated but lacks permission. | 403 Forbidden | `{"error": "User is not a group admin"}` |
| **Not Found** | Resource does not exist (expected client error). | 404 Not Found | `{"error": "Group 123 not found"}` |
| **Conflict** | Resource conflict (e.g., duplicate creation). | 409 Conflict | `{"error": "User already a member"}` |
| **Rate Limit** | Too many requests. | 429 Too Many Requests | `{"error": "Rate limit exceeded, retry after 60s"}` |
| **Server Error** | Internal server failure (unexpected). | 500 Internal Server Error | `{"error": "Database connection failed"}` (do not expose details to client) |

**ASCII: Error Handling Flow**
```
  ┌─────────────────────────────────────────────────────────────────────────────────────┐
  │  API Call                                                                           │
  │       │                                                                             │
  │       ▼                                                                             │
  │  ┌─────────────────────────────────────────────────────────────────────────────┐   │
  │  │  1. Validate Request (check headers, parameters, body)                      │   │
  │  │     ┌──────────────────────────────────────────────────────────────────┐     │   │
  │  │     │  Validation fails? ──► 400 Bad Request with error details.      │     │   │
  │  │     └──────────────────────────────────────────────────────────────────┘     │   │
  │  └─────────────────────────────────────────────────────────────────────────────┘   │
  │       │                                                                             │
  │       ▼                                                                             │
  │  ┌─────────────────────────────────────────────────────────────────────────────┐   │
  │  │  2. Authentication & Authorization                                          │   │
  │  │     ┌──────────────────────────────────────────────────────────────────┐     │   │
  │  │     │  Invalid token? ──► 401 Unauthorized                             │     │   │
  │  │     │  Insufficient permissions? ──► 403 Forbidden                    │     │   │
  │  │     └──────────────────────────────────────────────────────────────────┘     │   │
  │  └─────────────────────────────────────────────────────────────────────────────┘   │
  │       │                                                                             │
  │       ▼                                                                             │
  │  ┌─────────────────────────────────────────────────────────────────────────────┐   │
  │  │  3. Business Logic (database access, external calls)                       │   │
  │  │     ┌──────────────────────────────────────────────────────────────────┐     │   │
  │  │     │  Resource not found? ──► 404 Not Found                          │     │   │
  │  │     │  Business rule violated (e.g., user not member)? ──► 400/409    │     │   │
  │  │     │  Unexpected exception? ──► 500 Internal Server Error (log error)│     │   │
  │  │     └──────────────────────────────────────────────────────────────────┘     │   │
  │  └─────────────────────────────────────────────────────────────────────────────┘   │
  │       │                                                                             │
  │       ▼                                                                             │
  │  ┌─────────────────────────────────────────────────────────────────────────────┐   │
  │  │  4. Return success response with 200 OK (or 201 Created for POST)          │   │
  └─────────────────────────────────────────────────────────────────────────────────────┘
```

**Rule of thumb:** Return expected errors (e.g., Not Found) with meaningful messages. Do not return stack traces or internal details (security risk).

---

### 10. SIDE EFFECTS — THE SILENT KILLER

**Definition:** An API that does something beyond its stated purpose.

**Example of a Bad API with Side Effects:**
```
  POST /v1/groups/setAdmins
  Body: { "groupId": 123, "admins": ["u1", "u2"] }

  If groupId=123 does NOT exist:
    The API CREATES group 123 automatically (side effect).
  If admins are NOT members:
    The API ADDS them as members first (side effect).

  Problem: The caller expects to just "set admins" but the API is also
            creating groups and adding members silently.
```

**Why Side Effects Are Dangerous:**
1. **Confusion:** Caller doesn't know what will happen.
2. **Atomicity Issues:** If the group creation fails but the member addition succeeds, state is corrupted.
3. **Testing Complexity:** You must test multiple behaviors in one API.
4. **Violates Single Responsibility:** One API does three jobs.

**Solution:**
- **Break into multiple APIs:**
  1. `POST /v1/groups` → create group (returns groupId).
  2. `POST /v1/groups/{groupId}/members` → add members.
  3. `POST /v1/groups/{groupId}/admins` → set admins.
- The client (or an orchestrator) calls these in sequence.
- If atomicity is needed, use a Saga or a single transaction at the application level — but the API contract remains clean.

---

### 11. PAGINATION — HANDLING LARGE RESPONSES

When a response can contain thousands of items, you must paginate to avoid timeouts, memory issues, and network saturation.

**Common Pagination Strategies:**

| Strategy | Parameters | Example |
|----------|------------|---------|
| **Offset/Limit** | `page` (starting index) and `size` (items per page) | `GET /v1/groups?page=2&size=20` (returns items 21-40) |
| **Cursor/Token** | `cursor` (opaque token from previous response) and `limit` | `GET /v1/groups?cursor=abc123&limit=20` (no skip, no page number) |
| **Keyset (Seek)** | `after` (last ID from previous page) and `limit` | `GET /v1/groups?after=lastId&limit=20` (uses indexed ID column) |

**ASCII: Offset/Limit Pagination**
```
  GET /v1/groups/123/admins?offset=0&limit=10
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Query: "SELECT * FROM admins WHERE group_id=123 ORDER BY id LIMIT 10 OFFSET 0" │
  │  Returns: Admins 1-10                                                      │
  └─────────────────────────────────────────────────────────────────────────────┘

  GET /v1/groups/123/admins?offset=10&limit=10
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Query: "SELECT * FROM admins WHERE group_id=123 ORDER BY id LIMIT 10 OFFSET 10" │
  │  Returns: Admins 11-20                                                     │
  └─────────────────────────────────────────────────────────────────────────────┘

  Response includes total count for UI:
  {
    "data": [ ... ],
    "pagination": {
      "offset": 0,
      "limit": 10,
      "total": 200,
      "next": "/v1/groups/123/admins?offset=10&limit=10"
    }
  }
```

**Cursor-Based Pagination (Better for Large Datasets):**
```
  GET /v1/groups/123/admins?cursor=eyJpZCI6MTB9&limit=10

  Response:
  {
    "data": [ ... ],
    "next_cursor": "eyJpZCI6MjB9",
    "has_more": true
  }

  Advantage: No need to count total (O(1) performance). No stale data issues from offsets.
```

---

### 12. FRAGMENTATION — CHUNKING LARGE RESPONSES

**Scenario:** The internal RPC (e.g., gRPC) has a message size limit (say 10 MB). Your API returns a 50 MB file or large blob.

**Solution:** Fragment the response into multiple chunks, each with a sequence number and a "final" flag.

**ASCII: Fragmented Response**
```
  API: GET /v1/files/large-video
  Response is split into 5 chunks.

  Chunk 1: { "chunk": 1, "total": 5, "data": "base64...", "final": false }
  Chunk 2: { "chunk": 2, "total": 5, "data": "base64...", "final": false }
  Chunk 3: { "chunk": 3, "total": 5, "data": "base64...", "final": false }
  Chunk 4: { "chunk": 4, "total": 5, "data": "base64...", "final": false }
  Chunk 5: { "chunk": 5, "total": 5, "data": "base64...", "final": true }

  Client reassembles all chunks in order.
```

**Note:** In HTTP, you can also use `Content-Range` headers for byte-range requests (e.g., for video streaming). Fragmentation is more common in internal RPC protocols where message size is limited.

---

### 13. CONSISTENCY LEVELS — STRONG VS EVENTUAL

| Consistency Level | What It Means | API Impact |
|-------------------|---------------|------------|
| **Strong** | Every read returns the latest committed write. No stale data. | Slower, may require read-your-writes, often uses synchronous replication. |
| **Eventual** | Reads may return stale data for a short time. Writes propagate asynchronously. | Faster, higher availability, but clients must handle staleness. |

**Example:**
- `GET /v1/groups/123/admins` — if you use a cache (Redis) that refreshes every 60 seconds, the API may return stale admin list.
- For a group where admins change infrequently, this is acceptable.
- For a financial system, you would **not** cache such data — you would read directly from the database.

**API Design Decision:**
- Include a `Cache-Control` header in the response to tell clients how stale the data might be.
- Provide optional query params: `?cache=off` to force a fresh read.
- In the API contract, document the consistency guarantee (e.g., "Reads may be up to 60 seconds stale").

**ASCII: Consistency Decision Flow**
```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Client calls GET /v1/groups/123/admins                                    │
  │  ┌─────────────────────────────────────────────────────────────────────┐    │
  │  │  Does the system have a cache?                                     │    │
  │  │    ├─ Yes ──► Serve from cache (eventual consistency)              │    │
  │  │    └─ No  ──► Query database (strong consistency)                  │    │
  │  └─────────────────────────────────────────────────────────────────────┘    │
  │                                                                             │
  │  If served from cache: Include header:                                     │
  │    Cache-Control: max-age=60                                               │
  │    Warning: 299 - "Data may be up to 60 seconds stale"                     │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

### 14. SERVICE DEGRADATION — GRACEFUL FAILURE

**Scenario:** The database is under heavy load, and a full response (including large profile pictures) would take 10 seconds and might time out.

**Solution:** Return a degraded (reduced) response with only essential fields.

**ASCII: Degraded Response Example**
```
  Normal Response (when load is low):
  {
    "admins": [
      { "id": "u1", "name": "Alice", "email": "a@x.com", "profilePic": "base64...", "age": 30, "address": {...} }
    ]
  }

  Degraded Response (when load is high):
  {
    "admins": [
      { "id": "u1", "name": "Alice" }   ← only ID and name, no profilePic, email, etc.
    ],
    "degraded": true   ← client knows data is partial
  }
```

**When to degrade:**
- When response time exceeds a threshold (e.g., 500ms).
- When database connection pool is exhausted.
- When the API is being rate-limited by a downstream service.

**How to implement:** Use a circuit breaker or a load-shedding mechanism that enables "degraded mode" dynamically.

---

### 15. VERSIONING — EVOLVING WITHOUT BREAKING

**Why Version?** To introduce breaking changes (new required params, changed response structure) without breaking existing clients.

**Common Versioning Strategies:**

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URL Path** | `/v1/groups`, `/v2/groups` | Clear, explicit, easy to route. | Pollutes URL space. |
| **Query Parameter** | `/groups?version=1` | Simple. | Not RESTful; less visible. |
| **Header** | `Accept: application/vnd.myapi.v1+json` | Clean URL. | Less discoverable. |
| **Host-based** | `v1.api.example.com` | Isolated deployments. | Expensive. |

**Best Practice:** Use **URL Path Versioning** (`/v1/...`, `/v2/...`) because it is self-documenting, easy to route in gateways, and client can see the version in the URL.

**ASCII: Versioning in Action**
```
  Old clients call:  GET /v1/groups/123/admins  → returns { "admins": [...] }
  New clients call:  GET /v2/groups/123/admins  → returns { "data": { "admins": [...] }, "meta": { ... } }

  Both coexist. Old clients continue to work.
  When all clients are migrated, v1 can be deprecated and removed.
```

---

### 16. REAL-WORLD API DESIGN EXAMPLES

| Company/API | Good Practice | Bad Practice They Avoid |
|-------------|---------------|-------------------------|
| **Stripe API** | Consistent naming, clear versioning, idempotency keys, predictable response structures. | They never mix side effects; `POST /v1/payment_intents` creates a payment intent, not a charge. |
| **GitHub API** | Pagination via Link headers, clear status codes, rate-limiting headers. | They avoid over-fetching; you must explicitly ask for `?include=...`. |
| **Twitter API** | Uses cursor-based pagination (`?next_cursor=...`), clear error messages. | They avoid mixing actions; separate endpoints for `POST /tweet` and `DELETE /tweet/:id`. |
| **AWS APIs** | Versioned endpoints (`/v1/...`), extensive parameter validation. | They avoid "magic" behaviors; each API does exactly one thing (e.g., `EC2.RunInstances`). |

---

### 17. COMMON API DESIGN PITFALLS (Summary Table)

| Pitfall | Why It's Bad | How to Fix |
|---------|--------------|------------|
| **Overly Generic Name** (`process`, `doAction`) | Unclear what the API does. | Use specific verbs: `getAdmins`, `createGroup`. |
| **Over-fetching Response** | Wastes bandwidth, slow. | Return only requested fields; use GraphQL or Field Masks. |
| **Side Effects** | Surprises caller, breaks atomicity. | One API = one action. Split into multiple APIs. |
| **Vague Errors** (`500 Internal Error` for everything) | Client cannot handle errors programmatically. | Return specific status codes and error messages. |
| **Mixing Routing with Action** (`/group?action=get`) | Ambiguous, not RESTful. | Use resource-oriented URLs: `/v1/groups/{id}/admins`. |
| **Missing Versioning** | Breaking changes break clients. | Include `/v1/` in path from day 1. |
| **Too Many Optional Parameters** | Confusing, hard to test. | Keep params minimal; if needed, create a new API. |
| **Ignoring Idempotency** (especially for POST) | Duplicate requests cause duplicate effects. | Use idempotency keys (`Idempotency-Key` header). |
| **Not Documenting** | Clients cannot use the API. | Provide OpenAPI/Swagger documentation. |

---

### 18. EDGE CASES AND FAILURE MODES

| Failure | How API Should Respond | Mitigation |
|---------|------------------------|------------|
| **Database Timeout** | Return `504 Gateway Timeout` (not 500). | Implement timeouts; use circuit breakers. |
| **Downstream Service Unavailable** | Return `503 Service Unavailable` with retry-after header. | Use fallback (degraded response) if possible. |
| **Rate Limit Exceeded** | Return `429 Too Many Requests` with `Retry-After` header. | Use API Gateway rate limiting. |
| **Malformed JSON** | Return `400 Bad Request` with `"Invalid JSON"`. | Validate early. |
| **Missing Authentication** | Return `401 Unauthorized` (not 403). | Always check auth first. |
| **IDEMPOTENCY KEY Collision** | If same key used for different operations, return `409 Conflict`. | Use a distributed lock or database unique constraint. |

---

### 19. FINAL ASCII — COMPLETE API DESIGN LIFECYCLE

```
  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
  │  1. REQUIREMENT GATHERING                                                                   │
  │     - What does the client need? (e.g., retrieve admins of a group)                        │
  │     - What are the inputs? (groupId)                                                       │
  │     - What are the outputs? (list of admin names + IDs)                                   │
  │     - What errors are expected? (group not found, group deleted, auth)                    │
  └───────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                      │
                                      ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
  │  2. DESIGN THE CONTRACT                                                                     │
  │     - Method: GET                                                                            │
  │     - URL:    /v1/groups/{groupId}/admins                                                   │
  │     - Parameters: groupId (path, string)                                                    │
  │     - Response: { "admins": [ { "id": "string", "name": "string" } ] }                     │
  │     - Errors: 404 (group not found), 403 (not authorized), 500 (internal)                  │
  │     - Cache-Control: max-age=60                                                             │
  └───────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                      │
                                      ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
  │  3. IMPLEMENT THE API                                                                       │
  │     - Write handler function                                                                 │
  │     - Validate groupId                                                                       │
  │     - Query database for admins                                                             │
  │     - Return JSON response                                                                   │
  └───────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                      │
                                      ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
  │  4. DOCUMENT (OpenAPI / Swagger)                                                             │
  │     - Provide examples                                                                       │
  │     - State error codes                                                                      │
  │     - State version and deprecation policy                                                  │
  └───────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                      │
                                      ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
  │  5. DEPLOY AND MONITOR                                                                       │
  │     - Track latency, error rate, usage                                                       │
  │     - Set up alerts for 5xx errors                                                           │
  │     - If load increases, consider caching or service degradation                            │
  └──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 20. PLAIN-ENGLISH FINAL TAKEAWAY

1. **An API is a public function** — a contract that defines the name, inputs, outputs, and errors. The implementation is hidden.
2. **Good API design answers five questions:** WHERE (which service), WHAT (name), INPUTS (parameters), OUTPUTS (response), ERRORS (expected failures).
3. **Use HTTP verbs correctly** — GET for reads, POST for creates, PUT for full updates, PATCH for partial updates, DELETE for removal.
4. **URL structure:** Use resource-oriented nouns (`/groups/{id}/admins`) rather than action verbs (`/getAdmins`). Use path for identity, query for filters/pagination, body for complex data.
5. **Response should be minimal** — no over-fetching. Return only what the client needs. Use pagination for large lists.
6. **Side effects are bad** — one API does one thing. If it creates a group AND sets admins, split it into two APIs.
7. **Version from day one** — use `/v1/` in URLs. Breaking changes go to `/v2/`.
8. **Error handling** — use proper HTTP status codes (400 for client errors, 404 for not found, 500 for server errors). Provide meaningful messages.
9. **Consider consistency** — decide if you need strong (database) or eventual (cache) consistency, and document it.
10. **Service degradation** — during high load, return a reduced response to keep the system responsive.
11. **In System Design Interviews:** Always design your API first (contract) before discussing implementation details. Use clear names, state error cases, and consider versioning and pagination upfront. Good API design signals that you think about developers (users of your API) and production readiness.