## DATABASE SHARDING — DEFINITIONS-FIRST, EXHAUSTIVE EXPLANATION WITH ASCII DIAGRAMS

---

### 1. PLAIN-ENGLISH DEFINITIONS (Read First)

| Term | Definition in One Sentence (Zero Jargon) |
|------|------------------------------------------|
| **Database Sharding** | Splitting a very large database table into smaller, more manageable pieces (called shards) and storing each piece on a separate database server — like cutting a huge pizza into slices and giving each slice to a different person. |
| **Shard** | One individual piece of the split database. Each shard holds a subset of the overall data (e.g., users with IDs 1–1000 on Shard A, 1001–2000 on Shard B). |
| **Shard Key (Partition Key)** | The specific column (attribute) used to decide which shard a piece of data belongs to — e.g., `user_id`, `location`, `order_date`. |
| **Horizontal Partitioning** | Splitting a table by rows (records) — each shard contains all columns but only a subset of rows. |
| **Vertical Partitioning** | Splitting a table by columns — e.g., moving rarely-used columns (like `profile_picture_blob`) to a separate table while keeping frequently-used columns (like `name`, `email`) in the main table. |
| **Application Server vs Database Server** | Application servers run your business logic (they are stateless and can be scaled easily); database servers store the actual data (they are stateful, require consistency, and are harder to scale). Sharding applies to database servers. |
| **Range-Based Sharding** | Assigning contiguous ranges of the shard key to each shard (e.g., user_id 1–5000 → Shard 0, 5001–10000 → Shard 1). |
| **Hash-Based Sharding** | Using a hash function on the shard key, then taking the hash modulo the number of shards to determine which shard holds the data. |
| **Cross-Shard Join** | A database query that needs to combine data from two different shards (e.g., joining users from Shard A with orders from Shard B) — this is extremely slow because data must be pulled over the network. |
| **Hotspot (Hot Shard)** | A single shard that receives a disproportionate amount of read/write traffic (e.g., all users from New York in a location-based shard), causing it to be overloaded while other shards sit idle. |
| **Consistent Hashing** | A technique for mapping data to shards such that when you add or remove shards, only a small fraction of data needs to move (instead of almost all data) — solves the "inflexibility" problem of static sharding. |
| **Shard Manager / Router** | A middleware component that sits between the application and the sharded databases, inspects the shard key of each query, and routes the query to the correct shard. |
| **Master-Slave Replication** | Within each shard, maintaining a primary (master) copy that handles all writes and one or more secondary (slave) copies that handle reads and serve as failover backups. |

---

### 2. KEY TERMS GLOSSARY (With Analogies)

| Term | Analogy |
|------|---------|
| **Sharding** | You have one giant pizza (database) that is too big to eat alone. You invite 10 friends (shards) and give each friend an equal slice. |
| **Shard Key** | The label on each pizza box that says "This slice belongs to Friend #3" — e.g., the `user_id` tells you which shard to look in. |
| **Horizontal Partitioning** | Each friend gets a slice that contains all toppings (columns) but only a few pieces of pizza (rows). |
| **Vertical Partitioning** | One friend holds all the cheese, another holds all the pepperoni — splitting by ingredient, not by slice. |
| **Range Sharding** | Friend #1 gets slices 1–10 (users 1–1000), Friend #2 gets slices 11–20 (users 1001–2000). |
| **Hash Sharding** | A random-number generator decides which friend gets which slice, ensuring each friend gets roughly the same amount. |
| **Cross-Shard Join** | Asking Friend #1 for their pizza and Friend #2 for their pizza, then trying to combine them into one plate — messy and slow. |
| **Hotspot** | Everyone wants the slice that Friend #3 has (e.g., all customers from New York). Friend #3 is overwhelmed, while other friends are bored. |
| **Shard Manager** | The waiter who takes your order, looks at the ticket, and shouts "Friend #3, this one is yours!" |
| **Master-Slave per Shard** | For each pizza slice, Friend #3 is the "master" who owns the original slice. Friends #4 and #5 have photocopies of that slice (slaves). If Friend #3 leaves, #4 takes over. |

---

### 3. CORE MECHANISM — WHY AND HOW WE SHARD

#### STEP 1: THE SCALING PROBLEM

As data grows beyond what a single database server can handle:
- Storage limit exceeded (disk full).
- Query latency increases (indexes no longer fit in memory).
- Write throughput plateaus (single server's CPU/I/O maxed out).

**Solutions:**
- **Vertical Scaling** (buy a bigger server) — expensive, hits hardware ceilings.
- **Read Replicas** (slaves for reads) — helps reads, not writes.
- **Sharding** — split data across multiple servers → horizontal scaling for the database layer.

#### STEP 2: HORIZONTAL VS VERTICAL PARTITIONING

**ASCII: Horizontal Partitioning (Rows) — "Sharding"**
```
Table: Users (id, name, email, city, age)
┌─────────────────────────────────────────────────────────────┐
│ Row 1: 1, Alice, a@x.com, NYC, 30                          │
│ Row 2: 2, Bob, b@x.com, LA, 25                            │
│ Row 3: 3, Carol, c@x.com, NYC, 35                        │
│ Row 4: 4, Dave, d@x.com, SF, 40                          │
│ ... 10 million rows                                       │
└─────────────────────────────────────────────────────────────┘

HORIZONTAL PARTITIONING (by id range):
  Shard 0 (IDs 1-5M)          Shard 1 (IDs 5M-10M)
  ┌───────────────────────┐   ┌───────────────────────┐
  │ Row 1-5M              │   │ Row 5M-10M            │
  │ (all columns)         │   │ (all columns)         │
  └───────────────────────┘   └───────────────────────┘
```

**ASCII: Vertical Partitioning (Columns)**
```
Table: Users (huge with BLOB)
┌─────────────────────────────────────────────────────────────┐
│ id, name, email, city, age, profile_picture_blob(5MB)     │
└─────────────────────────────────────────────────────────────┘

VERTICAL PARTITIONING:
  Main Table (frequent queries)     Blob Table (rare queries)
  ┌─────────────────────────┐       ┌───────────────────────┐
  │ id, name, email, city,  │       │ id, profile_picture   │
  │ age                     │       │ (stored separately)   │
  └─────────────────────────┘       └───────────────────────┘
```

**Key difference:** Sharding (horizontal) is what we focus on — splitting rows across databases.

---

#### STEP 3: SHARD KEY SELECTION — THE MOST CRITICAL DECISION

The shard key determines:
- Which shard each row goes to.
- How evenly data is distributed.
- Whether queries can be answered by a single shard or need to hit multiple shards.

**Common Shard Keys:**
- `user_id` (for user-centric data).
- `customer_id` (for e-commerce).
- `geo_location` (for location-based apps like Uber).
- `order_date` (for time-series data).

**ASCII: Shard Key in Action**
```
Client Query: "Find user with ID = 12345"
                   │
                   ▼
          ┌─────────────────────┐
          │   SHARD MANAGER     │
          │  (Routing Layer)    │
          └──────────┬──────────┘
                     │
     Extract shard key = user_id (12345)
                     │
                     ▼
     Hash(12345) % 4 = 2  (or Range: 12345 falls in shard 2)
                     │
                     ▼
       ┌─────────────────────────────┐
       │  Route to Shard #2 only.    │
       │  Query executes locally.    │
       └─────────────────────────────┘
```

---

#### STEP 4: TWO SHARDING STRATEGIES — RANGE VS HASH

**a) Range-Based Sharding**
- Shard 0: `user_id` 1–100,000
- Shard 1: `user_id` 100,001–200,000
- Shard 2: `user_id` 200,001–300,000

**ASCII: Range Sharding**
```
     ┌────────────────────────────────────────────────────────┐
     │                  USER TABLE (by ID)                   │
     │  ID=1    ID=50,000    ID=100,000   ID=150,000   ...  │
     └────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   SHARD 0       │ │   SHARD 1       │ │   SHARD 2       │
│ (IDs 1-100K)    │ │ (IDs 100K-200K) │ │ (IDs 200K-300K) │
│ Users 1..100000 │ │ Users 100001..  │ │ Users 200001..  │
│                 │ │  200000         │ │  300000         │
└─────────────────┘ └─────────────────┘ └─────────────────┘

PROS: Range queries are fast (e.g., "get users 50,000-150,000").
CONS: Hotspots — if new users are all in the last range, Shard 2 gets all writes.
```

**b) Hash-Based Sharding**
- `shard = hash(user_id) % N`
- Distributes evenly but destroys range queries.

**ASCII: Hash Sharding (N=4)**
```
User ID 1    → hash=0x4A → mod 4 = 2 → Shard 2
User ID 2    → hash=0x7B → mod 4 = 3 → Shard 3
User ID 3    → hash=0x2C → mod 4 = 0 → Shard 0
User ID 4    → hash=0x9D → mod 4 = 1 → Shard 1
User ID 5    → hash=0x1E → mod 4 = 2 → Shard 2 (evenly distributed)

     Shard 0      Shard 1      Shard 2      Shard 3
    ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
    │ ID 3   │   │ ID 4   │   │ ID 1   │   │ ID 2   │
    │ ID 7   │   │ ID 8   │   │ ID 5   │   │ ID 6   │
    │ ...    │   │ ...    │   │ ...    │   │ ...    │
    └────────┘   └────────┘   └────────┘   └────────┘
PROS: Perfectly even distribution. No hotspots from new data.
CONS: Cannot do range queries ("get users between ID 50-100") because they span all shards.
```

**Decision Matrix:**
| Requirement | Choose |
|-------------|--------|
| Frequent range queries (time-series, logs) | Range sharding |
| Even distribution, unpredictable access | Hash sharding |
| Location-based queries (e.g., "near me") | Geo-hashing (a variant of hash) |

---

### 4. ADVANTAGES OF SHARDING (Deep Dive)

| Advantage | Detailed Explanation |
|-----------|----------------------|
| **1. Scalability Beyond Single Machine** | You can store petabytes of data across hundreds of shards. No single database's disk or memory is a bottleneck. |
| **2. Read/Write Throughput Increases** | Since each shard handles only a subset of requests, the total system throughput scales linearly with the number of shards (e.g., 10 shards = 10x writes). |
| **3. Smaller Indexes, Faster Queries** | Each shard's index fits entirely in memory (RAM). No disk-based index scans. |
| **4. Fault Isolation** | If Shard 3 crashes, only 1/10 of your data is unavailable. Shards 0,1,2,4-9 continue serving requests. Compare to a single database crash where 100% is down. |
| **5. Maintenance Parallelization** | You can back up, reindex, or upgrade each shard independently during low-traffic windows. No global downtime. |
| **6. Data Locality** | For geographic sharding (by region), data is stored near the users who access it → lower latency. |

---

### 5. DISADVANTAGES OF SHARDING (Deep Dive)

| Disadvantage | Detailed Explanation |
|--------------|----------------------|
| **1. Cross-Shard Joins Are Expensive** | To join `users` and `orders` where users are sharded by `user_id` and orders are sharded by `order_id`, the database must pull data from all shards, join in memory, and discard non-matching rows. Very slow. |
| **2. Loss of ACID Transactions** | A transaction that updates two rows on different shards cannot use a simple BEGIN/COMMIT. Requires distributed 2-phase commit (2PC) or Saga pattern — much slower and error-prone. |
| **3. Fixed Number of Shards** | If you started with 4 shards, and data grows, you cannot simply add a 5th shard without moving almost all data (rehashing storm). |
| **4. Hotspots Are Hard to Fix** | A shard holding all "celebrity users" or all "New York traffic" may get 10x more requests than others. You cannot easily split a single shard on the fly. |
| **5. Application Complexity** | The application must be aware of sharding. It must include the shard key in every query and route to the correct shard. This is not transparent to developers. |
| **6. Secondary Indexes Are Hard** | If you shard by `user_id`, but you also want to query by `email`, you must either: (a) scan all shards for the email, or (b) maintain a separate global email index (a mapping from email to shard/user_id). |

---

### 6. THE INFLEXIBILITY PROBLEM — STATIC SHARDING FAILS

**Problem:** With hash mod N, if you have N shards and want to increase to N+1, almost all rows move.

**Example:**
- N=4 shards. Hash = `user_id mod 4`.
- Add 5th shard. Now hash = `user_id mod 5`.
- 80% of rows change shard. This means moving terabytes of data across the network — takes days and requires downtime.

**ASCII: Static Hash Rehashing Storm (4 → 5 shards)**
```
Before (mod 4):
  Shard 0: IDs 0,4,8,12,...
  Shard 1: IDs 1,5,9,13,...
  Shard 2: IDs 2,6,10,14,...
  Shard 3: IDs 3,7,11,15,...

After (mod 5):
  Shard 0: IDs 0,5,10,15,... → moved from Shard 0,1,2,3 → 4/5 moved
  Shard 1: IDs 1,6,11,16,... → moved
  Shard 2: IDs 2,7,12,17,... → moved
  Shard 3: IDs 3,8,13,18,... → moved
  Shard 4: IDs 4,9,14,19,... → moved

80% of data must be copied to new shards → massive downtime.
```

**Solution:** Consistent hashing (covered in earlier topics). With virtual nodes, adding a shard only moves `1/(N+1)` fraction of data.

---

### 7. SOLVING INFLEXIBILITY — HIERARCHICAL / DYNAMIC SHARDING

**Concept:** Shards are not final. A shard that grows too large can be split into smaller shards.

**How it works:**
1. Start with 4 shards.
2. Shard 2 grows to 10 TB (too big).
3. Split Shard 2 into Shard 2A (IDs 500K-750K) and Shard 2B (IDs 750K-1M).
4. A **Shard Manager** keeps a lookup table: "ID range X → Shard 2A", "ID range Y → Shard 2B".
5. Application always checks the manager first.

**ASCII: Hierarchical Sharding (Splitting a Hot Shard)**
```
                    SHARD MANAGER (Lookup Table)
                    ┌─────────────────────────────────────┐
                    │ ID Range 1-500K    → Shard 0       │
                    │ ID Range 500K-1M   → Shard 2A      │
                    │ ID Range 1M-1.5M   → Shard 2B      │
                    │ ID Range 1.5M-2M   → Shard 1       │
                    └─────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
               ┌────────┐    ┌────────┐    ┌────────┐
               │Shard 0 │    │Shard 2A│    │Shard 2B│
               │(1-500K)│    │(500K-1M)   │(1M-1.5M)│
               └────────┘    └────────┘    └────────┘

When Shard 2A gets too big, split again: 2A1 and 2A2.
Update lookup table. No data moves immediately — just a logical split.
```

**Google Spanner / Vitess** use this hierarchical approach. The lookup table is itself a distributed database (like etcd or ZooKeeper).

---

### 8. MASTER-SLAVE WITHIN EACH SHARD (High Availability)

**Problem:** If a shard's single database server fails, that shard's data is lost.

**Solution:** For each shard, maintain a **Master** (primary) and one or more **Slaves** (replicas).
- All writes go to Master.
- All reads can go to Slaves (or Master).
- If Master fails, a Slave is promoted to Master.

**ASCII: Master-Slave per Shard (Shard 0 shown)**
```
                      ┌──────────────────────────────────────────┐
                      │               SHARD 0                   │
                      │  ┌───────────────────────────────────┐  │
                      │  │   MASTER (Primary)                │  │
                      │  │   Handles all writes (INSERT,     │  │
                      │  │   UPDATE, DELETE)                 │  │
                      │  │   Data: Users 1-100K              │  │
                      │  └─────────────┬─────────────────────┘  │
                      │                │                         │
                      │     Replication (async/sync)             │
                      │                │                         │
                      │  ┌─────────────┴─────────────────────┐  │
                      │  │   SLAVE 1 (Replica)               │  │
                      │  │   Handles read queries (SELECT)   │  │
                      │  │   Copy of master data             │  │
                      │  └───────────────────────────────────┘  │
                      │  ┌───────────────────────────────────┐  │
                      │  │   SLAVE 2 (Replica)               │  │
                      │  │   Read-only, failover candidate   │  │
                      │  └───────────────────────────────────┘  │
                      └──────────────────────────────────────────┘

If MASTER fails:
  1. Monitor detects missing heartbeat.
  2. Promote SLAVE 1 to MASTER.
  3. Update shard manager with new master address.
  4. Downtime: few seconds (if asynchronous) or zero (if synchronous with quorum).
```

**Combining Sharding + Replication:**
- You have multiple shards (horizontal split).
- Each shard has its own master-slave cluster (replication for HA).
- This is how Cassandra, MongoDB sharded clusters, and AWS Aurora operate.

---

### 9. CROSS-SHARD QUERIES — THE REAL PAIN

**Scenario:** You sharded Users by `user_id`. But you have a query: `SELECT * FROM users WHERE city = 'NYC'`.

Since `city` is not the shard key, the system does not know which shard contains NYC users. It must **scatter the query** to all shards, collect results, and merge.

**ASCII: Scatter-Gather Query**
```
        ┌────────────────────────────────────────────────────────┐
        │  Query: "SELECT * FROM users WHERE city='NYC'"        │
        │  (shard key = user_id, but we are filtering on city)  │
        └──────────────────┬─────────────────────────────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │ SHARD MANAGER │  → "I don't know which shard"
                   └───────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │Shard 0  │      │Shard 1  │      │Shard 2  │
    │(IDs 1-  │      │(IDs 100-│      │(IDs 200-│
    │ 100K)   │      │ 200K)   │      │ 300K)   │
    │Query NYC│      │Query NYC│      │Query NYC│
    └────┬────┘      └────┬────┘      └────┬────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
                ┌─────────────────────┐
                │   RESULT MERGER     │
                │  (Union all results)│
                │  Return to client   │
                └─────────────────────┘

Performance: O(#shards) queries. If you have 100 shards, you do 100 sequential queries.
```

**Solutions to Cross-Shard Queries:**
1. **Denormalize** — store city in the shard key (e.g., shard on `(city, user_id)`).
2. **Secondary Index (Global Index)** — maintain a separate table mapping `city → shard_id`. Query that table first to know which shard to hit.
3. **Elasticsearch / Search Engine** — push all data to a search engine that handles the cross-shard query efficiently.
4. **Avoid them** — design your queries to always include the shard key.

---

### 10. SECONDARY INDEXES WITH SHARDING

**Option A: Local Index (Index per shard)**
- Each shard builds its own index on `email`.
- To query `email='alice@x.com'`, you must scan all shards.
- Slow but simple.

**Option B: Global Index (Centralized mapping)**
- Maintain a global table: `email → (shard_id, user_id)`.
- Query the global index first (fast, small table), get the shard, then query that shard directly.
- Global index itself may need sharding (but it's much smaller).

**ASCII: Global Secondary Index**
```
        Query: "Find user with email='alice@x.com'"
                            │
                            ▼
        ┌─────────────────────────────────────────────┐
        │  GLOBAL EMAIL INDEX TABLE (sharded by email)│
        │  ┌───────────────────────────────────────┐ │
        │  │ email='alice@x.com' → shard_id = 2  │ │
        │  └───────────────────────────────────────┘ │
        └────────────────────┬───────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ SHARD 2         │  ← Direct hit!
                    │ (local query)   │
                    └─────────────────┘

No scatter-gather. O(1) index lookup + O(1) shard lookup.
```

---

### 11. COMPARISON TABLE — SHARDING VS OTHER SCALING TECHNIQUES

| Technique | What It Does | Best For | Downsides |
|-----------|--------------|----------|-----------|
| **Vertical Scaling** | Buy a bigger database server (more CPU, RAM, SSD). | Small to medium data, no application changes. | Hardware limits; expensive. |
| **Read Replicas** | Copy data to slave servers; route reads to slaves. | Read-heavy workloads (e.g., blogs, reports). | Doesn't improve write throughput. Replication lag. |
| **Caching (Redis/Memcached)** | Store frequently accessed data in memory. | Hot data (e.g., user sessions, product catalogs). | Cache invalidation is hard; not for all data. |
| **Sharding** | Split data across multiple databases by a key. | Write-heavy, large datasets (millions of rows). | Application complexity; cross-shard joins are hard. |
| **Database Internal Partitioning** | Built-in table partitioning (e.g., PostgreSQL declarative). | Single database, but want to manage large tables. | Still one server, not distributed. |
| **NewSQL (e.g., CockroachDB, Spanner)** | Auto-sharding with ACID and SQL support. | Enterprise, need both scale and consistency. | Complex; vendor lock-in; expensive. |

---

### 12. REAL-WORLD SHARDING EXAMPLES

| Company/System | Shard Key | Strategy | Why |
|----------------|-----------|----------|-----|
| **Twitter** | `user_id` | Hash-based | Massive user growth; evenly distributed tweets per user. |
| **Uber** | `geo_location` (city/region) | Range-based | Queries are mostly location-specific ("near me"). |
| **Amazon DynamoDB** | `partition_key` (user-defined) | Consistent hash (internal) | Auto-scaling and dynamic splitting of hot partitions. |
| **Instagram** | `user_id` (for posts) | Hash-based | Their DB (PostgreSQL with Citus) uses sharding. |
| **Discord** | `guild_id` (server ID) | Range-based | Data per Discord server fits on one shard; cross-shard queries are rare. |
| **Netflix** | `customer_id` | Hash-based | All customer data is self-contained. |
| **Citus (PostgreSQL extension)** | Any column (range/hash) | Both | Automates sharding for PostgreSQL, handles cross-shard queries with distributed joins. |

---

### 13. ADVANCED: GEO-SHARDING (Location-Based Sharding)

**Use case:** Uber, Lyft, Yelp, Foursquare.
- Shard by geographic region: `city` or `(latitude, longitude)`.
- Queries are always region-specific ("find riders near me").
- Data within a region is stored close to users → low latency.

**Challenge:** Users move across regions.
- Their data may need to be migrated if they relocate.
- Use a **location-to-shard mapping** table (dynamic).

**ASCII: Geo-Sharding (US vs EU vs Asia)**
```
                       ┌─────────────────────────────────────────────┐
                       │           SHARD MANAGER (Geo-router)       │
                       │  User location → Shard mapping             │
                       └─────────┬──────────┬──────────┬───────────┘
                                 │          │          │
                                 ▼          ▼          ▼
                    ┌────────────────┐ ┌────────────┐ ┌────────────┐
                    │ US Shard       │ │ EU Shard   │ │ Asia Shard │
                    │ (AWS us-east-1)│ │ (AWS eu-   │ │ (AWS ap-   │
                    │               │ │ west-1)    │ │ southeast) │
                    └────────────────┘ └────────────┘ └────────────┘
                    Users in US hit US shard → low latency.
                    Users in EU hit EU shard.
```

---

### 14. EDGE CASES & FAILURE MODES

| Failure | What Happens | Mitigation |
|---------|--------------|------------|
| **Shard Key Missed in Query** | Query without shard key triggers a full scan of all shards (scatter-gather). | Application must enforce shard key in all queries via code reviews. |
| **Hot Shard (Celebrity User)** | One user has billions of followers. Their shard is overwhelmed. | Use "shard splitting" on the hot key: re-shard that user's data across multiple sub-shards, each holding a follower range. |
| **Shard Goes Down** | That shard's data is unavailable; 1/N of users cannot use the service. | Master-slave replication with automatic failover. Or replicate shard data to 2 other shards (Dynamo-style). |
| **Network Partition** | Shard manager cannot reach a shard, declares it dead, promotes slave. But master was actually alive (split-brain). | Use quorum-based election (e.g., ZooKeeper, etcd) with majority votes. |
| **Uneven Data Growth** | Shard 0 grows 2x faster than Shard 1. Shard 0 runs out of disk. | Proactive monitoring and automatic rebalancing (split hot shard into two). |
| **Secondary Index Stale** | Global index updates asynchronously; a query finds a stale mapping and hits the wrong shard. | Use strong consistency for index updates, or accept eventual consistency with retries. |

---

### 15. SHARDING VS CONSISTENT HASHING — REVISITED

| Aspect | Static Hash Mod N | Consistent Hashing |
|--------|-------------------|---------------------|
| **Adding/removing shards** | Almost all data moves (rehashing storm). | Only 1/N of data moves (minimal). |
| **Lookup complexity** | O(1) (hash + mod). | O(log N) or O(log(Nv)) with virtual nodes. |
| **Hotspot handling** | Hard (rehash all data to fix). | Easy — add more virtual nodes or rebalance arcs. |
| **Implementation** | Simple, built-in database sharding often uses this. | Requires custom router or middleware (e.g., using Libketama for Memcached). |

**In practice:** Many modern databases (Cassandra, DynamoDB) use consistent hashing internally to allow dynamic scaling without manual reshuffling.

---

### 16. FINAL ASCII — THE COMPLETE SHARDED DATABASE ARCHITECTURE

```
                     ┌─────────────────────────────────────────────────────────┐
                     │              APPLICATION SERVERS                       │
                     │  (Stateless, handle business logic, send DB queries)   │
                     └────────────────────────┬────────────────────────────────┘
                                              │
                                              ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │           SHARD MANAGER / ROUTER                       │
                     │  - Inspects shard key in query (e.g., user_id)         │
                     │  - Computes shard via hash or lookup table              │
                     │  - Routes query to correct shard                       │
                     └────────────────┬──────────────┬────────────────────────┘
                                      │              │
                    ┌─────────────────┼──────────────┼─────────────────────┐
                    │                 │              │                     │
                    ▼                 ▼              ▼                     ▼
        ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌──────────────┐
        │   SHARD 0         │ │   SHARD 1         │ │   SHARD 2         │ │   SHARD 3    │
        │ ┌───────────────┐ │ │ ┌───────────────┐ │ │ ┌───────────────┐ │ │ ┌──────────┐│
        │ │ MASTER (db1)  │ │ │ │ MASTER (db2)  │ │ │ │ MASTER (db3)  │ │ │ │MASTER(db4)││
        │ │ Users 1-100K  │ │ │ │ Users 100-200K│ │ │ │ Users 200-300K│ │ │ │Users 300- ││
        │ └───────┬───────┘ │ │ └───────┬───────┘ │ │ └───────┬───────┘ │ │ │ 400K      ││
        │         │         │ │         │         │ │         │         │ │ └──────────┘│
        │ ┌───────┴───────┐ │ │ ┌───────┴───────┐ │ │ ┌───────┴───────┐ │ │             │
        │ │ SLAVE 1 (db1r)│ │ │ │ SLAVE 1 (db2r)│ │ │ │ SLAVE 1 (db3r)│ │ │             │
        │ └───────────────┘ │ │ └───────────────┘ │ │ └───────────────┘ │ │             │
        └───────────────────┘ └───────────────────┘ └───────────────────┘ └──────────────┘
                                      │              │
                                      └──────────────┘
                                              │
                                              ▼
                      ┌─────────────────────────────────────────────────────────┐
                      │             GLOBAL SECONDARY INDEXES                   │
                      │  - email → shard_id mapping                            │
                      │  - username → shard_id mapping                         │
                      │  (Separate service or sharded table)                   │
                      └─────────────────────────────────────────────────────────┘
```

---

### 17. PLAIN-ENGLISH FINAL TAKEAWAY

1. **Sharding** = splitting a giant database table into smaller pieces (shards) stored on different database servers — like cutting a pizza into slices for friends.
2. **Shard Key** = the field you use to decide which slice each row belongs to (e.g., `user_id`).
3. **Two main strategies**:
   - **Range sharding** — good for range queries, but can create hotspots.
   - **Hash sharding** — perfectly even distribution, but destroys range queries.
4. **Advantages** — infinite storage, linear write throughput, faster queries (smaller indexes).
5. **Disadvantages** — cross-shard joins are slow, distributed transactions are painful, static shard counts are inflexible.
6. **Fixing inflexibility** — use consistent hashing or hierarchical sharding (split hot shards into smaller ones dynamically, managed by a lookup table).
7. **Within each shard** — use master-slave replication for high availability (if master fails, slave takes over).
8. **Rule of thumb** — sharding is a last resort. First try vertical scaling, read replicas, caching, and query optimization. Shard only when you have hundreds of GB or millions of writes per second.
9. **In system design interviews** — if asked about scaling databases, sharding is the standard answer for large-scale systems. Be prepared to discuss shard key selection, rebalancing, and cross-shard queries.

