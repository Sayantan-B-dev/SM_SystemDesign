## CACHING IN DISTRIBUTED SYSTEMS — DEFINITIONS-FIRST, EXHAUSTIVE EXPLANATION WITH ASCII DIAGRAMS

---

### 1. PLAIN-ENGLISH DEFINITIONS (Read First)

| Term | Definition in One Sentence (Zero Jargon) |
|------|------------------------------------------|
| **Cache** | A temporary, fast storage space that holds copies of frequently used data so future requests for that data can be served much more quickly than fetching it from the main database. |
| **Caching** | The act of storing copies of data in a fast storage layer (like RAM) to avoid repeating the same expensive work (like complex database queries) over and over. |
| **Cache Hit** | When a request for data finds that data already present inside the cache — the system returns the cached copy immediately. |
| **Cache Miss** | When a request for data does NOT find it in the cache — the system must go to the slower database, fetch it, and optionally store a copy in the cache for next time. |
| **Cache Eviction** | When the cache is full and a new piece of data needs to be stored, the cache must remove (evict) some older data to make room — like throwing out old groceries to fit new ones in the fridge. |
| **Cache Policy (Replacement Policy)** | A set of rules that decides which data to evict when the cache is full. Common policies are LRU (Least Recently Used) and LFU (Least Frequently Used). |
| **Write Policy** | A set of rules that decides how and when updates to data are written to both the cache and the main database. Options include write-through, write-behind, and write-around. |
| **Stale Data / Inconsistency** | When the cached copy of data is older than the version in the main database, because the database was updated but the cache was not — the cache now holds "stale" (outdated) information. |
| **Eventual Consistency** | A guarantee that the cache will eventually become consistent with the database, but there may be a period of time (lag) where the cache is stale. |
| **Cache Thrashing** | A situation where the cache repeatedly evicts and reloads the same data because the working set does not fit in the cache and the access pattern is cyclic — the cache is always missing, causing extra overhead instead of saving time. |
| **Hit Rate** | The percentage of requests that are satisfied by the cache (e.g., 90% hit rate means 9 out of 10 requests find data in cache). |
| **Distributed Cache** | A cache system that runs on its own cluster of servers (separate from application servers and database servers) and can be shared by many different microservices — e.g., Redis, Memcached. |

---

### 2. KEY TERMS GLOSSARY (With Analogies)

| Term | Analogy |
|------|---------|
| **Cache** | The fridge in your kitchen. You keep frequently used ingredients (milk, eggs) in the fridge so you do not have to go to the grocery store (database) every time. |
| **Cache Hit** | You open the fridge, the milk is there — you take it and use it immediately. |
| **Cache Miss** | You open the fridge, the milk is not there — you have to walk to the grocery store (database) to buy it. |
| **Cache Eviction** | The fridge is full. To put in a new bottle of juice, you throw out an older, rarely-used sauce bottle. |
| **LRU Policy** | When the fridge is full, you throw out the item that you haven't used in the longest time. |
| **LFU Policy** | When the fridge is full, you throw out the item that you use the least often (lowest frequency). |
| **Write-Through** | You buy a new ingredient and immediately put it in both the fridge (cache) and the grocery store (database) at the same time — always consistent but slower. |
| **Write-Behind** | You put the new ingredient only in the fridge immediately, and later, when you have time, you update the grocery store's inventory — faster but risks losing data if the fridge breaks. |
| **Stale Data** | You have an old carton of milk in your fridge that expired yesterday, but the grocery store sold fresh milk this morning. Your fridge is "stale." |
| **Thrashing** | You keep throwing out and re-buying the same three items because your fridge is too small for your meal-prepping routine — you are wasting time going to the store repeatedly. |
| **Distributed Cache** | A community fridge shared by all the restaurants in a food court. Every restaurant can put commonly used ingredients there instead of each maintaining its own small fridge. |

---

### 3. CORE MECHANISM — STEP-BY-STEP WITH ASCII

#### STEP 1: THE SLOW PATH — NO CACHE (Direct Database Hit)

**Scenario:** User requests their Instagram feed. The server queries the database, computes the feed, and returns it.

**ASCII: Request Without Cache**
```
  [Client (Mobile App)]
         │
         │ 1. Request: "Get my newsfeed"
         │ (Network time: 100 ms)
         ▼
  [Application Server]
         │
         │ 2. Query DB:
         │ "SELECT * FROM posts WHERE user_id=123
         │   JOIN followers... JOIN likes..."
         │ (Network time: 10 ms)
         ▼
  [Database Server]
         │
         │ 3. Database computes join (takes 50 ms CPU)
         │
         │ 4. Returns result (10 ms)
         ▼
  [Application Server]
         │
         │ 5. Return feed to client (100 ms)
         ▼
  [Client]

Total time = 100 + 10 + 50 + 10 + 100 = 270 ms.
```

**Problem:** Every request does full computation. Thousands of requests per second overload the database.

---

#### STEP 2: THE FAST PATH — WITH IN-MEMORY CACHE

**Scenario:** The server stores computed feeds in its local memory (cache) under the user's ID.

**ASCII: Request With Cache (Hit)**
```
  [Client]
     │
     │ Request (100 ms)
     ▼
  [Application Server with Local Cache]
     │
     │ 1. Check cache for key = "feed:user:123"
     │    → Cache hit! Data found in RAM.
     │    (1 ms lookup)
     │
     │ 2. Return cached feed to client (100 ms)
     ▼
  [Client]

Total time = 100 + 1 + 100 = 201 ms.
Saved 69 ms (database time eliminated).
```

**ASCII: Request With Cache (Miss)**
```
  [Client]
     │
     │ Request (100 ms)
     ▼
  [Application Server with Local Cache]
     │
     │ 1. Check cache for key = "feed:user:456"
     │    → Cache miss! Not found.
     │
     │ 2. Query Database (10 ms + 50 ms compute + 10 ms response)
     ▼
  [Database] ──► returns data (70 ms total)
     │
     ▼
  [Application Server]
     │
     │ 3. Store result in cache with key = "feed:user:456"
     │    (so next time it's a hit)
     │
     │ 4. Return data to client (100 ms)
     ▼
  [Client]

Total time = 100 + 1 + 70 + 100 = 271 ms (first time is slower).
Next time for same user: 201 ms (saved).
```

---

#### STEP 3: WHERE CACHING SAVES TIME — THE LATENCY BREAKDOWN

**ASCII: Latency Comparison (per request)**
```
  Without Cache:   [Network 100ms][DB Query 70ms][Network 100ms] = 270ms
  With Cache Hit:  [Network 100ms][Cache 1ms][Network 100ms]    = 201ms
  With Cache Miss: [Network 100ms][Cache 1ms][DB Query 70ms][Network 100ms] = 271ms

  Gain per hit = 69ms.
  If hit rate = 90%, average latency = 0.9*201 + 0.1*271 = 208ms.
  That's 23% improvement in user-perceived latency.
```

**The Takeaway:** Even a small 1ms cache lookup saves 70ms of database work. The higher the hit rate, the greater the savings.

---

#### STEP 4: THE HIT RATE PROBLEM — WHY NOT CACHE EVERYTHING?

**Question:** If caching is so great, why not put the entire database in cache?

**Answer:**
- A typical large database is terabytes or petabytes. Cache (RAM) is expensive and limited.
- You can only store the **most frequently accessed** subset (the "hot" data).
- The hit rate depends on the access pattern — if users ask for random data, the hit rate is low.

**ASCII: Hot vs Cold Data Distribution (Pareto / Zipf)**
```
  ┌─────────────────────────────────────────────────────────────────────┐
  │  80% of requests hit 20% of the data (Pareto Principle)           │
  │                                                                   │
  │  Request Frequency                                                │
  │     │   ████████████                                              │
  │     │   ████████████  ← Hot data (fits in cache)                  │
  │     │   ████████████                                              │
  │     │   ████████                                                  │
  │     │   ██████      ← Warm data (sometimes cached)              │
  │     │   ████                                                    │
  │     │   ██        ← Cold data (rarely accessed, stored only     │
  │     │   █            in database)                               │
  │     └────────────────────────────────────────────────────────────▶│
  │                     Data Items (sorted by popularity)            │
  └─────────────────────────────────────────────────────────────────────┘

  If cache size = 20% of database, hit rate ≈ 80%.
  If cache size = 10% of database, hit rate ≈ 60% (depends on skew).
```

**Your job as an engineer:** Predict which data will be hot and store that in cache. Use access logs and machine learning to fine-tune the cache content.

---

### 4. CACHE PLACEMENT — WHERE DO YOU PUT THE CACHE?

There are **three levels** of caching in a distributed system:

| Level | Location | Speed | Capacity | Shared? | Use Case |
|-------|----------|-------|----------|---------|----------|
| **Client Cache** | In the user's device (browser, mobile app) | Extremely fast (local RAM/disk) | Small (MBs) | No | User-specific data (profile, session, recent feed). |
| **Application (In-Memory) Cache** | Inside each application server (local map/object) | Very fast (local memory) | Limited by server RAM (GBs) | No (per instance) | Per-node frequently accessed data. |
| **Distributed Cache** | Separate cache cluster (e.g., Redis, Memcached) | Fast (network + memory) | Large (hundreds of GBs to TBs) | Yes (shared across services) | Shared data across microservices; centralised management. |
| **Database Internal Cache** | Inside the database engine (query cache, buffer pool) | Moderate | Managed by DB | No | Database internally caches query results and data pages. |

**ASCII: Three Cache Levels in a Production System**
```
  [Client Device]
     │
     │ 1. Client cache (local storage / browser cache)
     │    → User profile, recent feed, offline data.
     │
     ▼
  [API Gateway]
     │
     │ 2. Application Server (each has in-memory cache)
     │    → Per-instance cache for hot endpoints.
     │
     ▼
  [Microservice Cluster]
     │
     │ 3. Distributed Cache (Redis Cluster)
     │    → Shared across all services.
     │    → Session data, product catalog, computed aggregates.
     │
     ▼
  [Database Cluster (Sharded + Replicated)]
     │
     │ 4. Database internal cache (buffer pool, query cache)
     │    → Caches disk pages, execution plans.
     │
     ▼
  [Disk Storage]
```

**Which one to use?**
- In production, all three are used together.
- The **distributed cache** is what you, as a system architect, will design most often — it is shared, scalable, and decoupled from application code.

---

### 5. CACHE EVICTION POLICIES (Replacement Algorithms)

When the cache is full, you must evict something. The choice of policy directly affects hit rate.

#### a) Least Recently Used (LRU)

**Rule:** Evict the item that was accessed the **longest time ago** (the "coldest" in time).

**ASCII: LRU Operation (Cache size = 3)**
```
  Access sequence: [A, B, C, D, A, E]

  Step 1: Access A → Cache: [A]
  Step 2: Access B → Cache: [A, B]
  Step 3: Access C → Cache: [A, B, C]  (full)
  Step 4: Access D → Miss! Evict LRU = A (oldest).
                       Cache becomes: [B, C, D]
                       (A is removed, D added)
  Step 5: Access A → Miss! Evict LRU = B.
                       Cache becomes: [C, D, A]
  Step 6: Access E → Miss! Evict LRU = C.
                       Cache becomes: [D, A, E]

  Analysis: A was evicted in step 4, but accessed in step 5 → miss.
            LRU works well when access follows "recency" pattern.
```

**Implementation:** Use a doubly linked list + hashmap (O(1) access and update). The head is most recent, tail is least recent.

**ASCII: LRU Data Structure**
```
     ┌─────────┐     ┌─────────┐     ┌─────────┐
     │   HEAD  │────▶│  Node A │────▶│  Node B │────▶│  Node C │
     │ (most   │◀────│ (key=A) │◀────│ (key=B) │◀────│ (key=C) │
     │ recent) │     │  value  │     │  value  │     │  value  │
     └─────────┘     └─────────┘     └─────────┘     └─────────┘
                                                         │
                                                         ▼
                                                    (Least recent)
     Hashmap: A→NodeA, B→NodeB, C→NodeC

  On access to B:
     Move B to HEAD (most recent).
  On eviction:
     Remove TAIL (C) and delete from hashmap.
```

---

#### b) Least Frequently Used (LFU)

**Rule:** Evict the item that has been accessed the **fewest number of times** overall (the "least popular").

**ASCII: LFU Operation (Cache size = 3)**
```
  Access sequence: [A, B, C, D, A, B, B, C, E]

  Frequencies after 8 accesses:
    A:2 times, B:3 times, C:2 times, D:1 time.

  Cache: [A, B, C] (size=3). D was evicted when it came? Actually, if D comes when full, evict the least frequent among A,B,C.
  If A,B,C all have freq=2, tie-break with LRU (evict oldest).

  When E arrives, frequencies: B=3, A=2, C=2 → evict A or C (tie) → evict oldest.
```

**Use case:** If you have items that are accessed heavily but infrequently over time (e.g., a popular video uploaded a year ago that still gets views), LFU keeps them better than LRU.

**Drawback:** LFU requires maintaining frequency counters, which adds memory overhead. An item that was very popular in the past can stay in cache forever, blocking new hot items — solved by **LFU with aging** (decay counts over time).

---

#### c) Other Policies

| Policy | Rule | Best For |
|--------|------|----------|
| **FIFO (First In, First Out)** | Evict the oldest inserted item, regardless of access frequency. | Simple, but poor hit rate. |
| **TTL (Time To Live)** | Items expire after a fixed duration (e.g., 5 minutes). | Data that becomes stale quickly (e.g., stock prices, weather). |
| **Random** | Evict a random item. | Simple, no overhead. Surprisingly decent in some workloads. |
| **ARC (Adaptive Replacement)** | Dynamically balances between LRU and LFU based on access patterns. | High-performance production caches (used in ZFS, PostgreSQL). |

---

### 6. WRITE POLICIES — HOW TO HANDLE UPDATES

When data is updated, you must ensure both the cache and the database eventually reflect the new value. The choice of write policy affects consistency, latency, and durability.

#### a) Write-Through
**Rule:** On a write, update the database AND the cache synchronously before returning success.

**ASCII: Write-Through**
```
  Client ──► Application Server
                 │
                 ├── 1. Write to Database (sync)
                 │      │
                 │      ▼
                 │   Database updated.
                 │
                 ├── 2. Write to Cache (sync)
                 │      │
                 │      ▼
                 │   Cache updated.
                 │
                 └── 3. Return success to client.

PROS: Cache is always consistent with DB (no stale data).
CONS: Higher latency (two synchronous writes). Slower.
```

#### b) Write-Behind (Write-Back)
**Rule:** On a write, update the cache immediately and return success. Write to the database asynchronously later (in a batch or after a delay).

**ASCII: Write-Behind**
```
  Client ──► Application Server
                 │
                 ├── 1. Write to Cache (sync) → Cache updated.
                 │
                 ├── 2. Return success to client (fast).
                 │
                 └── 3. Later (async), flush to Database.
                        (Batch updates every few seconds)

PROS: Very fast writes (low latency).
CONS: Risk of data loss if cache crashes before flush.
      Cache and DB are temporarily inconsistent (stale DB).
```

**Use case:** High-write-throughput systems like session counters, logging, analytics. Data can be regenerated if lost.

#### c) Write-Around
**Rule:** On a write, write directly to the database and **invalidate** the cache entry (do not update it). Future reads will miss and repopulate the cache.

**ASCII: Write-Around**
```
  Client ──► Application Server
                 │
                 ├── 1. Write to Database (sync).
                 │      │
                 │      ▼
                 │   Database updated.
                 │
                 ├── 2. Invalidate cache key (delete it).
                 │
                 └── 3. Return success.

  Subsequent read:
    Client ──► Check cache → miss.
               │
               └── Fetch from DB → store in cache.

PROS: Avoids caching data that is rarely read again (write-once-read-never).
CONS: Cache miss on next read (extra latency).
```

#### d) Write-Through + Write-Behind Hybrid
- Write-through for critical data (user account, payments).
- Write-behind for non-critical data (logs, analytics).

**Decision Matrix:**

| Policy | Consistency | Write Latency | Read Latency | Data Loss Risk | Use Case |
|--------|-------------|---------------|--------------|----------------|----------|
| Write-Through | Strong | High (sync DB+Cache) | Low (cache always fresh) | Low | Financial, user profile |
| Write-Behind | Weak (eventual) | Low (async) | Low (cache hit) | High (if cache crashes) | High-write, logs, counters |
| Write-Around | Strong (DB only) | Medium (DB only) | Medium (cache miss after write) | Low | Write-once-read-never data |

---

### 7. DRAWBACKS OF CACHING (Critical to Know)

#### a) Cache Thrashing (Low Hit Rate / High Miss Rate)

**Scenario:** The working set does not fit in cache, and the access pattern repeats cyclically. Each new access evicts the next needed item.

**ASCII: Thrashing Example (Cache size = 3, access pattern = 1,2,3,4,1,2,3,4,...)**
```
  Time 1: Access 1 → miss, load 1. Cache [1]
  Time 2: Access 2 → miss, load 2. Cache [1,2]
  Time 3: Access 3 → miss, load 3. Cache [1,2,3] (full)
  Time 4: Access 4 → miss, evict 1 (LRU), load 4. Cache [2,3,4]
  Time 5: Access 1 → miss, evict 2, load 1. Cache [3,4,1]
  Time 6: Access 2 → miss, evict 3, load 2. Cache [4,1,2]
  Time 7: Access 3 → miss, evict 4, load 3. Cache [1,2,3]
  ...

  100% miss rate! Cache is useless. Additional overhead of checking cache makes system slower than without cache.
```

**Solution:** 
- Increase cache size.
- Use a different eviction policy (e.g., LFU if access frequency is stable).
- Use **admission control** — do not cache items that are below a certain frequency threshold (prevents one-off items from polluting cache).

#### b) Stale Data / Inconsistency

**Scenario:** Database is updated but cache is not. Cache returns old value.

**ASCII: Stale Data Scenario**
```
  Time T0: DB has "likes = 100". Cache has "likes = 100" (cached).
  Time T1: User clicks like → DB updated to "likes = 101".
           But cache was NOT updated (write-around or write-behind delay).
  Time T2: Another user reads likes → cache returns "likes = 100" (stale).
           User sees 100 likes, but actual is 101.

  Time T3: Cache eventually expires or is invalidated → new read from DB returns 101.
           Consistency restored. (Eventual consistency)
```

**Solutions:**
- **TTL:** Set a maximum lifetime for cache entries (e.g., 1 minute). After TTL, cache is invalidated, forcing a fresh read.
- **Cache Invalidation on Write:** When updating DB, delete the cache key (write-around). The next read fetches fresh data.
- **Versioning:** Store a version number with each cache entry. If DB version is newer, cache is considered stale.
- **Strong Consistency:** Use write-through for critical data (but slower).

#### c) Cache Stampede (Thundering Herd)

**Scenario:** A popular cache key expires simultaneously, and thousands of requests all miss the cache at the same time, all hitting the database — causing a massive spike.

**ASCII: Stampede**
```
  At T=0: Key "homepage_feed" expires from cache.
  T=1ms: 1000 users request the same homepage.
  All 1000 requests check cache → miss.
  All 1000 requests hit the database simultaneously.
  Database CPU spikes to 100%, slow or crashes.

  This is a "cache stampede" or "thundering herd" problem.
```

**Solutions:**
- **Mutex / Locking:** Only one request is allowed to fetch from DB and repopulate the cache. Other requests wait for the result.
- **Stale While Revalidate:** Serve the stale cached value while asynchronously refreshing the cache in the background.
- **Jittered Expiry:** Add a random offset to TTL so that all keys do not expire at the same time.

---

### 8. DISTRIBUTED CACHE IN PRACTICE (Redis, Memcached)

**Why use a separate cache cluster?**
- **Shared across services:** Microservice A and B can both use the same cache, reducing duplication.
- **Independent scaling:** Cache cluster can be scaled separately from application servers.
- **Decoupling:** You can change cache implementation (e.g., from Memcached to Redis) without redeploying application code.

**Architecture: Distributed Cache Cluster**
```
  ┌─────────────────────────────────────────────────────────────┐
  │               APPLICATION SERVERS (many)                   │
  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
  │  │ App Svc │  │ App Svc │  │ App Svc │  │ App Svc │      │
  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘      │
  └───────┼────────────┼────────────┼────────────┼────────────┘
          │            │            │            │
          └────────────┼────────────┼────────────┘
                       │            │
                       ▼            ▼
          ┌──────────────────────────────────────────────┐
          │         DISTRIBUTED CACHE CLUSTER            │
          │  (e.g., Redis Cluster with sharding)         │
          │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
          │  │ Cache    │  │ Cache    │  │ Cache    │   │
          │  │ Node 1   │  │ Node 2   │  │ Node 3   │   │
          │  │ (master) │  │ (master) │  │ (master) │   │
          │  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
          │       │             │             │          │
          │  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐   │
          │  │ Slave 1  │  │ Slave 2  │  │ Slave 3  │   │
          │  └──────────┘  └──────────┘  └──────────┘   │
          └──────────────────────────────────────────────┘
                       │            │
          ┌────────────┼────────────┼────────────┐
          │            │            │            │
          ▼            ▼            ▼            ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 DATABASE CLUSTER (Sharded)                  │
  └─────────────────────────────────────────────────────────────┘
```

**Key features of distributed caches:**
- **Sharding:** Distribute keys across nodes using consistent hashing.
- **Replication:** Each shard has a master-slave for HA.
- **Eviction Policies:** LRU, LFU, TTL.
- **Atomic Operations:** Increment counters, set if not exists, etc.
- **Persistence (optional):** Redis can persist to disk; Memcached is purely in-memory.

---

### 9. CACHE INVALIDATION — THE HARDEST PROBLEM

**Famous quote:** "There are two hard problems in computer science: cache invalidation, naming things, and off-by-one errors."

**Why is cache invalidation hard?** You must know exactly when the underlying data changes, and you must ensure all copies of the cache are updated or invalidated in a timely manner.

**Common strategies:**

| Strategy | How It Works | When To Use |
|----------|--------------|-------------|
| **TTL (Time-To-Live)** | Set expiry time. Cache automatically deleted after TTL. | When staleness is acceptable (e.g., news, weather). |
| **Write-Through** | Update DB and cache together in one transaction. | Critical data where consistency is paramount. |
| **Write-Around** | Update DB, delete cache key. | Write-heavy, read-rarely data. |
| **Event-Based Invalidation** | When data changes, publish an event (e.g., "UserUpdated"). All caches subscribe and invalidate that key. | Microservices with event bus (Kafka, RabbitMQ). |
| **Manual Invalidation (via Admin API)** | Ops team manually purges specific keys. | Emergency fixes, content changes. |

**ASCII: Event-Based Invalidation**
```
  [Update Service] (e.g., User Profile Update)
         │
         │ 1. Write to DB.
         │ 2. Publish event "user.updated:123" to Kafka.
         ▼
  [Message Queue (Kafka)]
         │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
  [Cache Service] [Search Index] [Email Service]
   Invalidates      Updates       Sends
   key: user:123    Elasticsearch notification
```

---

### 10. REAL-WORLD CACHING USE CASES

| System | Cached Data | Cache Type | Why |
|--------|-------------|------------|-----|
| **Instagram** | User feeds, media metadata | Distributed Redis | Feeds are expensive to compute; cached per user. |
| **YouTube** | Video metadata, view counts | In-memory + CDN | Metadata fetched frequently; CDN caches video content. |
| **Twitter** | Timeline tweets, user sessions | Distributed cache | Timelines are computationally heavy; cache user-specific timelines. |
| **Amazon** | Product catalog, pricing, inventory | Global cache (Redis) | Product pages are read-heavy; cache reduces database load. |
| **Google Search** | Search result snippets | Large distributed cache | Repeating queries served from cache; reduces ranking CPU usage. |
| **Netflix** | User profiles, viewing history | Redis / EVCache | Profiles are read frequently; cache reduces DB hits. |
| **Banking Apps** | Account balances (cached with TTL short) | Distributed cache with write-through | Balances need near-real-time; but acceptable to be 100ms old. |
| **DNS** | IP-to-domain mappings | Global hierarchical cache | DNS queries are ubiquitous; caching reduces root server load. |

---

### 11. COMPARISON TABLE — CACHE PLACEMENT & POLICIES

| Aspect | Client Cache | In-Memory Cache | Distributed Cache | Database Cache |
|--------|--------------|-----------------|-------------------|----------------|
| **Latency** | ~1ms (local) | ~0.1ms (local RAM) | ~1-5ms (network) | ~5-10ms (buffer pool) |
| **Capacity** | MBs | GBs (per server) | TBs (cluster) | GBs (buffer) |
| **Shared** | No (per user) | No (per instance) | Yes (across services) | Yes (across queries) |
| **Eviction Policy** | Application-defined | LRU/LFU | LRU/LFU/TTL | DB's internal (e.g., 2Q) |
| **Consistency** | Eventually consistent | Eventually consistent | Eventual or strong (write-through) | Strong with DB |
| **Management** | App code | App code | Cache cluster (Ops) | Transparent (DB) |
| **Use Case** | Offline data, session | Per-node hot data | Shared across services | Query result caching |

---

### 12. EDGE CASES & FAILURE MODES

| Failure | What Happens | Mitigation |
|---------|--------------|------------|
| **Cache Node Crashes** | Some keys unavailable → increased DB load. | Use consistent hashing + replication (each shard has slave). |
| **Cache Full** | Eviction starts → hit rate drops. | Monitor capacity; autoscale; use LRU/LFU with proper sizing. |
| **Cache Stampede** | Thousands of DB queries on cache miss. | Use mutex/locking or "stale-while-revalidate". |
| **Network Partition** | Cache unreachable → all requests go to DB. | Fallback to direct DB; circuit breaker to avoid timeouts. |
| **Stale Data Due to Lag** | User sees old version. | Acceptable if TTL is short; or use write-through for critical data. |
| **Thrashing** | Cache hit rate <10% → overhead. | Increase cache size; change eviction policy; use admission control. |
| **Duplicate Cache Writes** | Multiple services update same key inconsistently. | Use CAS (Compare-And-Swap) or locking; or use a single source of truth. |

---

### 13. FINAL ASCII — THE COMPLETE CACHING FLOW IN A DISTRIBUTED SYSTEM

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │                       CLIENT REQUEST                               │
  │                    (e.g., "Get Product #123")                      │
  └─────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                      API GATEWAY                                   │
  │  - Authenticate request                                            │
  │  - Route to appropriate service                                   │
  └─────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                  APPLICATION SERVER                               │
  │  1. Check LOCAL in-memory cache: key = "product:123"              │
  │     ┌───────────────────────────────────────────────┐             │
  │     │  Hit?  → return to client immediately.       │             │
  │     │  Miss? → go to Distributed Cache.            │             │
  │     └───────────────────────────────────────────────┘             │
  └─────────────────────────────────┬───────────────────────────────────┘
                                    │ (if local miss)
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                    DISTRIBUTED CACHE (Redis)                      │
  │  (sharded by key using consistent hashing)                        │
  │  1. Route to correct shard.                                       │
  │  2. Check key "product:123".                                      │
  │     ┌───────────────────────────────────────────────┐             │
  │     │  Hit?  → return to app server → cache locally │             │
  │     │  Miss? → go to database.                     │             │
  │     └───────────────────────────────────────────────┘             │
  └─────────────────────────────────┬───────────────────────────────────┘
                                    │ (if distributed miss)
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                    DATABASE (Sharded)                             │
  │  1. Execute SQL: SELECT * FROM products WHERE id=123              │
  │  2. Return result.                                                │
  └─────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │              BACKFILL CACHE (On Miss)                             │
  │  1. Store result in Distributed Cache (with TTL, e.g., 5 min).   │
  │  2. Also store in Local cache (for next requests).               │
  │  3. Return result to client.                                     │
  └─────────────────────────────────────────────────────────────────────┘

  UPDATE PATH (Write-Through):
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Client writes "Update Product #123"                              │
  └─────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Application Server                                                │
  │  1. Write to Database (sync).                                     │
  │  2. Invalidate cache keys: delete "product:123" from both        │
  │     local and distributed cache.                                  │
  │  3. Return success.                                               │
  └─────────────────────────────────────────────────────────────────────┘
```

---

### 14. PLAIN-ENGLISH FINAL TAKEAWAY

1. **Caching** = storing copies of frequently used data in fast memory to avoid repeating expensive work (like database queries).
2. **Cache Hit** = data found in cache → fast response.
3. **Cache Miss** = data not found → must go to database (slower), then optionally store in cache.
4. **Hit Rate** = percentage of requests served by cache. Higher is better.
5. **Eviction Policies** = when cache is full, decide what to remove: LRU (oldest used) and LFU (least popular) are the most common.
6. **Write Policies** = decide how to handle updates: Write-through (consistent but slow), Write-behind (fast but risky), Write-around (avoid caching writes).
7. **Placement** = cache on client, in application server, in a distributed cluster, or inside the database. Large systems use all three.
8. **Drawbacks** = thrashing (poor hit rate), stale data (inconsistency), stampede (massive DB load on cache miss).
9. **Mitigations** = TTL, mutex locks, event-based invalidation, consistent hashing for distributed cache, and careful sizing.
10. **Rule of thumb** = caching is a silver bullet for read-heavy systems, but it adds complexity. Always start with a small cache and tune eviction/write policies based on your access patterns.

