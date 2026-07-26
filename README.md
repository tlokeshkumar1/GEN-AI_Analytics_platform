# GEN-AI Analytics Platform

An enterprise Generative AI analytics platform built for **SAP BTP Cloud Foundry**, combining **FastAPI**, **React (Vite + TS)**, **SAP HANA Cloud Vector Engine**, and **SAP AI Core**.

## Project Architecture Overview

```
GEN-AI_Analytics_platform/
├── mta.yaml                            # BTP Cloud Foundry Deployment Manifest
├── package.json                        # Root NPM scripts
├── .env.example                        # Security template for environment variables
├── router/                             # App Router (XSUAA / BTP Routing)
├── backend/
│   ├── api/                            # Python FastAPI Backend Service
│   └── db/                             # SAP HANA Cloud Database Objects & Data
├── frontend/                           # React (Vite + TypeScript) SPA Dashboard & Chat UI
├── docs/                               # System & API Documentation
└── scripts/                            # Utility Scripts & Automation
```

## Quick Start

### 1. Environment Setup
Copy `.env.example` to `.env` in the root folder and configure your credentials:
```bash
cp .env.example .env
```

### 2. Backend Setup (FastAPI)
```bash
cd backend/api
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
Backend Swagger API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Frontend Setup (React)
```bash
cd frontend
npm install
npm run dev
```
Frontend app will run at [http://localhost:5173](http://localhost:5173).

## Key Features

- 📊 **Executive Sales Dashboard**: KPI summaries, revenue metrics, quarterly trends, top product performance.
- 📁 **Data Ingestion & Upload**: Process SAC Excel spreadsheets and auto-generate vector embeddings.
- 💬 **Generative RAG Chatbot**: Multi-modal chat context backed by SAP HANA Vector Engine and SAP AI Core LLM services.
- 🔍 **Natural Language Analytics**: Text-to-SQL generation and dynamic chart visualizations.
