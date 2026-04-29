# Project Overview: Instant Technician Booker

This document explains the internal architecture, code logic, and the end-to-end working process of the **Instant Technician Booker** platform.

---

## 🏗 1. Code Structure (Monorepo)

The project is organized as a monorepo with specialized workspaces:

*   **`/frontend`**: A React + Vite application. It provides the user interface for booking, real-time tracking (via Socket.io), and a dashboard for technicians.
*   **`/backend`**: An Express.js server that acts as the central hub. It handles authentication, database interactions (MongoDB), and orchestrates calls to the AI services.
*   **`/agents`**: The Multi-Agent system. It contains the logic for different "specialized" agents (Intent, Matching, Booking) that collaborate to handle a user's request.
*   **`/rag`**: The Retrieval-Augmented Generation pipeline. It uses `Transformers.js` to create local embeddings for FAQs and an HNSW index for fast similarity search.
*   **`/mcp-server`**: A Model Context Protocol server that exposes tools (like `find_technicians`) to the AI, allowing it to interact with the database directly.

---

## ⚙ 2. The Working Process (The "Flow")

When a user interacts with the system (e.g., typing *"I need a plumber near me"*), the following process occurs:

### Phase A: Request & Orchestration
1.  **UI Entry**: The user sends a message through the frontend.
2.  **API Gateway**: The Backend receives the request and forwards it to the **Agent Orchestrator**.
3.  **Guardrails**: Before processing, the request passes through a **Guardrail Middleware** (checking for profanity, distance limits, and valid skills).

### Phase B: The Multi-Agent Loop
The Orchestrator manages a 3-stage pipeline:
1.  **Intent Agent**: Analyzes the message to determine if the user wants to *book*, *check status*, or *ask a question*.
2.  **Matching Agent**: If the intent is booking, this agent calls the **MCP Tools** to find available technicians within 50km that match the required skill.
3.  **Booking Agent**: Once a technician is chosen, this agent handles the final confirmation and updates the database.

### Phase C: RAG (The Knowledge Base)
If the user asks a general question (e.g., *"How do I pay?"*), the system triggers the RAG pipeline:
1.  **Query Embedding**: The question is converted into a vector.
2.  **Vector Search**: The system searches the local FAQ index for the most relevant answer chunks.
3.  **Generation**: An LLM (OpenAI or fallback) generates a natural response based on those retrieved chunks.

### Phase D: Real-time Updates
1.  **Socket.io**: Once a booking is confirmed, the backend emits a real-time event.
2.  **Live Tracking**: The technician's dashboard and the customer's tracking page update instantly without a page refresh.

---

## 🛠 3. Key Logic Highlights

### RAG Logic (`/rag/src/engine.js`)
*   **Local Embeddings**: Unlike most apps that call an API for embeddings, this uses `all-MiniLM-L6-v2` running locally in Node.js.
*   **HNSW Index**: Uses a "Hierarchical Navigable Small World" graph for ultra-fast searching through thousands of documents.

### Agent Logic (`/agents/src/orchestrator.js`)
*   **State Management**: The orchestrator maintains a "memory" of the conversation, allowing the agents to understand context (e.g., "Yes, book him").
*   **Reasoning Logs**: Every decision made by an agent is logged to `agent_reasoning.log` for full transparency.

### MCP Tools (`/mcp-server/src/index.js`)
*   **Standardization**: By using Model Context Protocol, the technician-finding logic can be plugged into *any* MCP-compatible AI (like Claude Desktop) without changing the code.

---

## 📊 4. Observability & Safety

*   **Structured Logging**: Every API hit, agent decision, and RAG query is logged in JSON format for easy debugging.
*   **Input Validation**: Uses **Zod** to ensure that no malformed data reaches the database or AI models.
*   **Rate Limiting**: Protects the AI APIs from abuse by limiting users to 20 requests per minute.
