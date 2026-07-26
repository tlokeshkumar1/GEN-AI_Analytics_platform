import logging
from api.config import settings
from api.utils.logger import get_logger

logger = get_logger("database.connection")

try:
    from hdbcli import dbapi
    HDBCLI_AVAILABLE = True
except ImportError:
    HDBCLI_AVAILABLE = False
    logger.warning("hdbcli module not available. HANA connection will operate in mock mode.")

class HANAConnectionManager:
    def __init__(self):
        self.address = settings.HANA_ADDRESS
        self.port = settings.HANA_PORT
        self.user = settings.HANA_USER
        self.password = settings.HANA_PASSWORD

    def get_connection(self):
        if not HDBCLI_AVAILABLE:
            return None
        try:
            conn = dbapi.connect(
                address=self.address,
                port=self.port,
                user=self.user,
                password=self.password,
                encrypt="true",
                sslValidateCertificate="false"
            )
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to SAP HANA Cloud: {e}")
            return None

    def is_connected(self) -> bool:
        conn = self.get_connection()
        if conn:
            conn.close()
            return True
        return False

db_manager = HANAConnectionManager()
