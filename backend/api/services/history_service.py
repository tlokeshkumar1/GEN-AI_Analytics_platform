"""
Chat History Service — SAP HANA Cloud
Manages chat sessions and messages (user queries & bot responses) in HANA Cloud.
Sessions are global/shared (no user filtering for now).
"""
import uuid
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from api.database.connection import db_manager
from api.utils.logger import get_logger

logger = get_logger("services.history")


class ChatHistoryService:
    """CRUD operations for CHAT_SESSIONS and CHAT_MESSAGES tables in SAP HANA Cloud."""

    def __init__(self):
        self._tables_initialized = False

    def ensure_tables(self) -> None:
        """Ensure tables are initialized once per instance."""
        if not self._tables_initialized:
            self.init_tables()
            self._tables_initialized = True

    # ── Table Initialisation ──────────────────────────────────────────────────

    def init_tables(self) -> None:
        """Create CHAT_SESSIONS and CHAT_MESSAGES tables if they do not exist in SAP HANA Cloud."""
        conn = db_manager.get_connection()
        if not conn:
            logger.warning("HANA connection unavailable — skipping table init.")
            return

        try:
            cursor = conn.cursor()

            # Helper to check table existence in current schema
            def table_exists(table_name: str) -> bool:
                try:
                    cursor.execute("SELECT TABLE_NAME FROM TABLES WHERE TABLE_NAME = ?", (table_name.upper(),))
                    return cursor.fetchone() is not None
                except Exception:
                    return False

            # CHAT_SESSIONS
            if not table_exists("CHAT_SESSIONS"):
                logger.info("Creating table CHAT_SESSIONS in HANA Cloud...")
                try:
                    cursor.execute("""
                        CREATE TABLE CHAT_SESSIONS (
                            SESSION_ID   VARCHAR(50) PRIMARY KEY,
                            SUBJECT      VARCHAR(255),
                            CREATED_AT   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            UPDATED_AT   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    logger.info("Created CHAT_SESSIONS table.")
                except Exception as e:
                    if "already exists" not in str(e).lower():
                        logger.error(f"Error creating CHAT_SESSIONS: {e}")

            # CHAT_MESSAGES
            if not table_exists("CHAT_MESSAGES"):
                logger.info("Creating table CHAT_MESSAGES in HANA Cloud...")
                try:
                    cursor.execute("""
                        CREATE TABLE CHAT_MESSAGES (
                            MESSAGE_ID   VARCHAR(50) PRIMARY KEY,
                            SESSION_ID   VARCHAR(50),
                            ROLE         VARCHAR(15),
                            CONTENT      NCLOB,
                            SOURCES      NCLOB,
                            INTENT       VARCHAR(50),
                            METADATA     NCLOB,
                            TIMESTAMP    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (SESSION_ID) REFERENCES CHAT_SESSIONS(SESSION_ID) ON DELETE CASCADE
                        )
                    """)
                    logger.info("Created CHAT_MESSAGES table.")
                except Exception as e:
                    if "already exists" not in str(e).lower():
                        logger.error(f"Error creating CHAT_MESSAGES: {e}")

            conn.commit()
            cursor.close()
            db_manager.return_connection(conn)
            logger.info("Chat history tables verified/initialised in HANA Cloud.")
        except Exception as e:
            db_manager.return_connection(conn)
            logger.error(f"Failed to initialise chat history tables: {e}")

    # ── Session Operations ────────────────────────────────────────────────────

    def create_session(self, subject: str = "New Chat") -> str:
        """Create a new chat session and return its SESSION_ID."""
        self.ensure_tables()
        session_id = f"sess-{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        conn = db_manager.get_connection()
        if not conn:
            logger.error("HANA connection unavailable — cannot create session.")
            return session_id

        try:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO CHAT_SESSIONS (SESSION_ID, SUBJECT, CREATED_AT, UPDATED_AT) VALUES (?, ?, ?, ?)",
                (session_id, subject[:255], now, now),
            )
            conn.commit()
            cursor.close()
            db_manager.return_connection(conn)
            logger.info(f"Created chat session: {session_id}")
        except Exception as e:
            db_manager.return_connection(conn)
            logger.error(f"Failed to create session: {e}")

        return session_id

    def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Return all chat sessions ordered by most recently updated."""
        self.ensure_tables()
        conn = db_manager.get_connection()
        if not conn:
            return []

        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT SESSION_ID, SUBJECT, CREATED_AT, UPDATED_AT "
                "FROM CHAT_SESSIONS ORDER BY UPDATED_AT DESC"
            )
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
            cursor.close()
            db_manager.return_connection(conn)

            # Serialise datetime objects with explicit 'Z' UTC indicator
            for row in rows:
                for key in ("CREATED_AT", "UPDATED_AT"):
                    val = row.get(key)
                    if isinstance(val, datetime):
                        row[key] = val.isoformat() + "Z"
                    elif isinstance(val, str) and val and not val.endswith("Z"):
                        row[key] = val.replace(" ", "T") + "Z"

            return rows
        except Exception as e:
            db_manager.return_connection(conn)
            logger.error(f"Failed to fetch sessions: {e}")
            return []

    def delete_session(self, session_id: str) -> bool:
        """Delete a session and all its messages."""
        conn = db_manager.get_connection()
        if not conn:
            return False

        try:
            cursor = conn.cursor()
            # Delete messages first (in case ON DELETE CASCADE is not supported)
            cursor.execute("DELETE FROM CHAT_MESSAGES WHERE SESSION_ID = ?", (session_id,))
            cursor.execute("DELETE FROM CHAT_SESSIONS WHERE SESSION_ID = ?", (session_id,))
            conn.commit()
            cursor.close()
            db_manager.return_connection(conn)
            logger.info(f"Deleted session: {session_id}")
            return True
        except Exception as e:
            db_manager.return_connection(conn)
            logger.error(f"Failed to delete session {session_id}: {e}")
            return False

    def update_session_subject(self, session_id: str, subject: str) -> None:
        """Update the subject/title of an existing session."""
        conn = db_manager.get_connection()
        if not conn:
            return

        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE CHAT_SESSIONS SET SUBJECT = ? WHERE SESSION_ID = ?",
                (subject[:255], session_id),
            )
            conn.commit()
            cursor.close()
            db_manager.return_connection(conn)
        except Exception as e:
            db_manager.return_connection(conn)
            logger.error(f"Failed to update session subject: {e}")

    def _touch_session(self, session_id: str) -> None:
        """Bump UPDATED_AT so the session moves to the top of the list."""
        conn = db_manager.get_connection()
        if not conn:
            return

        try:
            cursor = conn.cursor()
            now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute(
                "UPDATE CHAT_SESSIONS SET UPDATED_AT = ? WHERE SESSION_ID = ?",
                (now, session_id),
            )
            conn.commit()
            cursor.close()
            db_manager.return_connection(conn)
        except Exception as e:
            db_manager.return_connection(conn)
            logger.error(f"Failed to touch session: {e}")

    # ── Message Operations ────────────────────────────────────────────────────

    def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        sources: Optional[List[Dict[str, Any]]] = None,
        intent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Save a single message (user query OR bot response) to CHAT_MESSAGES.
        Returns the generated MESSAGE_ID.
        """
        self.ensure_tables()
        message_id = f"msg-{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        sources_json = json.dumps(sources) if sources else None
        metadata_json = json.dumps(metadata) if metadata else None

        conn = db_manager.get_connection()
        if not conn:
            logger.error("HANA connection unavailable — cannot save message.")
            return message_id

        try:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO CHAT_MESSAGES "
                "(MESSAGE_ID, SESSION_ID, ROLE, CONTENT, SOURCES, INTENT, METADATA, TIMESTAMP) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (message_id, session_id, role, content, sources_json, intent, metadata_json, now),
            )
            conn.commit()
            cursor.close()
            db_manager.return_connection(conn)

            # Bump session timestamp
            self._touch_session(session_id)
            logger.debug(f"Saved {role} message {message_id} to session {session_id}")
        except Exception as e:
            db_manager.return_connection(conn)
            logger.error(f"Failed to save message: {e}")

        return message_id

    def get_session_messages(self, session_id: str) -> List[Dict[str, Any]]:
        """Fetch all messages for a session in chronological order."""
        conn = db_manager.get_connection()
        if not conn:
            return []

        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT MESSAGE_ID, SESSION_ID, ROLE, CONTENT, SOURCES, INTENT, METADATA, TIMESTAMP "
                "FROM CHAT_MESSAGES WHERE SESSION_ID = ? ORDER BY TIMESTAMP ASC",
                (session_id,),
            )
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
            cursor.close()
            db_manager.return_connection(conn)

            # Parse JSON fields and serialise datetimes with 'Z' UTC indicator
            for row in rows:
                val = row.get("TIMESTAMP")
                if isinstance(val, datetime):
                    row["TIMESTAMP"] = val.isoformat() + "Z"
                elif isinstance(val, str) and val and not val.endswith("Z"):
                    row["TIMESTAMP"] = val.replace(" ", "T") + "Z"

                for json_field in ("SOURCES", "METADATA"):
                    if row.get(json_field):
                        try:
                            row[json_field] = json.loads(row[json_field])
                        except (json.JSONDecodeError, TypeError):
                            pass

            return rows
        except Exception as e:
            db_manager.return_connection(conn)
            logger.error(f"Failed to fetch messages for session {session_id}: {e}")
            return []

    def get_recent_history(self, session_id: str, limit: int = 10) -> List[Dict[str, str]]:
        """
        Return the last N messages as simplified dicts for LLM context injection.
        Format: [{"role": "user"|"assistant", "content": "..."}]
        """
        conn = db_manager.get_connection()
        if not conn:
            return []

        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT ROLE, CONTENT FROM CHAT_MESSAGES "
                "WHERE SESSION_ID = ? ORDER BY TIMESTAMP DESC LIMIT ?",
                (session_id, limit),
            )
            rows = cursor.fetchall()
            cursor.close()
            db_manager.return_connection(conn)

            # Reverse so oldest-first for prompt building
            return [{"role": row[0], "content": row[1]} for row in reversed(rows)]
        except Exception as e:
            db_manager.return_connection(conn)
            logger.error(f"Failed to fetch recent history: {e}")
            return []

    def _generate_subject(self, first_message: str) -> str:
        """Generate a short session subject from the first user query."""
        # Truncate to first ~60 chars, clean up
        subject = first_message.strip().replace("\n", " ")
        if len(subject) > 60:
            subject = subject[:57] + "..."
        return subject or "New Chat"


# Singleton instance
history_service = ChatHistoryService()
