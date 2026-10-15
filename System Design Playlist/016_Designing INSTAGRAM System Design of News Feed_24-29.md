## DESIGNING INSTAGRAM (NEWS FEED) — DEFINITIONS-FIRST, EXHAUSTIVE EXPLANATION WITH ASCII DIAGRAMS

---

### 1. PLAIN-ENGLISH DEFINITIONS (Read First)

| Term | Definition in One Sentence (Zero Jargon) |
|------|------------------------------------------|
| **News Feed** | A constantly updating list of posts (images, videos, text) from the people you follow, ordered by time or relevance, shown to you when you open the app. |
| **Post** | A single content item created by a user, typically containing an image/video, a caption, a timestamp, and associated metadata (likes, comments). |
| **Fan‑out** | The process of delivering a new post from one user to all of their followers — like a radio broadcast that must reach many receivers. |
| **Push Model** | When a new post is created, the server actively pushes it to the news feed cache of every follower (real‑time, but expensive for celebrities). |
| **Pull Model** | When a user opens the app, the server computes their feed on‑the‑fly by querying posts from followed users (on‑demand, simpler but slower). |
| **Pre‑computation (Write‑time Fan‑out)** | Generating a user’s news feed in advance (at the time posts are created) and storing the result in a cache, so reads are extremely fast. |
| **Activity Table** | A database table that tracks all actions (likes, comments, follows) with a type discriminator (e.g., `post` or `comment`) to handle polymorphic relationships. |
| **Feed Cache** | A fast in‑memory store (Redis) that holds the pre‑computed top N posts for each user, so serving the feed is a quick lookup rather than a heavy database query. |
| **Fan‑out on Write vs Read** | Write fan‑out: spend work when a post is created (push to followers). Read fan‑out: spend work when a user requests their feed (pull from followed users). |
| **Celebrity / Super‑user Problem** | A user with millions of followers; pushing a single post to all of them would overwhelm the system — requires special handling (e.g., hybrid push‑pull). |
| **Load Balancer / Gateway Snapshot** | A central routing table (maintained by the load balancer) that tells the gateway which service instance to forward a request to, based on consistent hashing of the user ID. |
| **Idempotent Like** | A like operation that can be applied multiple times without causing duplicate likes or inconsistent counts — typically achieved using a unique constraint or idempotency key. |

---

### 2. KEY TERMS GLOSSARY (With Analogies)

| Term | Analogy |
|------|---------|
| **News Feed** | A personalised newspaper that gets updated every time someone you follow publishes an article. |
| **Post** | A single article in that newspaper, with a photo and a caption. |
| **Fan‑out** | The newspaper delivery system that copies today’s paper and distributes it to all subscribers. |
| **Push Model** | The delivery boy knocks on every subscriber’s door and hands them the paper immediately. |
| **Pull Model** | Subscribers must walk to the newsstand and ask for the paper when they want it. |
| **Pre‑computation** | The newspaper prints all copies in advance so that when a subscriber arrives, they pick up a ready‑made copy. |
| **Activity Table** | A guest book that records every action (like, comment, follow) with a note saying what type of action it is. |
| **Feed Cache** | A fast shelf near the cash register that holds the latest newspapers, so you don’t have to go to the warehouse. |
| **Celebrity Problem** | When a famous person publishes a post, the system cannot knock on millions of doors instantly; it must use a different strategy (e.g., bulk delivery or let fans come to the stand). |
| **Load Balancer Snapshot** | A map at the newspaper office that tells each delivery person which truck to use based on the subscriber’s address. |

---

### 3. CORE FEATURES OF INSTAGRAM (Derived from Requirements)

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Store & Retrieve Images** | Users upload photos/videos; they must be stored durably and served quickly via CDN. |
| 2 | **Like & Comment on Posts** | Users can like a post or a comment; they can add a comment (text) to a post. |
| 3 | **Follow / Unfollow** | Users can follow other users to see their posts in their feed. |
| 4 | **News Feed** | The home screen showing recent posts from followed users in reverse chronological order (or ranked). |

> **Important:** In an interview, always confirm which features to focus on. The transcript assumes the interviewer asks for these four.

---

### 4. DATABASE SCHEMA — ER DIAGRAM FOR FEATURES 2 & 3

#### a) Users Table
```
  users
  ┌────────────┬──────────┬────────────┬─────────────┐
  │ id (PK)    │ username │ email      │ password    │
  ├────────────┼──────────┼────────────┼─────────────┤
  │ 1          │ alice    │ a@x.com    │ hash        │
  │ 2          │ bob      │ b@x.com    │ hash        │
  └────────────┴──────────┴────────────┴─────────────┘
```

#### b) Posts Table
```
  posts
  ┌────────────┬───────────┬──────────────┬─────────────┐
  │ id (PK)    │ user_id   │ image_url    │ caption     │
  │            │ (FK)      │ (S3/CDN)     │             │
  ├────────────┼───────────┼──────────────┼─────────────┤
  │ 101        │ 1         │ s3://...     │ "Sunset"    │
  │ 102        │ 2         │ s3://...     │ "Coffee"    │
  └────────────┴───────────┴──────────────┴─────────────┘
  Also: created_at, updated_at, location, etc.
```

#### c) Comments Table (Single‑level – no nesting for simplicity)
```
  comments
  ┌────────────┬───────────┬─────────────┬─────────────┬────────────┐
  │ id (PK)    │ post_id   │ user_id     │ content     │ created_at │
  │            │ (FK)      │ (FK)        │ (text)      │            │
  ├────────────┼───────────┼─────────────┼─────────────┼────────────┤
  │ 201        │ 101       │ 2           │ "Nice!"     │ T1         │
  │ 202        │ 101       │ 3           │ "Beautiful" │ T2         │
  └────────────┴───────────┴─────────────┴─────────────┴────────────┘
```

#### d) Likes Table (Polymorphic — can like either a Post or a Comment)
```
  likes
  ┌────────────┬────────────┬───────────┬─────────────┬─────────────┐
  │ id (PK)    │ user_id    │ parent_id │ parent_type │ created_at  │
  │            │ (FK)       │           │ (post/comment)│            │
  ├────────────┼────────────┼───────────┼─────────────┼─────────────┤
  │ 301        │ 3          │ 101       │ post        │ T3          │
  │ 302        │ 1          │ 201       │ comment     │ T4          │
  └────────────┴────────────┴───────────┴─────────────┴─────────────┘
  • Unique constraint on (user_id, parent_id, parent_type) to prevent double‑likes.
  • Index on parent_id + parent_type for fast count queries.
```

#### e) Follows Table
```
  follows
  ┌────────────┬───────────────┬───────────────┬──────────────┐
  │ id (PK)    │ follower_id   │ followee_id   │ created_at   │
  │            │ (FK)          │ (FK)          │              │
  ├────────────┼───────────────┼───────────────┼──────────────┤
  │ 401        │ 2             │ 1             │ T5           │
  │ 402        │ 3             │ 1             │ T6           │
  └────────────┴───────────────┴───────────────┴──────────────┘
  • Unique constraint on (follower_id, followee_id).
  • Index on followee_id for “who follows me” queries.
  • Index on follower_id for “who I follow” queries.
```

#### f) Activity Table (Alternative to storing aggregated counts in posts)
```
  activity
  ┌────────────┬────────────┬────────────┬────────────┐
  │ id (PK)    │ parent_id  │ parent_type│ like_count │
  │            │            │ (post/     │            │
  │            │            │  comment)  │            │
  ├────────────┼────────────┼────────────┼────────────┤
  │ 1          │ 101        │ post       │ 42         │
  │ 2          │ 201        │ comment    │ 5          │
  └────────────┴────────────┴────────────┴────────────┘
  • This table stores pre‑aggregated counts (updated via triggers or application logic) to avoid expensive COUNT(*) queries.
  • It is denormalised, but acceptable for read‑heavy workloads.
```

---

### 5. CORE ARCHITECTURE — SERVICES AND DATA FLOW

#### a) High‑Level Service Diagram

**ASCII: Complete Instagram Architecture (Services)**
```
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                       MOBILE CLIENTS                                       │
  │  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
  │  │  HTTP/HTTPS (API calls)    │    WebSocket (real‑time notifications – optional)     │   │
  │  └─────────────────────────────────────┬───────────────────────────────────────────────┘   │
  └─────────────────────────────────────────┼───────────────────────────────────────────────────┘
                                            │
                                            ▼
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │                              API GATEWAY + LOAD BALANCER                                   │
  │  - JWT authentication, rate limiting, protocol translation                                │
  │  - Maintains a snapshot of service endpoints (updated every 10s via service discovery)     │
  │  - Routes requests to appropriate service instance using consistent hashing (user_id)     │
  └──────┬────────────┬─────────────┬─────────────┬──────────────┬───────────────┬────────────┘
         │            │             │             │              │               │
         ▼            ▼             ▼             ▼              ▼               ▼
  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
  │  USER FEED │ │ POST       │ │ FOLLOW     │ │ ACTIVITY   │ │ IMAGE      │ │ PROFILE    │
  │  SERVICE   │ │ SERVICE    │ │ SERVICE    │ │ SERVICE    │ │ SERVICE    │ │ SERVICE    │
  │  (pre‑     │ │ (CRUD on   │ │ (follow/   │ │ (likes/    │ │ (upload/   │ │ (user meta,│
  │   compute  │ │  posts)    │ │  unfollow) │ │  comments) │ │  resize,   │ │  auth)     │
  │   feeds)   │ │            │ │            │ │            │ │  CDN URL)  │ │            │
  └─────┬──────┘ └──────┬─────┘ └──────┬─────┘ └──────┬─────┘ └──────┬─────┘ └──────┬─────┘
        │               │              │              │              │               │
        │        ┌──────┴──────┐       │       ┌──────┴──────┐ ┌──────┴──────┐       │
        └────────┤ POST DB     │       └───────┤ ACTIVITY DB │ │ IMAGE DB    │       │
                 │ (SQL)       │               │ (SQL)       │ │ (metadata)  │       │
                 └─────────────┘               └─────────────┘ └──────┬──────┘       │
                                                                      │              │
                                                                      ▼              │
                                                              ┌─────────────────┐    │
                                                              │ S3 / CDN        │    │
                                                              │ (images)        │    │
                                                              └─────────────────┘    │
                                                                                      │
  ┌────────────┐ ┌────────────┐ ┌────────────┐                                      │
  │ FOLLOW DB  │ │ FEED CACHE │ │ PROFILE DB │                                      │
  │ (SQL)      │ │ (Redis)    │ │ (SQL)      │                                      │
  └────────────┘ └────────────┘ └────────────┘                                      │
                                                                                      │
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  MESSAGE BROKER (Kafka / RabbitMQ) – for event‑driven updates                  │
  │  e.g., "PostCreated" event triggers feed pre‑computation and notifications    │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

#### b) Service Responsibilities

| Service | Responsibility | Key APIs |
|---------|----------------|----------|
| **Gateway** | Auth, routing, rate limiting | Forward requests to services |
| **User Feed Service** | Serve pre‑computed feed; update feed cache on new posts | `GET /feed/{user_id}`; `POST /feed/update` (internal) |
| **Post Service** | Create, read, delete posts | `POST /posts`; `GET /posts/{post_id}`; `GET /posts?user_ids=...` |
| **Follow Service** | Follow/unfollow; list followers/following | `POST /follow`; `DELETE /follow`; `GET /followers/{user_id}` |
| **Activity Service** | Like/unlike, add/delete comments | `POST /likes`; `DELETE /likes`; `POST /comments` |
| **Image Service** | Upload, resize, generate CDN URL | `POST /upload`; `GET /image/{id}` (via CDN) |
| **Profile Service** | User metadata, authentication | `POST /register`; `POST /login`; `GET /profile/{id}` |

---

### 6. DEEP DIVE — NEWS FEED GENERATION

The **news feed** is the most complex feature. The naive approach (read‑time fan‑out) does not scale.

#### a) Naive Approach (Read‑time Fan‑out)
```
  On user request:
    1. Follow Service → get list of followed user IDs.
    2. For each followed user, call Post Service → get their recent posts.
    3. Merge and sort all posts by time.
    4. Return top N posts.
  Problem: If a user follows 1000 people, this requires 1000+ database queries → too slow.
```

#### b) Optimised Approach (Write‑time Fan‑out – Pre‑computation)

**Core idea:** When a post is created, push it to the feed cache of all followers *at write time*, so reads are O(1).

**Flow:**
1. User A creates a post → `POST /posts` (Post Service).
2. Post Service stores the post in the Post DB.
3. Post Service publishes an event: `"PostCreated": { post_id, user_id, timestamp }` to a message broker.
4. The **User Feed Service** consumes this event:
   - It calls the Follow Service to get the list of followers of user A.
   - For each follower, it adds the new post to their feed cache (Redis) at the **front** of the list.
   - It ensures the list size stays ≤ 1000 (or some configured limit).
5. When user B opens their feed, the User Feed Service simply reads from Redis `feed:{user_id}` and returns the top 20 posts instantly.

**ASCII: Write‑time Fan‑out Flow**
```
  ┌──────────┐   1. Create post    ┌────────────┐
  │  User A  │─────────────────────►│ POST       │
  └──────────┘                      │ SERVICE    │
                                    └──────┬─────┘
                                           │
                                           │ 2. Store post in DB
                                           ▼
                                    ┌────────────┐
                                    │  POST DB   │
                                    └────────────┘
                                           │
                                           │ 3. Publish "PostCreated" event
                                           ▼
                                    ┌────────────────────┐
                                    │  MESSAGE BROKER    │
                                    │  (Kafka / Rabbit)  │
                                    └────────┬───────────┘
                                             │
                                             │ 4. Consume event
                                             ▼
                                    ┌────────────────────┐
                                    │  USER FEED SERVICE │
                                    └────────┬───────────┘
                                             │
                                             │ 5. Call Follow Service
                                             │    → get followers of A
                                             ▼
                                    ┌────────────────────┐
                                    │  FOLLOW SERVICE    │
                                    └────────┬───────────┘
                                             │
                                             │ 6. For each follower:
                                             │    LPUSH feed:{follower_id} post_id
                                             │    LTRIM feed:{follower_id} 0 999
                                             ▼
                                    ┌────────────────────┐
                                    │  FEED CACHE (Redis)│
                                    │  feed:2 = [101, ..]│
                                    │  feed:3 = [101, ..]│
                                    └────────────────────┘
```

**Benefits:**
- Feed reads are **extremely fast** (one Redis lookup).
- The system scales with the number of posts, not the number of reads.

**Costs:**
- **Fan‑out cost** is paid once per post, not per user request.
- For a user with 1M followers, the User Feed Service must insert 1M entries (one per follower). This is the **celebrity problem**.

---

### 7. THE CELEBRITY / SUPER‑USER PROBLEM

**Problem:** When a celebrity with millions of followers makes a post, a simple write‑time fan‑out would cause a “fan‑out storm” — millions of Redis writes in a short time, potentially overwhelming the system.

**Solutions:**

| Approach | Description | When to Use |
|----------|-------------|-------------|
| **Pure Push** | Fan‑out to all followers (write‑time). | For normal users (< 10k followers). |
| **Pure Pull** | Do not pre‑compute; compute feed on‑the‑fly at read time using a cache of the celebrity’s recent posts. | For celebrities (super‑users) with > 1M followers. |
| **Hybrid (Push for small, Pull for large)** | If follower count is below a threshold (e.g., 10k), use push. Otherwise, treat the user as “celebrity” and use pull for their posts. | Most practical. |
| **Pull with Cache** | For celebrity posts, cache the post in a “celebrity post cache”. When a follower requests their feed, the User Feed Service merges their personal feed (push) with the celebrity’s latest posts (pull). | Hybrid with minimal overhead. |

**ASCII: Hybrid Feed Generation**
```
  User B's Feed = [Push‑based posts from non‑celebrity follows] +
                   [Pull‑based posts from celebrity follows (latest 5)]

  For normal followers:
    Feed is pre‑computed and stored in Redis.
  For celebrities:
    When User B opens their feed:
      1. Read pre‑computed feed from Redis (small/medium posts).
      2. Query a "celebrity post cache" (e.g., Redis list per celebrity) for their latest 5 posts.
      3. Merge and sort both sets by timestamp.
      4. Return top 20.

  This avoids pushing celebrity posts to millions of feeds.
```

**Implementation Details:**
- The Follow Service maintains a `is_celebrity` flag (or checks follower count at post time).
- The Post Service, when creating a post, checks the user’s follower count.
  - If ≤ threshold → publish `PostCreated` event → push fan‑out.
  - If > threshold → publish `CelebrityPostCreated` event → store in celebrity cache; do NOT fan‑out.
- The User Feed Service, on a read request, merges the push‑based feed with the celebrity cache entries.

---

### 8. CACHING STRATEGY FOR FEEDS

- **Cache Layer:** Redis (in‑memory, fast).
- **Key:** `feed:{user_id}`
- **Value:** A list of post IDs (or structured post objects) in reverse chronological order.
- **Size Limit:** Keep only the last 1000 posts per user. Older posts are stored in the database and can be fetched on demand (e.g., scrolling down).
- **Eviction Policy:** LRU or TTL (e.g., 24 hours) for inactive users.

**Cache Update on New Post (Push):**
```
  LPUSH feed:123 456        // add new post ID 456 to the front
  LTRIM feed:123 0 999      // keep only 1000 posts
```

**Cache Read:**
```
  LRANGE feed:123 0 19      // get top 20 posts
```

**Cache Miss / Recovery:**
- If the cache is empty (e.g., service restarted), recompute the feed from the database using the naive approach (pull from followed users) and repopulate the cache.

---

### 9. NOTIFICATIONS — PUSH VS PULL

| Aspect | Push (Server‑initiated) | Pull (Client‑initiated) |
|--------|--------------------------|--------------------------|
| **How it works** | Server sends notification via WebSocket when a new post arrives. | Client polls the server every 10‑30s for updates. |
| **Latency** | Near‑real‑time (< 1s). | Up to poll interval (e.g., 10s). |
| **Server Load** | High for celebrities (millions of pushes). | Load depends on number of active users polling. |
| **Battery/Network** | Efficient (no polling). | Wastes battery and bandwidth. |
| **Recommendation** | For normal users. | For celebrities (to avoid fan‑out storm). |

**Hybrid Notification:**
- Use **WebSocket push** for normal users.
- Use **pull (or long polling)** for celebrities’ followers, or allow the client to periodically check the feed cache.

**ASCII: Notification Decision**
```
  IF follower_count(user) < THRESHOLD:
      USE PUSH (WebSocket) → notify all followers immediately.
  ELSE:
      USE PULL → followers will see the post when they next refresh their feed.
```

---

### 10. LOAD BALANCING AND ROUTING

- The gateway uses a **snapshot** of the system (updated every 10s) from a service registry (e.g., Consul, Eureka).
- For each request, the gateway hashes the `user_id` and uses consistent hashing to determine which instance of the User Feed Service (or Post Service) to forward the request to.
- This ensures that requests for the same user are routed to the same instance, which is beneficial for cache locality (if using local caches).

**ASCII: Consistent Hashing Routing**
```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  Request: GET /feed/123                                                    │
  │  Hash(123) = 0x4A3F → on ring → instance = Feed‑Service‑Node‑2           │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

### 11. IMAGE STORAGE — RECAP FROM TINDER

- Images are stored as **files** in a distributed file system (S3 / GCS).
- A **CDN** serves images globally for low latency.
- The database stores only the **URL** (and metadata) – not the binary blob.
- The Image Service handles upload, resizing (thumbnails), and URL generation.

**ASCII: Image Storage Flow**
```
  Upload → Image Service → S3 (original) + CDN URL
                              │
                              ▼
                         Resize (thumbnails)
                              │
                              ▼
                         Store metadata in Image DB:
                         (image_id, user_id, url, thumbnail_url)
```

---

### 12. EDGE CASES AND FAILURE SCENARIOS

| Scenario | Handling |
|----------|----------|
| **Feed Cache Node Down** | Redis cluster with replication; automatic failover. If unavailable, fallback to database recomputation (pull). |
| **Celebrity Posts to Millions** | Use hybrid push‑pull; avoid fan‑out; notify via pull or lazy loading. |
| **Duplicate Like** | Use unique key on (user_id, parent_id, parent_type) in the likes table to prevent double‑likes. |
| **Comment on Deleted Post** | Foreign key or application‑level check; return 404 if post is gone. |
| **User Deletes Account** | Soft‑delete; their posts remain but are marked as deleted; feed entries are removed lazily. |
| **High Read Traffic** | Read replicas for SQL databases; cache as much as possible; CDN for images. |
| **High Write Traffic (Posts)** | Use message queue to decouple post creation from feed fan‑out; batch writes to cache. |

---

### 13. SYSTEM DESIGN DECISION SUMMARY

| Decision Point | Choice | Rationale |
|----------------|--------|-----------|
| **Images** | File system + CDN (not DB blobs). | Cheaper, faster, CDN‑friendly. |
| **Likes/Comments** | Polymorphic `likes` table with `parent_type`. | Supports liking both posts and comments. |
| **Feed Generation** | Write‑time fan‑out (push) with cache. | Reads are O(1); optimal for social feeds. |
| **Celebrity Handling** | Hybrid push‑pull. | Avoids fan‑out storm for super‑users. |
| **Cache** | Redis for feeds. | Fast, supports list operations (LPUSH/LTRIM). |
| **Database** | SQL for transactions (likes, follows); NoSQL (Cassandra) for location‑based queries (optional). | ACID for critical data; eventual consistency for feeds. |
| **Routing** | Consistent hashing at gateway. | Minimises re‑routing on node changes. |
| **Notifications** | WebSocket push + pull fallback. | Real‑time for normal users; scalable for celebrities. |

---

### 14. REAL‑WORLD INSIGHTS

- **Instagram** initially used a **push model** for feed generation, but later moved to a more sophisticated ranking and caching system.
- **Twitter** famously uses a **pull model** for celebrities (the “famous” list) and push for normal users.
- **Facebook** uses **write‑time fan‑out** for close friends, and **read‑time fan‑out** for pages with large followings.
- **Redis** is widely used for feed caching because of its low latency and list data structure.
- **CDNs** are essential for serving images and videos — they offload 90%+ of traffic from the origin servers.

---

### 15. PLAIN-ENGLISH FINAL TAKEAWAY

1. **Instagram = 4 main features:** Store images, like/comment, follow, and the news feed.
2. **Feed is the hardest** – a naive “pull on every read” does not scale.
3. **Pre‑compute feeds** (write‑time fan‑out) – when a post is created, push it to the feed cache of all followers.
4. **Use Redis** as the feed cache – `LPUSH` to add new posts, `LRANGE` to read the top 20.
5. **Celebrity problem:** For users with millions of followers, avoid full fan‑out; use a **hybrid model** – push for normal users, pull (cache) for celebrity posts.
6. **Images:** Store as files in S3, serve via CDN; store only the URL in the database.
7. **Likes/Comments:** Use a polymorphic likes table with `parent_type` to support different parent entities (posts, comments).
8. **Follows:** Simple table with `follower_id` and `followee_id` – index both columns.
9. **Notification:** Use WebSocket push for real‑time updates, but fall back to pull for celebrities to avoid fan‑out storms.
10. **In an interview:** Start by confirming features, draw the ER diagram, then design the services and the feed pre‑computation. Emphasise the push‑pull hybrid and caching strategy. Show that you understand the trade‑offs.
