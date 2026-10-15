**Core Definition**: Scalability = ability to handle more requests by adding resources. Two methods:

**Vertical Scaling (Scale Up)**  
- Buy a bigger machine (more CPU, RAM, storage).  
- Single node handles all requests.  
- Pros: No load balancer needed; inter-process communication (fast); data consistency trivial (single database, no distributed transactions).  
- Cons: Single point of failure (node dies → service down); hardware limits (cannot grow infinitely); cost escalates non-linearly.

**Horizontal Scaling (Scale Out)**  
- Buy more machines of similar size. Distribute requests across them.  
- Requires a load balancer to route traffic.  
- Pros: Resilient (one fails → others take over); scales linearly (add more nodes as users grow); no hardware ceiling.  
- Cons: Network calls between nodes (RPC) are slow (I/O); data consistency becomes complex (distributed transactions, locks across databases → impractical; usually settled for loose consistency/eventual consistency).

**Key Trade-offs**  
- Vertical: fast & consistent but fragile and limited.  
- Horizontal: resilient & infinitely scalable but slow inter-node communication and consistency headaches.

**Real-world practice**: Hybrid approach. Use horizontal scaling as the base strategy, but each individual node is as large (vertically scaled) as economically feasible. Start with vertical scaling early (low user count, simpler). As user base grows, shift to horizontal scaling. System design is about balancing scalability, resilience, and consistency based on requirements.