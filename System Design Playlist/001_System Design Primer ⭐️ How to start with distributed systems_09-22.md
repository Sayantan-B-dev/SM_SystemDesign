**Core Analogy**: Restaurant (business) → Distributed System (technical). Chef → Server/Node. Orders → Requests.

**1. Vertical Scaling (Scale Up)**  
- Single chef overwhelmed → ask chef to work harder, pay more.  
- Technical equivalent: Upgrade existing server hardware (CPU, RAM, storage) to increase throughput per node.  
- Limitation: Finite ceiling; single point of resource contention.

**2. Caching / Pre-computation (Optimize Processes)**  
- Pre-make pizza dough during non-peak hours (4 AM) to avoid delaying regular orders.  
- Technical equivalent: Compute or fetch expensive data in advance (batch jobs, cache warm-up) during low-traffic periods. Store results (cache) to serve repeated requests without recomputation.

**3. High Availability & Replication (Avoid Single Point of Failure)**  
- Chef calls sick → business stops. Hire backup chef (pay per day).  
- Technical equivalent: Master-slave architecture. Primary node handles writes; standby replica takes over on failure (failover). Reduces downtime.

**4. Horizontal Scaling (Scale Out)**  
- Growing business → hire 10 chefs instead of 1, plus backups.  
- Technical equivalent: Add more identical machines (nodes) to distribute load. Increases capacity linearly, but requires load distribution.

**5. Microservice Architecture (Specialized Teams)**  
- Chefs specialize: Chef 2 = garlic bread; Chefs 1 & 3 = pizzas. Route garlic bread only to Chef 2, pizzas to others. Teams scaled independently (3 for garlic, 7 for pizza).  
- Technical equivalent: Decompose application into independent services by business capability. Each service has its own database, deployment, scaling rate. Changes (recipe updates) isolated to that service. Single responsibility principle.

**6. Distributed System / Geo-Distribution (Multi-Shop)**  
- Single shop power outage or license loss → open separate shop in different location.  
- Technical equivalent: Deploy nodes across multiple data centers or regions. Provides fault tolerance (zone failure) and lower latency for local users (e.g., Facebook’s edge servers). Introduces cross-shop communication complexity.

**7. Load Balancer (Smart Routing)**  
- Customer request arrives; central authority decides which shop to send based on total time (queue + make + deliver). Choose lower total time; receives real-time updates.  
- Technical equivalent: Load balancer sits in front of servers. Routes requests using algorithms (least latency, round-robin, weighted). Uses health checks and real-time metrics to make intelligent decisions.

**8. Decoupling (Separation of Concerns)**  
- Delivery agent doesn't care if it's pizza or burger; pizza shop doesn't care if delivery agent or customer picks up. Separate management for shop vs. delivery.  
- Technical equivalent: Loose coupling via message queues, APIs, or event-driven architecture. Components communicate through well-defined interfaces. Changes in one service (faulty oven → lower output) do not cascade; other services adapt via asynchronous messaging.

**9. Observability (Logging & Metrics)**  
- Track event timelines (faulty oven, broken bike) and their impact.  
- Technical equivalent: Structured logging (timestamps, event sequences) and metrics aggregation (latency, error rates, throughput). Essential for debugging, capacity planning, and alerting.

**10. Extensibility (Future-proof Design)**  
- Delivery agent shouldn't need code rewrite to deliver burgers tomorrow. Amazon scaled from parcels to everything.  
- Technical equivalent: Design abstractions (interfaces, adapters) so adding new business logic (new product type) requires minimal changes. Avoid tight coupling between core domain and delivery mechanisms.

**High-Level Design (HLD) vs. Low-Level Design (LLD)**  
- **HLD**: Architecture decisions – server deployment, inter-service communication, load balancing, data replication, geographic distribution. Focus: system components and their interactions.  
- **LLD**: Implementation details – class diagrams, object methods, function signatures, data structures, design patterns. Focus: code-level modularity and efficiency within each component.