## WHATSAPP SYSTEM DESIGN (CHAT MESSAGING) — DEFINITIONS-FIRST, EXHAUSTIVE EXPLANATION WITH ASCII DIAGRAMS

---

### 1. PLAIN-ENGLISH DEFINITIONS (Read First)

| Term | Definition in One Sentence (Zero Jargon) |
|------|------------------------------------------|
| **Chat Messaging System** | A real‑time communication platform that allows users to send text, images, videos, and other media to individuals or groups, with delivery and read status updates (e.g., WhatsApp, Messenger). |
| **WebSocket** | A persistent, bidirectional communication protocol that keeps a connection open between the client and the server, allowing the server to push messages to the client at any time (unlike HTTP request‑response). |
| **Gateway (Edge Server)** | The entry point for clients that accepts WebSocket connections, authenticates users, and forwards messages to internal services — it should be “dumb” (minimal logic) to handle many concurrent connections. |
| **Session Service** | A microservice that maintains a mapping from `user_id` to the currently active WebSocket connection (which gateway/edge server the user is connected to), enabling message routing. |
| **Group Service** | A microservice that stores group membership information (which users belong to which group) and provides the list of members for a given group ID. |
| **Read Receipt** | An acknowledgment sent by the receiver’s client when a message has been opened/read, which is then forwarded to the sender to update the message status (e.g., blue ticks in WhatsApp). |
| **Delivery Receipt** | An acknowledgment sent by the receiver’s client (or gateway) when the message has been successfully delivered to the device, informing the sender that the message reached the recipient. |
| **Last Seen / Online Status** | A timestamp (or boolean flag) indicating when a user was last active on the app; used to show “online” or “last seen at …” to other users. |
| **Fan‑out (in group messaging)** | The process of delivering a single message sent to a group to all members of that group — one‑to‑many distribution. |
| **Idempotency** | The property that processing the same message multiple times (e.g., due to redelivery) does not cause duplicate effects; achieved by using a unique message ID and storing processed IDs. |
| **Message Queue (Broker)** | A persistent buffer (e.g., Kafka, RabbitMQ) that decouples the sender from the receiver, ensures at‑least‑once delivery, and allows retries on failures. |
| **Consistent Hashing** | A technique for distributing data (e.g., group‑to‑members mapping) across multiple nodes so that adding/removing a node moves only a minimal fraction of data, used for routing and load balancing. |
| **Service Degradation (Prioritisation)** | During high traffic (e.g., festivals), the system drops or delays non‑critical features (e.g., read receipts, last seen) to keep the core messaging functional. |

---

### 2. KEY TERMS GLOSSARY (With Analogies)

| Term | Analogy |
|------|---------|
| **WebSocket** | A walkie‑talkie that stays on so you can talk whenever you want, unlike a telephone where you dial and hang up. |
| **Gateway** | The reception desk at a large office building. It verifies your badge and directs you to the right floor, but does no deep work itself. |
| **Session Service** | The office directory that tells you which room (connection) each employee is currently sitting in, so you can deliver a message directly. |
| **Group Service** | The HR department that maintains the list of who belongs to which team (group). |
| **Read Receipt** | The “seen” notification you get when your friend opens your letter. |
| **Delivery Receipt** | The “delivered” notification when the postman drops the letter in the mailbox. |
| **Fan‑out** | A teacher sending a note to each student in a class (one‑to‑many). |
| **Idempotency** | Writing the same homework assignment on the board twice — the students only copy it once because they see it’s the same. |
| **Message Queue** | A post office that holds letters if the recipient is unavailable, and delivers them later. |
| **Consistent Hashing** | A library where books are assigned to shelves based on a hash of the title; adding a new shelf only moves a few books. |
| **Service Degradation** | During rush hour, a restaurant serves only burgers (core) and stops offering desserts (non‑core) to keep customers served. |

---

### 3. CORE CHALLENGES IN CHAT SYSTEMS

| Challenge | Why It’s Hard | WhatsApp’s Solution |
|-----------|---------------|----------------------|
| **Real‑time delivery** | HTTP is request‑response; server cannot push. | Use WebSocket (bidirectional, persistent connection). |
| **Routing messages to the correct device** | Users may be connected to different edge servers. | Session Service maintains `user_id → connection` mapping. |
| **Group messaging** | A single message must be delivered to many users (fan‑out). | Group Service provides member list; Session Service delivers to each member. |
| **Delivery and read receipts** | Need to propagate acknowledgments back to the sender across different servers. | Use asynchronous events and message queues; track status per message. |
| **Scaling millions of concurrent connections** | Each WebSocket consumes memory; gateways can be overwhelmed. | Decouple connection handling from business logic; keep gateways “dumb”. |
| **High traffic spikes (festivals)** | Sudden surge in messages. | Prioritise core messaging; deprioritise read receipts and last seen (service degradation). |
| **Message persistence** | Chats must survive server restarts; user may be offline. | Store messages in a database; use message queues for reliable delivery. |
| **Duplicates / Idempotency** | Network retries can deliver the same message twice. | Use unique message IDs; client deduplicates based on ID. |

---

### 4. CORE ARCHITECTURE — COMPONENTS AND THEIR ROLES

**ASCII: High-Level WhatsApp Architecture**
```
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                         MOBILE CLIENTS                                    │
  │  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
  │  │  WebSocket connection (persistent, bidirectional)                                   │   │
  │  └─────────────────────────────────────┬───────────────────────────────────────────────┘   │
  └─────────────────────────────────────────┼───────────────────────────────────────────────────┘
                                            │
                                            ▼
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │                              GATEWAY (Edge Server) – many instances                       │
  │  - Accepts WebSocket connections from clients.                                            │
  │  - Authenticates using token (JWT).                                                       │
  │  - Very lightweight – only passes raw messages to internal services.                     │
  │  - Does NOT store connection-to-user mapping.                                            │
  └──────┬───────────────────────────────────────────────────────────────────────────────────┬┘
         │                                                                                     │
         │  (Internal protocol, e.g., Thrift / custom binary)                                   │
         ▼                                                                                     ▼
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                   MESSAGE PARSER / UNSERIALIZER                             │
  │  - Converts raw wire protocol messages to internal objects (e.g., Protobuf/Thrift).        │
  │  - Validates format and extracts metadata (sender_id, recipient_id, group_id, msg_id).     │
  └─────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                        │
                                        ▼
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                    SESSION SERVICE (Router)                                │
  │  - Stores mapping: user_id → gateway_id / connection_id (in a distributed cache/DB).       │
  │  - For a message to a single user: looks up the recipient’s gateway and forwards.          │
  │  - For a group message: asks Group Service for member list, then forwards to each.         │
  │  - Handles delivery receipts: when recipient ACKs, notifies sender’s gateway.             │
  └──────────────┬────────────────────────────────────┬────────────────────────────────────────┘
                 │                                    │
                 │  (Queries group membership)        │  (Persists messages)
                 ▼                                    ▼
  ┌─────────────────────────────┐      ┌─────────────────────────────────────────────────────────┐
  │        GROUP SERVICE        │      │            MESSAGE STORE / QUEUE                        │
  │  - Stores group_id → list   │      │  - Stores all messages (persistent) for history.        │
  │    of member user_ids.      │      │  - Decouples message reception from delivery.           │
  │  - Caches membership data.  │      │  - Provides at-least-once delivery with retries.        │
  └─────────────────────────────┘      └─────────────────────────────────────────────────────────┘
                 │                                    │
                 ▼                                    ▼
  ┌─────────────────────────────┐      ┌─────────────────────────────────────────────────────────┐
  │        GROUP DB             │      │            MESSAGE DB (SQL / NoSQL)                     │
  │  (SQL with indexes)         │      │  - Messages indexed by conversation/group.              │
  └─────────────────────────────┘      └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │  ADDITIONAL SERVICES (not shown in detail but present)                                     │
  │  - Last Seen Service: tracks user activity timestamp.                                      │
  │  - Profile Service: user metadata (name, photo).                                          │
  │  - Image/Media Service: handles file uploads and CDN URLs.                                 │
  │  - Authentication Service: issues JWT tokens.                                             │
  │  - Service Discovery (Consul/ZooKeeper): heartbeat and node registry.                      │
  └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 5. ONE-TO-ONE CHAT FLOW (WITH RECEIPTS)

#### a) Message Sending (Sender Side)

**Steps:**
1. **User A** sends a message to User B via WebSocket to Gateway‑1.
2. Gateway‑1 passes the raw message to the **Parser**.
3. Parser converts it to an internal object and forwards to **Session Service**.
4. Session Service:
   - Persists the message in the Message Store (DB) with status `SENT`.
   - Immediately returns a `SENT` acknowledgement to Gateway‑1 → User A sees one grey tick.
   - Looks up User B’s active connection from its mapping.
   - If B is online, Session Service forwards the message to Gateway‑2 (where B is connected).
   - If B is offline, the message remains in the queue; when B reconnects, it will be delivered.

**ASCII: Send Flow**
```
  [User A] ──(WebSocket)──► Gateway‑1 ──► Parser ──► Session Service
                                                     │
                                                     ├── 1. Store message (DB) ──► ACK to A ("sent")
                                                     │
                                                     ├── 2. Look up B's connection → Gateway‑2
                                                     │
                                                     └── 3. Forward message to Gateway‑2
                                                                       │
                                                                       ▼
                                                             [User B] receives via WebSocket
```

#### b) Delivery Receipt (Sender Gets Second Tick)

**Steps:**
1. User B’s client receives the message and sends a **delivery ACK** back to Gateway‑2.
2. Gateway‑2 passes the ACK to the Session Service.
3. Session Service updates the message status to `DELIVERED` in the Message Store.
4. Session Service looks up User A’s connection (Gateway‑1) and sends a delivery receipt.
5. User A sees **two grey ticks** (delivered).

**ASCII: Delivery Receipt Flow**
```
  [User B] ──(WebSocket)──► Gateway‑2 ──► Parser ──► Session Service
                                                     │
                                                     ├── 1. Update message status → "DELIVERED"
                                                     │
                                                     ├── 2. Look up A's connection → Gateway‑1
                                                     │
                                                     └── 3. Send delivery receipt to Gateway‑1
                                                                       │
                                                                       ▼
                                                             [User A] sees two ticks
```

#### c) Read Receipt (Sender Gets Blue Ticks)

**Steps:**
1. When User B opens the chat and views the message, B’s client sends a **read ACK**.
2. Session Service updates status to `READ` and logs the read timestamp.
3. Session Service forwards the read receipt to User A’s gateway.
4. User A sees **blue ticks** (read).

**ASCII: Read Receipt Flow**
```
  [User B] opens chat → sends "read" ACK ──► Gateway‑2 ──► Session Service
                                                         │
                                                         ├── 1. Update status → "READ"
                                                         │
                                                         └── 2. Forward read receipt to User A
                                                                           │
                                                                           ▼
                                                                 [User A] blue ticks
```

---

### 6. GROUP MESSAGING — FAN‑OUT

**Challenge:** One message sent to a group must reach all members (up to 200 in WhatsApp).

**Solution:**
- **Group Service** stores the membership list.
- When a message arrives for a group, Session Service asks Group Service for the list of member user IDs.
- Session Service then iterates over the list and delivers the message to each member’s connection (or queues for offline members).
- Because the fan‑out is limited (max 200), the load is manageable.

**ASCII: Group Message Fan‑out**
```
  [User A in Group "Red"] sends message.
       │
       ▼
  Gateway ──► Parser ──► Session Service
                           │
                           ▼
                      Ask Group Service: "Get members of group Red"
                           │
                           ▼
                  Group Service returns: [B, C, D, E] (4 members)
                           │
                           ▼
                  Session Service, for each member:
                     ├── Look up connection for B → Gateway‑2 → push to B
                     ├── Look up connection for C → Gateway‑3 → push to C
                     ├── Look up connection for D → Gateway‑1 → push to D
                     └── Look up connection for E → Gateway‑2 → push to E
                           │
                           ▼
                  All members receive the message in real time.
```

**Optimisations:**
- **Caching:** Group membership is cached in Redis to avoid repeated DB hits.
- **Batch delivery:** For large groups, use a message queue to fan‑out asynchronously, preventing blocking.
- **Selective fan‑out:** If a member is offline, the message is stored and delivered on reconnect (pull or push).

---

### 7. LAST SEEN / ONLINE STATUS

**Requirement:** Users want to know if another user is currently online, or when they were last active.

**Implementation:**
- A **Last Seen Service** maintains a key‑value store (e.g., Redis) of `user_id → last_activity_timestamp`.
- Every time a user performs a **user‑initiated action** (sending a message, opening the app, typing), the client sends a “heartbeat” with a flag `is_user_activity=true`.
- The Gateway forwards these to the Last Seen Service, which updates the timestamp.
- **System‑generated actions** (e.g., receiving a delivery receipt, polling for messages) are NOT considered user activity; they carry `is_user_activity=false` and are ignored.
- To show “online”, if the timestamp is within the last 10 seconds, the user is considered online; otherwise, the last seen timestamp is shown.

**ASCII: Last Seen Flow**
```
  [User A] opens app → sends activity ping ──► Gateway ──► Last Seen Service
                                                             │
                                                             └── Update Redis: last_seen:A = now

  [User B] asks "Is A online?" ──► Gateway ──► Last Seen Service
                                              │
                                              ├── Fetch last_seen:A
                                              ├── If now - last_seen < 10s → return "online"
                                              └── Else → return last_seen timestamp
```

**Traffic handling:** During high load, the Last Seen Service can be deprioritised or even turned off to save resources, because it is not critical for messaging.

---

### 8. RELIABILITY AND IDEMPOTENCY

**Problem:** Network retries or broker redelivery can cause the same message to be delivered multiple times.

**Solution:**
- Each message is assigned a **unique message ID** (e.g., UUID) by the sender client.
- The server stores the message ID along with the message.
- When the receiver client gets a message, it checks a local “processed messages” list.
- If the ID already exists, the client ignores it (duplicate).
- The server can also deduplicate at the database level using a unique constraint on `(sender_id, message_id)`.

**ASCII: Idempotency Check**
```
  Server receives message with msg_id = "abc-123".
  Check DB for existing entry with id = "abc-123" from same sender.
    └── If exists → ignore; return success (don't store duplicate).
    └── If not → store and process normally.
```

**Message persistence:** All messages are stored in a persistent database (with time‑to‑live, e.g., 30 days) so that offline users can retrieve them when they reconnect.

---

### 9. CONNECTION MANAGEMENT AND SESSION SERVICE

**Why a separate Session Service?**
- Gateways handle thousands of WebSocket connections; each connection uses memory.
- Storing the `user_id → connection` mapping on the gateway itself would consume extra memory and complicate failover.
- Decoupling allows gateways to be stateless and horizontally scalable.

**How Session Service scales:**
- It stores the mapping in a **distributed cache** (e.g., Redis Cluster) or a fast key‑value store.
- The mapping is updated when users connect, disconnect, or reconnect.
- It also stores the **gateway ID** so that messages can be forwarded to the correct gateway.
- If a gateway fails, all its connections are lost; the clients reconnect, and the Session Service updates the mapping with the new gateway.

**ASCII: Session Service Mapping**
```
  Redis Key: "user:123:session" → { "gateway_id": "gw-2", "connection_id": "ws-456" }

  When a message arrives for user 123:
    Session Service → Redis GET "user:123:session" → returns gateway_id "gw-2"
    → Forward message to Gateway‑2.
```

---

### 10. SERVICE DISCOVERY AND HEARTBEATS

- All services (Gateway, Session, Group, etc.) register themselves with a service registry (e.g., Consul, ZooKeeper) at startup.
- They send periodic **heartbeats** to indicate they are alive.
- If a service fails to send a heartbeat for a few seconds, it is marked as dead, and its tasks are reassigned.
- This prevents single points of failure and allows automatic failover.

**ASCII: Heartbeat Monitoring**
```
  [Service A] ──(heartbeat every 5s)──► Service Registry
  [Service B] ──(heartbeat every 5s)──► Service Registry
  [Service C] ──(heartbeat... )───────► Service Registry

  If Service B misses 3 heartbeats:
    Registry marks B as "down".
    Load balancer stops routing requests to B.
    Other services are notified to retry or take over.
```

---

### 11. HANDLING HIGH TRAFFIC (FESTIVALS / SURGES)

**Problem:** During New Year’s Eve or major festivals, message volume spikes 10‑100x. The system must not crash.

**Strategies:**
1. **Prioritisation / Service Degradation:**
   - Core message sending and delivery are highest priority.
   - Read receipts and last seen updates are lower priority.
   - During load, the system may delay or drop read receipts, but still send the actual messages.
2. **Rate Limiting:**
   - Limit the number of messages per user per second.
   - Throttle non‑critical API calls.
3. **Message Queues:**
   - Incoming messages are enqueued; consumers process at a controlled rate.
   - This smooths out sudden spikes.
4. **Horizontal Scaling:**
   - Auto‑scale gateways and session services based on connection count or CPU.
5. **Batch Processing:**
   - Group messages can be batched and sent in chunks to avoid overwhelming the system.

**ASCII: Degradation Decision**
```
  Load Monitor: if CPU > 80% or message queue length > threshold:
      Set flag = "degraded_mode"
  When a read receipt arrives:
      if degraded_mode:
          discard or delay receipt (only persist final status later)
      else:
          process normally.
```

---

### 12. DATA MODEL — TABLES

**Messages Table (SQL or NoSQL)**
```
  messages
  ┌────────────┬──────────────┬─────────────┬─────────────┬──────────────┬─────────────┐
  │ id (PK)    │ sender_id    │ recipient_id│ group_id    │ content      │ timestamp   │
  │            │ (FK)         │ (FK, nullable) │ (nullable) │ (text/blob)   │             │
  ├────────────┼──────────────┼─────────────┼─────────────┼──────────────┼─────────────┤
  │ 1          │ 101          │ 202         │ NULL        │ "Hello"      │ T1          │
  │ 2          │ 102          │ NULL        │ 501         │ "Hi all"     │ T2          │
  └────────────┴──────────────┴─────────────┴─────────────┴──────────────┴─────────────┘
```

**Status Table (per message per recipient)**
```
  message_status
  ┌────────────┬─────────────┬───────────────┬──────────────┐
  │ msg_id     │ user_id     │ status        │ updated_at   │
  │ (FK)       │ (FK)        │ (sent/delivered/read) │      │
  ├────────────┼─────────────┼───────────────┼──────────────┤
  │ 1          │ 202         │ delivered     │ T3           │
  │ 1          │ 101         │ read          │ T4           │
  └────────────┴─────────────┴───────────────┴──────────────┘
```

**Group Membership Table**
```
  group_members
  ┌────────────┬─────────────┬─────────────┐
  │ group_id   │ user_id     │ joined_at   │
  ├────────────┼─────────────┼─────────────┤
  │ 501        │ 101         │ T0          │
  │ 501        │ 102         │ T0          │
  └────────────┴─────────────┴─────────────┘
```

---

### 13. COMPARISON TABLE — WHATSAPP VS TINDER / INSTAGRAM

| Aspect | WhatsApp | Tinder | Instagram |
|--------|----------|--------|-----------|
| **Primary communication** | Real‑time chat (one‑to‑one, group) | Swipe / match (then chat) | Posts + comments |
| **Connection protocol** | WebSocket (persistent) | HTTP + WebSocket (chat after match) | HTTP + WebSocket (notifications) |
| **Delivery guarantees** | At‑least‑once; idempotent. | Not critical for matches. | Not critical. |
| **Read receipts** | Yes (blue ticks). | Not typically. | Not for feed posts. |
| **Fan‑out** | Group messages (≤200). | Not applicable. | Celebrity posts (millions) — hybrid. |
| **Last seen** | Yes (online/offline). | No. | No. |
| **Message storage** | Persistent (30 days). | Not relevant. | Posts are permanent. |
| **Scaling challenge** | WebSocket connections, group fan‑out. | Location‑based recommendations. | Feed pre‑computation, celebrity posts. |

---

### 14. EDGE CASES AND FAILURE SCENARIOS

| Scenario | Handling |
|----------|----------|
| **User B offline** | Message stored in DB. When B reconnects, Session Service checks for pending messages and delivers them. |
| **Gateway fails** | All connections to that gateway drop. Clients reconnect to a different gateway; Session Service updates mapping. |
| **Session Service down** | Messages cannot be routed. Use multiple instances with failover; messages are queued in the Message Store until Session Service recovers. |
| **Duplicate message delivery** | Receiver deduplicates via message ID; server can also deduplicate on write. |
| **Very large group (e.g., 200)** | Fan‑out to 200 members is acceptable; use parallel delivery or queues. For larger groups, batch and throttle. |
| **Spike during festival** | Deprioritise read receipts, last seen, and possibly delivery receipts; only send the actual messages. |
| **Message ordering** | Use sequence numbers per conversation; server timestamps are used but not guaranteed across different gateways. |
| **End‑to‑end encryption** | For WhatsApp, messages are encrypted on the client; the server only forwards encrypted blobs and cannot read content. In design interviews, you can mention this but focus on the routing. |

---

### 15. KEY DESIGN DECISIONS

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Protocol** | WebSocket over TCP | Persistent, bidirectional, real‑time. |
| **Gateway design** | Dumb, stateless | Handles many connections; minimal memory. |
| **Session Service** | Separate service with Redis | Centralised mapping; decouples from gateways. |
| **Group Service** | Separate service with caching | Avoids frequent DB queries for membership. |
| **Message storage** | Persistent DB + message queue | Ensures reliability and offline delivery. |
| **Fan‑out** | Limit group size to 200 (or reasonable) | Avoids overwhelming the system. |
| **Receipts** | Asynchronous, with retries | Does not block message delivery. |
| **Last Seen** | Separate service; can be disabled under load | Non‑critical feature. |
| **Idempotency** | Unique message ID (client‑generated) | Prevents duplicates on retries. |
| **Service Discovery** | Heartbeat + registry (Consul) | Automatic failover and load balancing. |

---

### 16. FINAL ASCII — FULL MESSAGE LIFE CYCLE (One‑to‑One)

```
  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
  │  MESSAGE LIFE CYCLE                                                                              │
  │                                                                                                  │
  │  1. User A sends message "Hello" to User B.                                                     │
  │       │                                                                                          │
  │       ▼                                                                                          │
  │  2. Gateway-1 receives raw WebSocket message → sends to Parser.                                 │
  │       │                                                                                          │
  │       ▼                                                                                          │
  │  3. Parser converts to internal object → forwards to Session Service.                           │
  │       │                                                                                          │
  │       ▼                                                                                          │
  │  4. Session Service:                                                                             │
  │       a) Stores message in Message DB (status = SENT).                                          │
  │       b) Sends "sent" ACK back to Gateway-1 → User A sees grey tick.                           │
  │       c) Queries Session DB for User B's active connection → found on Gateway-2.                │
  │       d) Forwards message to Gateway-2.                                                         │
  │       │                                                                                          │
  │       ▼                                                                                          │
  │  5. Gateway-2 pushes message to User B's WebSocket → User B receives "Hello".                   │
  │       │                                                                                          │
  │       ▼                                                                                          │
  │  6. User B's client sends "delivery ACK" back to Gateway-2 → Session Service.                   │
  │       │                                                                                          │
  │       ▼                                                                                          │
  │  7. Session Service updates message status to DELIVERED → sends delivery receipt to Gateway-1.  │
  │       │                                                                                          │
  │       ▼                                                                                          │
  │  8. Gateway-1 pushes delivery receipt to User A → User A sees two grey ticks.                   │
  │       │                                                                                          │
  │       ▼                                                                                          │
  │  9. User B opens chat → client sends "read ACK" → Session Service updates to READ.              │
  │       │                                                                                          │
  │       ▼                                                                                          │
  │  10. Session Service forwards read receipt to Gateway-1 → User A sees blue ticks.               │
  │                                                                                                  │
  └──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 17. PLAIN-ENGLISH FINAL TAKEAWAY

1. **WhatsApp is a real‑time chat system** with one‑to‑one and group messaging, delivery/read receipts, and online status.
2. **WebSocket** is the key protocol because it allows bidirectional communication – the server can push messages instantly.
3. **Gateways** are lightweight entry points that handle connections but delegate business logic to other services.
4. **Session Service** is the router that maps user IDs to active connections, enabling message delivery to the correct device.
5. **Group Service** provides member lists; the Session Service does fan‑out to all members (limited to ~200 to avoid overload).
6. **Delivery and read receipts** are separate ACKs that travel back through the system, updating status and notifying the sender.
7. **Last seen** is maintained by tracking user activity (heartbeats) with a threshold (e.g., 10s) to show “online” vs “last seen …”.
8. **Message persistence** and **queues** ensure reliable delivery even when recipients are offline; at‑least‑once delivery is used with **idempotency** to avoid duplicates.
9. **Service degradation** – during high traffic, non‑critical features (read receipts, last seen) are deprioritised to keep core messaging functional.
10. **In a system design interview**, start with one‑to‑one chat, then add group messaging, then receipts, then last seen. Mention WebSocket, Session Service, Group Service, and the fan‑out approach. Show you know the trade‑offs between push/pull, consistency vs availability, and how to scale under load.

