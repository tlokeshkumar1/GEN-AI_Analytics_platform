from typing import Dict, Any, List, Optional, Callable
import re
import time
from api.rag.retriever import retriever
from api.rag.prompt_builder import prompt_builder
from api.rag.generator import generator
from api.services.python_graph_agent import python_graph_agent
from api.services.data_service import data_service
from api.services.intent_engine import intent_engine
from api.services.analytics_engine import analytics_engine
from api.services.schema_service import schema_service
from api.utils.request_context import RequestContext
from api.utils.logger import get_logger

logger = get_logger("rag.pipeline")


class RAGPipeline:
    """
    Hybrid RAG + Structured Analytics Pipeline.
    Routes requests through intent detection → structured query / vector search / graph.
    """

    # ── Stage Emission Helper ─────────────────────────────────────────────────

    def _emit(self, callback: Optional[Callable], stage: str, status: str,
              message: str, details: Optional[Dict[str, Any]] = None,
              error: Optional[str] = None) -> None:
        """Emit a stage event via the callback if one is provided."""
        if callback is None:
            return
        event: Dict[str, Any] = {
            "type": "stage",
            "stage": stage,
            "status": status,
            "message": message,
        }
        if details:
            event["details"] = details
        if error:
            event["error"] = error
        try:
            callback(event)
            logger.debug(f"[PIPELINE] {stage} {status}")
        except Exception as e:
            logger.warning(f"[PIPELINE] Failed to emit event for {stage}/{status}: {e}")

    # ── Order ID helpers (preserved from original) ────────────────────────────

    def _is_order_id_query(self, query: str) -> str:
        """Check if query is asking for a specific OrderID and return it."""
        pattern = r'\b(SO-\d+)\b'
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        return None

    def _is_pure_order_lookup(self, query: str) -> bool:
        """Check if query is merely asking to display/lookup order details."""
        q = query.strip().lower()
        analytical_keywords = [
            "what if", "what happens", "if i have", "if we", "suppose", "assume",
            "calculate", "recalculate", "simulate", "impact", "difference", "compare",
            "why", "how much", "how many", "instead of", "reduced to", "increased to",
            "change", "modify", "discount", "margin if", "revenue if", "profit if",
            "units instead", "quantity instead"
        ]
        if any(kw in q for kw in analytical_keywords):
            return False

        lookup_keywords = [
            "lookup", "look up", "show order", "view order", "get order",
            "details of", "order details", "fetch order", "find order",
            "order info", "record for"
        ]
        if re.fullmatch(r'(?:order\s*)?so-\d+', q) or any(kw in q for kw in lookup_keywords):
            return True

        clean = re.sub(r'[\s\-_\.,]', '', q)
        if len(clean) <= 15:
            return True

        return False

    def _get_exact_order_data(self, order_id: str) -> Dict[str, Any]:
        """Get exact order data from DataService and format as an executive record."""
        order_data = data_service.get_order_details(order_id)
        if order_data:
            revenue = order_data.get('NetRevenueUSD', 0)
            cost = order_data.get('TotalCostUSD', order_data.get('CostUSD', 0))
            margin = order_data.get('GrossMarginUSD', 0)
            margin_pct = order_data.get('GrossMarginPercent', 0)
            product = order_data.get('ProductName', order_data.get('Product', 'N/A'))
            category = order_data.get('Category', 'N/A')
            sub_cat = order_data.get('SubCategory', order_data.get('Subcategory', 'N/A'))
            customer = order_data.get('CustomerName', order_data.get('Customer', 'N/A'))
            country = order_data.get('Country', 'N/A')
            region = order_data.get('Region', 'N/A')
            date_val = order_data.get('OrderDate', order_data.get('Date', 'N/A'))
            qty = order_data.get('Quantity', 1)
            channel = order_data.get('SalesChannel', order_data.get('Channel', 'Direct'))

            try:
                rev_fmt = f"${float(revenue):,.2f}"
            except Exception:
                rev_fmt = f"${revenue}"
            try:
                cost_fmt = f"${float(cost):,.2f}"
            except Exception:
                cost_fmt = f"${cost}"
            try:
                margin_fmt = f"${float(margin):,.2f}"
            except Exception:
                margin_fmt = f"${margin}"
            try:
                margin_pct_fmt = f"{float(margin_pct):.1f}%"
            except Exception:
                margin_pct_fmt = f"{margin_pct}%"

            formatted = (
                f"### 📦 Order Record: **{order_id}**\n\n"
                f"Here are the complete transaction details retrieved from the enterprise sales dataset:\n\n"
                f"#### 📊 Financial Performance\n"
                f"| Metric | Value |\n"
                f"| :--- | :--- |\n"
                f"| **Net Revenue** | **{rev_fmt}** |\n"
                f"| **Cost of Goods** | {cost_fmt} |\n"
                f"| **Gross Margin ($)** | **{margin_fmt}** |\n"
                f"| **Gross Margin (%)** | **{margin_pct_fmt}** |\n\n"
                f"#### 🛍️ Product & Order Metadata\n"
                f"- **Product Name:** {product}\n"
                f"- **Category / Sub-Category:** {category} › {sub_cat}\n"
                f"- **Quantity Ordered:** {qty} units\n"
                f"- **Customer:** {customer}\n"
                f"- **Location:** {country} ({region})\n"
                f"- **Order Date:** {date_val}\n"
                f"- **Sales Channel:** {channel}\n"
            )

            return {
                "reply": formatted,
                "sources": [{
                    "ID": order_id,
                    "TEXT_CHUNK": f"Order {order_id}: Revenue={rev_fmt}, Margin={margin_pct_fmt}, Customer={customer}, Country={country}, Product={product}, Quantity={qty}",
                    "SCORE": 1.0,
                    "METADATA": f'{{"source": "SAC_Sales_Preprocessed", "sheet": "Sheet1", "row_id": "{order_id}"}}'
                }],
                "intent": "exact_order"
            }
        return None

    # ── Main Pipeline ─────────────────────────────────────────────────────────

    def run(self, user_message: str, top_k: int = 5,
            event_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> Dict[str, Any]:
        """
        Enhanced hybrid RAG pipeline with intent detection and structured analytics.
        Returns a dict compatible with both ChatResponse and EnhancedChatResponse.
        Accepts an optional event_callback for real-time stage streaming.
        """
        ctx = RequestContext()
        processing_steps = []
        cb = event_callback

        try:
            # ── Stage 1: Check for Order ID lookup (preserved) ────────────────
            order_id = self._is_order_id_query(user_message)
            if order_id and self._is_pure_order_lookup(user_message):
                self._emit(cb, "intent", "running", "Analyzing prompt intent...")
                self._emit(cb, "intent", "completed", "Detected order lookup request.")
                self._emit(cb, "retrieval", "running", f"Retrieving order {order_id}...")
                exact_data = self._get_exact_order_data(order_id)
                if exact_data:
                    self._emit(cb, "retrieval", "completed", f"Retrieved order {order_id} from source data.")
                    exact_data["processing"] = [
                        {"stage": "intent", "status": "completed", "message": "Detected order lookup request."},
                        {"stage": "retrieval", "status": "completed", "message": f"Retrieved order {order_id} from source data."},
                    ]
                    exact_data["type"] = "analytical"
                    exact_data["status"] = "success"
                    exact_data["records_matched"] = 1
                    ctx.intent = "exact_order"
                    ctx.records_matched = 1
                    ctx.finalize("success")
                    return exact_data

            # ── Stage 2: Intent Detection ─────────────────────────────────────
            self._emit(cb, "intent", "running", "Analyzing prompt intent...")
            step = {"stage": "intent", "status": "running", "message": "Analyzing prompt intent..."}
            processing_steps.append(step)

            t0 = time.time()
            query_plan = intent_engine.classify(user_message)
            ctx.intent_time_ms = (time.time() - t0) * 1000
            ctx.intent = query_plan.get("intent")
            ctx.metric = query_plan.get("metric")
            ctx.dimension = query_plan.get("dimension")
            ctx.filters = query_plan.get("filters", [])

            intent = query_plan.get("intent", "chat")
            metric = query_plan.get("metric")
            dimension = query_plan.get("dimension")

            # Build intent description for UI
            intent_desc = self._describe_intent(query_plan)
            step["status"] = "completed"
            step["message"] = intent_desc
            step["details"] = {
                "intent": intent,
                "metric": metric,
                "dimension": dimension,
                "chart_type": query_plan.get("chart_type"),
            }
            self._emit(cb, "intent", "completed", intent_desc, details=step["details"])

            # ── Stage 3: Route by intent ──────────────────────────────────────

            if intent == "graph":
                return self._handle_graph(user_message, query_plan, processing_steps, ctx, top_k, cb)

            elif intent in ("analytical", "ranking", "comparison"):
                return self._handle_analytical(user_message, query_plan, processing_steps, ctx, top_k, cb)

            else:
                return self._handle_chat(user_message, query_plan, processing_steps, ctx, top_k, order_id, cb)

        except Exception as e:
            logger.error(f"[Pipeline] Error: {e}")
            ctx.error = str(e)
            ctx.finalize("error")
            return {
                "reply": f"I encountered an error processing your request. Please try rephrasing your question.",
                "sources": [],
                "intent": "error",
                "type": "error",
                "status": "error",
                "processing": processing_steps + [
                    {"stage": "error", "status": "error", "message": "An internal error occurred."}
                ],
                "session_id": "default",
            }

    # ── Graph Handler ─────────────────────────────────────────────────────────

    def _handle_graph(self, user_message: str, plan: Dict[str, Any],
                      steps: List, ctx: RequestContext, top_k: int,
                      cb: Optional[Callable] = None) -> Dict[str, Any]:
        """Handle graph generation requests with pre-validated data."""

        metric = plan.get("metric", "NetRevenueUSD")
        dimension = plan.get("dimension")
        chart_type = plan.get("chart_type", "bar")

        # Stage: Schema validation
        self._emit(cb, "schema", "running", "Identifying dimensions and measures...")
        step_schema = {"stage": "schema", "status": "running", "message": "Identifying dimensions and measures..."}
        steps.append(step_schema)

        meta = schema_service.get_metadata()
        if metric and metric in meta:
            step_schema["status"] = "completed"
            step_schema["message"] = f"Metric: {metric}, Dimension: {dimension or 'auto'}"
        else:
            step_schema["status"] = "completed"
            step_schema["message"] = f"Using default metric: NetRevenueUSD"
            metric = "NetRevenueUSD"
        self._emit(cb, "schema", "completed", step_schema["message"])

        # Stage: Apply filters
        if plan.get("filters") or plan.get("date_filter"):
            self._emit(cb, "filter", "running", "Applying filters...")
            step_filter = {"stage": "filter", "status": "running", "message": "Applying filters..."}
            steps.append(step_filter)
            filter_desc = self._describe_filters(plan)
            step_filter["status"] = "completed"
            step_filter["message"] = filter_desc
            self._emit(cb, "filter", "completed", filter_desc)

        # Stage: Generate graph
        self._emit(cb, "generation", "running", "Generating visualization...")
        step_gen = {"stage": "generation", "status": "running", "message": "Generating visualization..."}
        steps.append(step_gen)

        t0 = time.time()
        graph_res = python_graph_agent.generate_custom_graph(user_message, query_plan=plan)
        ctx.graph_time_ms = (time.time() - t0) * 1000

        if graph_res.get("status") == "success" and graph_res.get("image_base64"):
            step_gen["status"] = "completed"
            step_gen["message"] = f"Generated {chart_type.replace('_', ' ')} chart."
            self._emit(cb, "generation", "completed", step_gen["message"])
            ctx.records_matched = graph_res.get("records_matched", 0)

            reply_text = (
                f"I have analyzed the dataset and generated the requested visualization.\n\n"
                f"**Key Insights:**\n{graph_res.get('insights', '')}"
            )

            ctx.finalize("success")
            return {
                "reply": reply_text,
                "sources": [],
                "graph_image": graph_res.get("image_base64"),
                "chart_type": graph_res.get("chart_type", chart_type),
                "insights": graph_res.get("insights"),
                "intent": "graph",
                "type": "graph",
                "status": "success",
                "processing": steps,
                "query_plan": plan,
                "records_matched": ctx.records_matched,
                "session_id": "default",
            }
        else:
            step_gen["status"] = "error"
            step_gen["message"] = graph_res.get("message", "Graph generation failed.")
            self._emit(cb, "generation", "failed", step_gen["message"], error=step_gen["message"])
            ctx.error = graph_res.get("message")
            ctx.finalize("error")
            return {
                "reply": f"I couldn't generate the graph: {graph_res.get('message', 'Unknown error')}",
                "sources": [],
                "intent": "graph",
                "type": "error",
                "status": "error",
                "processing": steps,
                "session_id": "default",
            }

    # ── Analytical Handler ────────────────────────────────────────────────────

    def _handle_analytical(self, user_message: str, plan: Dict[str, Any],
                          steps: List, ctx: RequestContext, top_k: int,
                          cb: Optional[Callable] = None) -> Dict[str, Any]:
        """Handle analytical/ranking/comparison requests with structured data."""

        metric = plan.get("metric", "NetRevenueUSD")
        dimension = plan.get("dimension")
        aggregation = plan.get("aggregation", "SUM")

        # Stage: Schema
        self._emit(cb, "schema", "running", "Understanding dataset schema...")
        schema_msg = (f"Metric: {metric} ({aggregation})" +
                      (f", grouped by {dimension}" if dimension else ""))
        step_schema = {"stage": "schema", "status": "completed", "message": schema_msg}
        steps.append(step_schema)
        self._emit(cb, "schema", "completed", schema_msg)

        # Stage: Filters
        if plan.get("filters") or plan.get("date_filter"):
            self._emit(cb, "filter", "running", "Applying filters...")
            filter_desc = self._describe_filters(plan)
            steps.append({"stage": "filter", "status": "completed", "message": filter_desc})
            self._emit(cb, "filter", "completed", filter_desc)

        # Stage: Retrieval & Calculation
        calc_running_msg = f"Calculating {aggregation}({metric})..."
        self._emit(cb, "calculation", "running", calc_running_msg)
        step_calc = {"stage": "calculation", "status": "running", "message": calc_running_msg}
        steps.append(step_calc)

        t0 = time.time()
        analytics_result = analytics_engine.execute(plan)
        ctx.analytics_time_ms = (time.time() - t0) * 1000
        ctx.records_matched = analytics_result.records_matched

        if not analytics_result.success:
            step_calc["status"] = "error"
            step_calc["message"] = analytics_result.error or "Calculation failed."
            self._emit(cb, "calculation", "failed", step_calc["message"], error=step_calc["message"])
            ctx.error = analytics_result.error
            ctx.finalize("error")
            return {
                "reply": analytics_result.error or "Unable to calculate the requested data.",
                "sources": [],
                "intent": plan["intent"],
                "type": "error",
                "status": "error",
                "processing": steps,
                "session_id": "default",
            }

        step_calc["status"] = "completed"
        step_calc["message"] = f"Calculated from {analytics_result.records_matched:,} matching records."
        self._emit(cb, "calculation", "completed", step_calc["message"])

        # Stage: Validation
        self._emit(cb, "validation", "running", "Validating calculated result...")
        steps.append({"stage": "validation", "status": "completed",
                     "message": "Results validated against source data."})
        self._emit(cb, "validation", "completed", "Results validated against source data.")

        # Stage: LLM explanation
        self._emit(cb, "explanation", "running", "Preparing answer...")
        step_llm = {"stage": "explanation", "status": "running", "message": "Preparing answer..."}
        steps.append(step_llm)

        t0 = time.time()
        reply = self._generate_analytical_response(user_message, plan, analytics_result)
        ctx.llm_time_ms = (time.time() - t0) * 1000
        step_llm["status"] = "completed"
        step_llm["message"] = "Response generated from validated data."
        self._emit(cb, "explanation", "completed", "Answer prepared.")

        ctx.finalize("success")
        return {
            "reply": reply,
            "sources": [],
            "intent": plan["intent"],
            "type": "analytical",
            "status": "success",
            "processing": steps,
            "data": analytics_result.to_dict(),
            "query_plan": plan,
            "records_matched": analytics_result.records_matched,
            "session_id": "default",
        }

    # ── Chat Handler ──────────────────────────────────────────────────────────

    def _handle_chat(self, user_message: str, plan: Dict[str, Any],
                     steps: List, ctx: RequestContext, top_k: int,
                     order_id: str = None,
                     cb: Optional[Callable] = None) -> Dict[str, Any]:
        """Handle semantic chat/RAG requests, optionally with structured data."""

        context_chunks = []
        analytics_data = None

        # If plan indicates structured query is also needed
        if plan.get("requires_structured_query") and plan.get("metric"):
            self._emit(cb, "calculation", "running", "Retrieving data from source...")
            step_calc = {"stage": "calculation", "status": "running",
                        "message": "Retrieving data from source..."}
            steps.append(step_calc)

            t0 = time.time()
            analytics_result = analytics_engine.execute(plan)
            ctx.analytics_time_ms = (time.time() - t0) * 1000

            if analytics_result.success and analytics_result.data:
                analytics_data = analytics_result
                ctx.records_matched = analytics_result.records_matched
                step_calc["status"] = "completed"
                step_calc["message"] = f"Retrieved data from {analytics_result.records_matched:,} records."
                self._emit(cb, "calculation", "completed", step_calc["message"])

                # Add calculated data as a high-priority context chunk
                data_text = self._format_analytics_as_context(plan, analytics_result)
                context_chunks.append({
                    "ID": "calculated_data",
                    "TEXT_CHUNK": data_text,
                    "SCORE": 1.0,
                    "METADATA": '{"source": "structured_analytics", "type": "calculation"}'
                })
            else:
                step_calc["status"] = "completed"
                step_calc["message"] = "No structured data needed for this query."
                self._emit(cb, "calculation", "completed", step_calc["message"])

        # If order_id with analytical context (what-if scenarios)
        if order_id and not self._is_pure_order_lookup(user_message):
            order_data = data_service.get_order_details(order_id)
            if order_data:
                revenue = float(order_data.get('NetRevenueUSD', 0) or 0)
                cost = float(order_data.get('TotalCostUSD', order_data.get('CostUSD', 0)) or 0)
                margin = float(order_data.get('GrossMarginUSD', 0) or 0)
                margin_pct = float(order_data.get('GrossMarginPercent', 0) or 0)
                qty = int(order_data.get('Quantity', 1) or 1)
                unit_price = (revenue / qty) if qty > 0 else 0
                unit_cost = (cost / qty) if qty > 0 else 0
                unit_margin = (margin / qty) if qty > 0 else 0

                order_context_chunk = {
                    "ID": order_id,
                    "TEXT_CHUNK": (
                        f"Exact Order Data for {order_id}: "
                        f"Product Name: {order_data.get('ProductName', 'N/A')}, "
                        f"Category: {order_data.get('Category', 'N/A')}, SubCategory: {order_data.get('SubCategory', order_data.get('Subcategory', 'N/A'))}, "
                        f"Customer: {order_data.get('CustomerName', 'N/A')}, Country: {order_data.get('Country', 'N/A')}, "
                        f"Original Quantity Ordered: {qty} units, "
                        f"Original Total Net Revenue: ${revenue:,.2f}, "
                        f"Original Total Cost of Goods: ${cost:,.2f}, "
                        f"Original Total Gross Margin: ${margin:,.2f}, "
                        f"Gross Margin %: {margin_pct:.2f}%, "
                        f"Calculated Unit Selling Price: ${unit_price:,.2f} per unit, "
                        f"Calculated Unit Cost: ${unit_cost:,.2f} per unit, "
                        f"Calculated Unit Gross Margin: ${unit_margin:,.2f} per unit."
                    ),
                    "SCORE": 1.0,
                    "METADATA": f'{{"source": "SAC_Sales_Preprocessed", "sheet": "Sheet1", "row_id": "{order_id}"}}'
                }
                context_chunks.append(order_context_chunk)

        # Stage: Vector retrieval
        if plan.get("requires_vector_search", True):
            self._emit(cb, "retrieval", "running", "Searching knowledge base...")
            step_vec = {"stage": "retrieval", "status": "running",
                       "message": "Searching knowledge base..."}
            steps.append(step_vec)

            t0 = time.time()
            retrieved = retriever.retrieve(user_message, top_k)
            ctx.retrieval_time_ms = (time.time() - t0) * 1000

            context_chunks.extend(retrieved)
            step_vec["status"] = "completed"
            step_vec["message"] = f"Retrieved {len(retrieved)} relevant context chunks."
            self._emit(cb, "retrieval", "completed", step_vec["message"])

        # Stage: LLM generation
        self._emit(cb, "explanation", "running", "Preparing answer...")
        step_llm = {"stage": "explanation", "status": "running",
                   "message": "Preparing answer..."}
        steps.append(step_llm)

        t0 = time.time()
        formatted_prompt = prompt_builder.build_prompt(user_message, context_chunks)
        response_text = generator.generate(formatted_prompt)
        ctx.llm_time_ms = (time.time() - t0) * 1000

        step_llm["status"] = "completed"
        step_llm["message"] = "Answer prepared."
        self._emit(cb, "explanation", "completed", "Answer prepared.")

        ctx.finalize("success")
        return {
            "reply": response_text,
            "sources": context_chunks,
            "intent": plan.get("intent", "rag"),
            "type": "chat",
            "status": "success",
            "processing": steps,
            "data": analytics_data.to_dict() if analytics_data else None,
            "query_plan": plan,
            "records_matched": ctx.records_matched or len(context_chunks),
            "session_id": "default",
        }

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _describe_intent(self, plan: Dict[str, Any]) -> str:
        """Generate a user-friendly description of the detected intent."""
        intent = plan.get("intent", "chat")
        metric = plan.get("metric")
        dimension = plan.get("dimension")

        if intent == "graph":
            parts = ["Graph request"]
            if metric:
                parts.append(f"for {metric}")
            if dimension:
                parts.append(f"by {dimension}")
            return " ".join(parts)
        elif intent == "ranking":
            limit = plan.get("limit", 10)
            return f"Ranking: Top {limit} {dimension or 'records'} by {metric or 'value'}"
        elif intent == "analytical":
            agg = plan.get("aggregation", "SUM")
            return f"Analytical: {agg} of {metric or 'data'}" + (f" by {dimension}" if dimension else "")
        elif intent == "comparison":
            return f"Comparison analysis for {metric or 'metrics'}"
        else:
            return "Semantic search and analysis"

    def _describe_filters(self, plan: Dict[str, Any]) -> str:
        """Generate filter description for UI."""
        parts = []
        for f in plan.get("filters", []):
            parts.append(f"{f['column']} {f['operator']} {f['value']}")
        df = plan.get("date_filter")
        if df:
            if df.get("from") == df.get("to"):
                parts.append(f"{df['column']} = {df['from']}")
            else:
                parts.append(f"{df['column']}: {df.get('from')} to {df.get('to')}")
        if parts:
            return "Filters: " + ", ".join(parts)
        return "No filters applied."

    def _format_analytics_as_context(self, plan: Dict[str, Any],
                                     result) -> str:
        """Format analytics results as context for the LLM prompt."""
        metric = plan.get("metric", "value")
        agg = plan.get("aggregation", "SUM")
        dimension = plan.get("dimension")

        if not result.data:
            return "No data available for the requested analysis."

        lines = [f"PRE-CALCULATED DATA ({agg} of {metric}):"]

        if dimension:
            for row in result.data[:20]:
                dim_val = row.get(dimension, "Unknown")
                val = row.get(metric, 0)
                fmt = row.get("formatted_value", str(val))
                lines.append(f"  {dim_val}: {fmt}")
        else:
            for row in result.data:
                val = row.get("value", 0)
                fmt = row.get("formatted_value", str(val))
                lines.append(f"  {metric} ({agg}): {fmt}")

        lines.append(f"\nTotal records matched: {result.records_matched:,}")
        lines.append(f"Total records in dataset: {result.records_total:,}")
        return "\n".join(lines)

    def _generate_analytical_response(self, user_message: str,
                                      plan: Dict[str, Any],
                                      result) -> str:
        """Generate LLM explanation for analytical results."""
        data_context = self._format_analytics_as_context(plan, result)

        prompt = f"""You are an expert enterprise analytics assistant.
The following data has been pre-calculated from the source dataset. Present it clearly and accurately.
DO NOT invent, modify, or recalculate any numbers. The values below are the authoritative source.

{data_context}

User's question: {user_message}

Provide a clear, executive-style response:
- State the answer directly first
- Use the exact numbers from the pre-calculated data
- Format monetary values with $ and commas
- Use markdown tables if presenting grouped data
- Bold key metrics
- Do NOT add data that isn't in the pre-calculated results

Executive Response:"""

        try:
            return generator.generate(prompt)
        except Exception as e:
            logger.error(f"[Pipeline] LLM generation failed: {e}")
            # Fallback: format data directly
            return self._format_data_directly(plan, result)

    def _format_data_directly(self, plan: Dict[str, Any], result) -> str:
        """Format data without LLM as fallback."""
        metric = plan.get("metric", "Value")
        dimension = plan.get("dimension")
        agg = plan.get("aggregation", "SUM")

        lines = [f"### {agg.title()} of {metric}"]
        if dimension:
            lines.append(f"\n| {dimension} | {metric} |")
            lines.append("| :--- | ---: |")
            for row in result.data[:20]:
                dim_val = row.get(dimension, "")
                fmt = row.get("formatted_value", "")
                lines.append(f"| {dim_val} | **{fmt}** |")
        else:
            for row in result.data:
                fmt = row.get("formatted_value", str(row.get("value", "")))
                lines.append(f"\n**{agg} of {metric}:** {fmt}")

        lines.append(f"\n*Based on {result.records_matched:,} matching records.*")
        return "\n".join(lines)


rag_pipeline = RAGPipeline()
