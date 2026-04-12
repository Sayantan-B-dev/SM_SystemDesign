# Ultimate LLD and HLD Roadmap  System Design RoadMap  LLD & HLD Topics to be covered for Interview

Duration: `11:04`

URL: https://www.youtube.com/watch?v=rliSgjoOFTs

### Object-Oriented Programming (OOP) Fundamentals
- **Inheritance**: A mechanism where a new class derives properties and behavior from an existing class.
- **Polymorphism**: The ability of an object to take on many forms, allowing the same interface to be used for different underlying data types.
- **Abstraction**: The concept of hiding complex implementation details and showing only the essential features of an object.

### SOLID Principles
- **SOLID**: A set of five design principles intended to make software designs more understandable, flexible, and maintainable (Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion).

### Design Patterns
- **Design Patterns**: Reusable solutions to common problems encountered in software design (23 classic Gang of Four patterns exist).

### Low-Level Design (LLD) Case Studies
- **Notify Me**: A system design for an observer pattern implementation where users subscribe to receive updates on product availability.
- **Pizza Billing System**: A design for calculating costs and applying dynamic pricing/decorations (toppings) to a base item.
- **Parking Lot**: A system to manage vehicle entry, exit, and space allocation across different spot sizes and floors.
- **Snake and Ladder**: A board game implementation managing player positions, dice rolls, and board event triggers.
- **Elevator System**: An algorithm and object model for controlling multiple elevator cars to service floor requests efficiently.
- **Car Rental System**: A design managing vehicle inventory, reservation scheduling, and payment processing.
- **Logging System**: A framework for capturing, formatting, and routing application log messages to various outputs (console, file, database).
- **Tic-Tac-Toe**: A state management design for a two-player grid game with win/draw validation.
- **BookMyShow**: A concurrent booking system for reserving seats at specific venues for movies or events.
- **Vending Machine**: A state machine design handling item selection, payment processing, and inventory dispensing.
- **ATM**: A state-driven system for user authentication, balance inquiry, and cash withdrawal with account validation.
- **Chess Game**: An object model representing board state, legal move validation for unique pieces, and turn management.
- **File System**: A hierarchical design for organizing, storing, and retrieving files and directories with metadata.
- **Splitwise**: An algorithm for simplifying debts within a group to minimize the total number of cash transactions.
- **Cricbuzz**: A design for live sports score delivery, managing ball-by-ball updates and observer notifications to millions of viewers.

### High-Level Design (HLD) Networking & Architecture
- **TCP**: A connection-oriented, reliable transport protocol ensuring ordered and error-checked delivery of data.
- **WebSocket**: A communication protocol providing full-duplex (two-way) communication channels over a single TCP connection.
- **HTTP**: A stateless, request-response protocol used for transferring hypermedia documents on the web.
- **WebRTC**: A technology enabling real-time peer-to-peer audio, video, and data sharing directly between browsers.
- **Client-Server Architecture**: A model where clients request resources/services and centralized servers provide them.
- **Peer-to-Peer Architecture**: A decentralized model where each participant (peer) acts as both client and server, sharing resources directly.
- **CAP Theorem**: A principle stating a distributed data store can only provide two of three guarantees: Consistency, Availability, and Partition Tolerance.

### High-Level Design (HLD) Core Concepts
- **Microservices Design Patterns**: Reusable strategies for building distributed systems, including Saga (for distributed transactions) and Strangler (for legacy system migration).
- **Scale from Zero to Million Users**: The progressive evolution of infrastructure from a single server to a distributed system with load balancers, caching, and replication.
- **Consistent Hashing**: A distributed hashing scheme that minimizes the number of keys that need to be remapped when a hash table is resized (crucial for distributed caches and databases).
- **Back-of-the-Envelope Estimation**: Approximate calculations using rounded numbers and assumptions to quickly estimate system scale, storage, or bandwidth requirements.
- **DynamoDB / Key-Value Store**: A high-performance, scalable non-relational database model where data is stored and retrieved using a unique key.
- **SQL vs NoSQL**: A comparison between relational (structured, ACID compliant) and non-relational (flexible schema, horizontal scaling) database types.
- **Rate Limiter**: A component that controls the rate of traffic sent or received to prevent resource exhaustion and ensure fair usage.
- **Autocomplete / Typeahead**: A system providing real-time search suggestions based on a prefix string input by the user.
- **Message Queue (Kafka)**: A durable, high-throughput distributed system for buffering and streaming events between producers and consumers.
- **CDN**: A geographically distributed network of proxy servers that cache static content close to users to reduce latency.
- **Bloom Filter**: A space-efficient probabilistic data structure used to test whether an element is a member of a set (allows false positives but no false negatives).
- **Merkle Tree**: A hash-based data structure allowing efficient and secure verification of content integrity in large datasets.
- **Gossip Protocol**: A peer-to-peer communication method where nodes exchange state information randomly to propagate data reliably in a cluster.
- **Database Sharding**: A horizontal scaling method that distributes data across multiple independent database instances based on a shard key.
- **Database Indexing**: A data structure technique that improves the speed of data retrieval operations on a database table.