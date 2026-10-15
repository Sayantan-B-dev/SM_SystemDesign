## SYSTEM DESIGN: TINDER — DEFINITIONS-FIRST, EXHAUSTIVE EXPLANATION WITH ASCII DIAGRAMS

---

### 1. PLAIN-ENGLISH DEFINITIONS (Read First)

| Term | Definition in One Sentence (Zero Jargon) |
|------|------------------------------------------|
| **Tinder** | A location‑based dating app where users create profiles, browse other users' profiles (swipe right to like, left to pass), and if both like each other, they match and can chat. |
| **Feature‑First Design** | A top‑down approach where you first list what users can do (features), then derive the services and data needed for each feature, rather than starting with a database schema. |
| **Gateway (API Gateway)** | A single entry point for all client requests that handles authentication, rate limiting, routing, and protocol translation, shielding internal microservices from direct client exposure. |
| **Authentication Token (JWT)** | A cryptographically signed piece of data (e.g., JSON Web Token) that the client presents with each request to prove their identity, avoiding sending username/password every time. |
| **Distributed File System** | A storage system spread across multiple servers that stores large files (images) with redundancy and high availability, typically accessed via a URL. |
| **Content Delivery Network (CDN)** | A global network of edge servers that cache static content (images) close to users, drastically reducing load times and origin server load. |
| **WebSocket / XMPP** | A persistent, bidirectional communication protocol that allows the server to push messages to the client in real‑time, unlike HTTP which is request‑response. |
| **Session Service** | A microservice that maintains a mapping from user ID to their active WebSocket connection (or connection ID) so that the system knows where to route incoming chat messages. |
| **Match Service** | A microservice that stores which users have mutually liked each other (matched). It also validates that a chat request is between two matched users. |
| **Recommendation Service** | A microservice that, given a user’s preferences (age range, gender, location), returns a list of potential matches (other users) to show in the swiping queue. |
| **Geospatial Indexing** | A technique (e.g., using a geohash or a spatial index like R‑tree) to efficiently query users within a certain distance radius from a given location. |
| **Sharding (Horizontal Partitioning)** | Splitting the user database across multiple nodes based on a shard key (e.g., user ID or location hash), allowing horizontal scaling and faster queries for location‑based results. |
| **CAP Theorem** | In distributed systems, you can have at most two of Consistency, Availability, and Partition Tolerance. Tinder favours Availability and Partition Tolerance (AP) over strong consistency. |
| **Service Degradation** | During high load, returning a reduced response (e.g., only names, no images) to keep the system responsive rather than failing completely. |

---

### 2. KEY TERMS GLOSSARY (With Analogies)

| Term | Analogy |
|------|---------|
| **Feature‑First Design** | Planning a restaurant menu (features) before designing the kitchen layout (services) and stocking ingredients (data). |
| **Gateway** | A hotel concierge who verifies your ID (authentication) and directs you to the correct floor (service) without you needing to know the floor plan. |
| **Authentication Token** | A stamped wristband for a festival; you wear it and show it at every gate, proving you’re a valid attendee without showing your ID again. |
| **Distributed File System** | A huge warehouse with many shelves across different rooms; each room stores a subset of files, and a central catalog (database) tells you which room to go to. |
| **CDN** | Local fast‑food outlets around the world that keep popular burgers (images) ready so you don’t have to wait for the central kitchen. |
| **WebSocket** | A walkie‑talkie channel that stays open so both sides can speak whenever they want, unlike a walkie‑talkie where you push‑to‑talk and wait for reply (HTTP). |
| **Session Service** | A receptionist with a whiteboard showing which room (connection) each guest (user) is currently in, so you can find them for a chat. |
| **Match Service** | A matchmaker’s ledger that records mutual likes; before you can send a message, the system checks this ledger to confirm you’re allowed. |
| **Recommendation Service** | A personal shopper who knows your style, age, and location, and brings you a selection of items (people) that fit your taste. |
| **Geospatial Indexing** | A map of the city divided into grids (geohashes); to find people near you, you only check the grid you’re in, not the whole city. |
| **Sharding** | Organising a library’s books by first letter of the title: A‑F in room 1, G‑M in room 2, etc. You go directly to the room containing the book you need. |

---

### 3. CORE MECHANISM — FEATURE‑FIRST DESIGN AND SERVICE DERIVATION

#### a) The Two Approaches to System Design

| Approach | Starting Point | Pros | Cons |
|----------|----------------|------|------|
| **ER‑Diagram First** | Design database schema (tables, relationships) first, then services, then APIs. | Good for data‑intensive, stable systems. | Too rigid; doesn't reflect user needs; hard to evolve. |
| **Feature‑First (front‑to‑back)** | List user features (what they do), then derive services, then data models per service. | User‑centric, flexible, easier to split into microservices. | Requires deeper thinking about workflows; may lead to distributed transactions. |

**For Tinder, Feature‑First is recommended.** The four core features are:

1. **Store Profiles** (with images)
2. **Recommend Matches** (show potential partners)
3. **Note Matches** (record mutual likes)
4. **Direct Messaging** (chat after match)

**ASCII: Feature‑First Derivation**
```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  USER FEATURES (What the app does)                                        │
  │  1. Create/Update Profile (with 5 images)                                │
  │  2. Swipe (like/pass) on recommended profiles                            │
  │  3. Get notified when mutual like (match) occurs                         │
  │  4. Chat with matched users                                              │
  └─────────────────────────────────┬───────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  SERVICES (Microservices)                                                  │
  │  • Profile Service      → handles CRUD on user profiles (text fields)     │
  │  • Image Service        → handles upload, storage, retrieval of images    │
  │  • Recommendation Svc   → returns list of candidate users based on filters│
  │  • Match Service        → records matches, validates chat permissions    │
  │  • Session Service      → tracks active WebSocket connections per user   │
  │  • Gateway              → single entry point, auth, routing              │
  └─────────────────────────────────┬───────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  DATA STORES (per service)                                                 │
  │  • Profile DB (SQL)          → user_id, name, age, gender, etc.           │
  │  • Image Metadata DB (SQL)   → image_id, profile_id, URL, order           │
  │  • Distributed File System   → actual image files (S3/CDN)                │
  │  • Recommendation DB (NoSQL) → location‑based sharded store (Cassandra)   │
  │  • Match DB (SQL)            → (user1_id, user2_id) pairs                │
  │  • Session Store (Redis)     → user_id → connection_id / socket           │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. DETAILED FEATURE BREAKDOWN AND ARCHITECTURAL DECISIONS

#### Feature 1: Storing Profiles (with images)

**Requirement:** Users must be able to create and update their profile (name, age, gender, description, location) and upload up to 5 images.

**Architecture Decisions:**

- **Images vs Blobs:**
  - Store images as **files** in a distributed file system (e.g., S3), not as blobs in a database.
  - Why? Images are large, immutable (updates are new uploads), don’t need ACID transactions, don’t need indexing on content, and are cheaper to serve via CDN.
  - Store only the image URL (and possibly metadata) in a database.

- **Authentication:**
  - Use a **Gateway** that validates a JWT token for every request.
  - The Gateway checks with the Profile Service to verify the token, then routes the request.
  - This decouples authentication from business logic.

- **Image Service:**
  - A separate microservice responsible for uploading, resizing, and serving images.
  - It interacts with the distributed file system and maintains a metadata table (profile_id → image_urls).

**ASCII: Profile Storage Flow**
```
  ┌──────────────┐     1. POST /profile (name, age, gender)      ┌────────────────────────┐
  │   Client     │───────────────────────────────────────────────►│       GATEWAY           │
  │  (Mobile)    │                                               │  (Auth token validation)│
  └──────────────┘                                               └───────────┬────────────┘
         │                                                                   │
         │ 2. Upload image (multipart/form-data)                             │
         │                                                                   ▼
         │                                                          ┌────────────────────────┐
         │                                                          │    PROFILE SERVICE      │
         │                                                          │  - Store text fields   │
         │                                                          │  - Return profile_id   │
         └──────────────────────────────────────────────────────────►└───────────┬────────────┘
                                                                                  │
                                                                                  ▼
         │                                                          ┌────────────────────────┐
         │                                                          │    IMAGE SERVICE       │
         │                                                          │  - Receive image       │
         │                                                          │  - Store in S3         │
         │                                                          │  - Generate URL        │
         │                                                          │  - Save metadata       │
         │                                                          │  (profile_id, url)     │
         │                                                          └───────────┬────────────┘
         │                                                                      │
         │                                                                      ▼
         │                                                          ┌────────────────────────┐
         │                                                          │   CDN / S3             │
         │                                                          │  (distributed file sys)│
         │                                                          └────────────────────────┘
```

**Database Schema (Profile Service):**
```
  users table:
    id (PK), name, age, gender, bio, location (lat/long), last_active

  images table (in Image Service):
    id (PK), profile_id (FK), url (S3/CDN), order (1-5), uploaded_at
```

---

#### Feature 2: Recommending Matches

**Requirement:** For a given user, return a list of other users (within their preferred age range, gender, and distance) to show in the swiping queue.

**Challenge:** Querying on multiple filters (age, gender, location) efficiently with millions of active users.

**Solutions:**

1. **Use a NoSQL database (Cassandra / DynamoDB) designed for scale and location‑based queries.**  
   - Shard by location (e.g., geohash prefix) so that users in the same area are stored together.  
   - Within each shard, use secondary indexes for age/gender.

2. **Manual sharding with SQL (if NoSQL is not allowed):**  
   - Partition users by location ranges (e.g., city or grid cell).  
   - Each shard holds users from a specific geographic region.  
   - To recommend, the service queries the shard(s) covering the user’s location, then filters by age/gender in‑memory or via a covering index.

3. **Geospatial indexing:** Use a geohash or `PostGIS` (if using PostgreSQL) to efficiently find points within a radius.

**ASCII: Recommendation Flow**
```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Recommendation Request: "Get 20 profiles for user X, age 20-30, female,  │
  │  within 50km of (lat, lon)"                                               │
  └─────────────────────────────────┬───────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  RECOMMENDATION SERVICE                                                     │
  │  1. Compute geohash of user's location (e.g., 'u4x8')                      │
  │  2. Use consistent hashing to route to the shard containing that region    │
  │  3. Query that shard:                                                      │
  │     - SELECT * FROM users WHERE geohash_prefix = 'u4x8'                   │
  │       AND age BETWEEN 20 AND 30 AND gender = 'F'                          │
  │     - Also check neighboring geohashes for users near the border          │
  │  4. Sort by distance (compute haversine)                                  │
  │  5. Return top 20 (excluding users already swiped left)                   │
  └─────────────────────────────────────────────────────────────────────────────┘
```

**Sharding Strategy (Location‑Based):**
- Partition key: geohash prefix (e.g., first 4 characters).
- Each shard (node) handles a set of geohashes.
- Consistent hashing ensures even distribution and minimal rebalancing on node changes.

**Cassandra / DynamoDB Table Design:**
```
  Table: users_by_location
  Partition Key: geohash_prefix (string)
  Clustering Key: user_id (so we can order)
  Columns: user_id, name, age, gender, lat, lon, etc.
```

**CDN for images:** When returning the list, send only the image URLs (pointing to CDN). The client fetches images directly from CDN, reducing load on the backend.

---

#### Feature 3: Noting Matches (Swipe Tracking)

**Requirement:** Record when a user swipes right (likes) or left (passes) on a profile. When both users like each other, create a match.

**Architecture Decisions:**

- **Swipe history is stored on the client side (mobile) for performance**, but **matches must be stored on the server** as the source of truth.
- If a user uninstalls and reinstalls, they lose their swipe history, but matches are recovered from the server.
- **Match Service** maintains a table of (user1_id, user2_id) pairs with a timestamp.

**Swiping Flow:**
```
  Client swipes right on user B.
      │
      ▼
  Gateway → Match Service
      │
      ▼
  Match Service:
    1. Insert a record "A likes B" (if not already exists).
    2. Check if "B likes A" exists.
       - If yes → new match! → Insert match record (A,B) and notify both users.
       - If no → just store the like.
```

**Match Table:**
```
  matches: (user1_id, user2_id, matched_at, status)
  Unique index on (user1_id, user2_id) and (user2_id, user1_id) for fast lookup.
```

**Notification:** When a match occurs, the Match Service publishes an event (e.g., `MatchCreated`) to a message broker. The Session Service picks it up and pushes a real‑time notification to both clients via WebSocket.

---

#### Feature 4: Direct Messaging (Chat)

**Requirement:** After matching, users can exchange real‑time messages.

**Why HTTP is insufficient:** HTTP is request‑response; the server cannot push messages to the client. The client would have to poll (pull) every few seconds, which is inefficient.

**Solution:** Use **WebSocket** (or XMPP) to maintain a persistent, bidirectional connection between client and server.

**Architecture:**

- **Session Service:** Maintains a mapping from `user_id` to the active WebSocket connection (or connection ID).
- When User A sends a message to User B:
  1. The message goes through the Gateway.
  2. The Gateway calls the **Match Service** to verify that A and B are indeed matched.
  3. If valid, the Gateway forwards the message to the **Session Service**.
  4. The Session Service looks up B's connection and pushes the message over the WebSocket.
  5. The message is also stored in a persistent chat database (for history).

**Chat Database:**
```
  messages: (id, from_user_id, to_user_id, content, timestamp, read_status)
```

**WebSocket Connection Lifecycle:**
- When the user opens the app, a WebSocket connection is established.
- The client sends an authentication token, and the Session Service registers the connection for that user.
- When the user closes the app, the connection is closed and the mapping is removed.

**ASCII: Chat Flow**
```
  [User A] ──(WebSocket)──► Gateway ──► Match Service (check match)
                                        │
                                        │ (valid)
                                        ▼
                                  [Session Service]
                                        │
                                        │ Look up User B's connection
                                        ▼
                                  Push message over WebSocket to User B
                                        │
                                        ▼
                                  [User B] receives message in real time
```

**Message ordering and delivery guarantees:**
- Use sequence numbers and store messages persistently.
- If a user is offline, the message is stored; when they reconnect, the server sends missed messages (pull or push).

---

### 5. COMPLETE SYSTEM ARCHITECTURE — ALL SERVICES COMBINED

**ASCII: Tinder Microservices Architecture**
```
  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
  │                                    MOBILE CLIENTS                                       │
  │  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
  │  │  WebSocket connection (for chat)   │   HTTP/HTTPS (for API calls)               │   │
  │  └──────────────────────────────────────┴────────────────────────────────────────────┘   │
  └──────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                             │
                                             ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
  │                                    API GATEWAY                                         │
  │  - JWT token validation                                                                 │
  │  - Rate limiting                                                                        │
  │  - Route requests to appropriate service                                               │
  └─────┬──────────────────────┬──────────────────────┬─────────────────────┬───────────────┘
        │                      │                      │                     │
        ▼                      ▼                      ▼                     ▼
  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
  │  Profile    │      │   Image     │      │  Match      │      │  Session    │
  │  Service    │      │   Service   │      │  Service    │      │  Service    │
  │  - User     │      │  - Upload   │      │  - Record   │      │  - Track    │
  │    CRUD     │      │  - Resize   │      │    likes    │      │    WebSocket│
  │  - Auth     │      │  - CDN URL  │      │  - Create   │      │    mapping  │
  │    helper   │      │    metadata │      │    matches  │      │  - Push     │
  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘      │    messages │
         │                    │                    │             └──────┬──────┘
         ▼                    ▼                    ▼                    │
  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐           │
  │  Profile DB │      │  Image DB   │      │  Match DB   │           │
  │  (Postgres) │      │  (Postgres) │      │  (Postgres) │           │
  └─────────────┘      └─────────────┘      └─────────────┘           │
                                                                       │
                                                                       ▼
                                                  ┌─────────────────────────────┐
                                                  │  Recommendation Service     │
                                                  │  - Fetch candidate profiles│
                                                  │  - Filter by age/gender/   │
                                                  │    location (geohash)      │
                                                  └──────────────┬──────────────┘
                                                                 │
                                                                 ▼
                                             ┌───────────────────────────────────┐
                                             │  Recommendation DB (Cassandra)   │
                                             │  - Sharded by geohash prefix     │
                                             │  - Covers location-based queries │
                                             └───────────────────────────────────┘
```
**Additional Components:**
- **CDN / S3:** Stores images; serves them globally via CDN.
- **Message Broker (Kafka/RabbitMQ):** Used for event‑driven communication (e.g., match notifications, profile updates).
- **Cache (Redis):** Caches frequently accessed profiles, session data, or recommendation results.

---

### 6. SCALABILITY AND FAULT TOLERANCE CONSIDERATIONS

| Component | Scaling Strategy | SPOF Mitigation |
|-----------|------------------|-----------------|
| **Gateway** | Run multiple instances behind a load balancer (active‑active). | Load balancer cluster; health checks. |
| **Profile Service** | Stateless; scale horizontally behind gateway. | Multiple instances; no local state. |
| **Image Service** | Stateless; scale horizontally. | S3 is highly available; use CDN. |
| **Recommendation Service** | Stateless; scale horizontally. | Database (Cassandra) is distributed and replicated. |
| **Match Service** | Stateless; scale horizontally. | Database with master‑slave replication. |
| **Session Service** | Stateful (holds WebSocket connections). Use consistent hashing to assign users to session nodes. | Use distributed session store (e.g., Redis Cluster) or sticky sessions; replicate across AZs. |
| **Databases** | Profile/Match DB: read replicas for read scalability; sharding if needed. Recommendation DB: naturally sharded. | Multi‑AZ replication; automatic failover. |
| **WebSocket Connections** | Use a gateway that supports WebSocket; can be scaled with dedicated session nodes. | Heartbeat checks; reconnect logic in client. |

**CAP Trade‑off:** Tinder prioritises **Availability and Partition Tolerance** over strict Consistency. For example, match notifications may be delivered out of order or with slight delay; user sees “matched” only after both likes are persisted, but eventual consistency is acceptable.

**Service Degradation:**
- Under heavy load, the Recommendation Service can return smaller profiles (only IDs and names) or reduce the radius to limit results.
- Image Service can return lower‑resolution thumbnails.

---

### 7. EDGE CASES AND FAILURE SCENARIOS

| Scenario | Handling |
|----------|----------|
| **User swipes right on someone offline** | The like is stored in Match Service; when the other user comes online, they get a notification (via push or next sync). |
| **WebSocket disconnects** | Session Service removes mapping. When user reconnects, they resend token; missed messages are fetched from chat DB. |
| **Recommendation returns stale profiles** | Profiles might be cached; acceptable because users don’t change location frequently. Use TTL on cache. |
| **Mutual match race condition** | Two users like each other simultaneously. Use database unique constraint to prevent duplicate matches; the first insert wins, second inserts silently ignored or returns success. |
| **Image upload fails** | Client retries with exponential backoff; if still fails, notify user. |
| **High traffic (e.g., New Year’s Eve)** | Scale out all stateless services; recommendation DB is sharded, so it can handle the load; cache more aggressively. |
| **Location spoofing** | Use GPS validation; if a user claims to be in a different country, flag for review. Not a critical security concern for Tinder. |

---

### 8. DATA FLOW — FULL REQUEST CYCLE EXAMPLES

#### a) Swiping Right
```
  Client ──► Gateway (auth) ──► Match Service
                                  │
                                  ├── 1. Insert like (A likes B)
                                  ├── 2. Check if B likes A already
                                  │       │
                                  │       ▼ (if yes)
                                  │   Insert match (A,B)
                                  │   Publish "MatchCreated" event
                                  │       │
                                  │       ▼
                                  │   Session Service pushes notification to A and B
                                  │
                                  └── 3. Return success to client
```

#### b) Sending a Chat Message
```
  Client A ──► Gateway (auth) ──► Match Service (verify A and B are matched)
                                  │
                                  ├── 4. If matched → forward to Session Service
                                  │       │
                                  │       ├── Look up B's WebSocket connection
                                  │       ├── Push message over WebSocket to B
                                  │       └── Store message in Chat DB
                                  │
                                  └── 5. Return ACK to Client A
```

---

### 9. RECOMMENDATION ENGINE DEEP DIVE (Location Sharding)

**Why location sharding is crucial:**
- Queries are always location‑based (“show me people near me”).
- If you shard by user ID, a query would need to scatter to all shards → slow.
- Sharding by location means a query hits only the shard covering the user’s region.

**Geohash example:**
- Geohash divides the world into a grid. Each cell has a string, e.g., `u4x8` for a region in Berlin.
- We shard by the first 4 characters of the geohash.
- Users in the same cell are on the same shard.
- For a query, compute the geohash of the user’s location, then query that shard (and its neighbours if boundary is near).

**Replication and consistency:**
- Cassandra replicates each shard across multiple nodes (RF=3) for fault tolerance.
- Reads can be served from any replica; writes are quorum‑based for eventual consistency.

---

### 10. COMPARISON TABLE — TINDER VS OTHER SOCIAL APPS

| Feature | Tinder | Instagram | WhatsApp |
|---------|--------|-----------|----------|
| **Primary content** | User profiles, images | Posts, images, stories | Messages, media |
| **Recommendation** | Location‑based matching | Feed algorithm (graph‑based) | None (contacts) |
| **Real‑time chat** | Yes (after match) | No (comments are async) | Yes (always) |
| **Image storage** | CDN + S3 | CDN + S3 | CDN + S3 (media) |
| **Database** | SQL for profiles/matches; NoSQL for location | SQL + cache + sharding | SQL + cache |
| **Auth** | Token via Gateway | Session/cookie | Phone number + JWT |

---

### 11. PLAIN-ENGLISH FINAL TAKEAWAY

1. **Start with features, not data.** For Tinder, the four core features are: store profiles (with images), recommend matches, record matches, and chat.
2. **Gateway** centralises authentication, routing, and rate limiting, keeping microservices clean.
3. **Images are stored as files (S3/CDN)** — cheaper, faster, and easier than database blobs. Metadata is kept in a separate service.
4. **Recommendation is the hardest part.** Use location‑based sharding (geohash) and a NoSQL database (Cassandra) to efficiently query by location, age, and gender.
5. **Matches are stored on the server**; swipe history can be client‑side to reduce load.
6. **Chat requires WebSocket** for real‑time, bidirectional messaging. A Session Service tracks active connections.
7. **Scale horizontally:** stateless services (Gateway, Profile, Image, Match, Recommendation) can be replicated; the Recommendation DB is naturally sharded.
8. **Event‑driven communication** (e.g., for match notifications) decouples services and improves responsiveness.
9. **Fault tolerance** via replication (database, S3), multi‑AZ deployment, and health checks.
10. **In a System Design Interview**, walk through each feature, justify your choices (file vs blob, SQL vs NoSQL, WebSocket vs polling), and discuss scaling bottlenecks and trade‑offs.

