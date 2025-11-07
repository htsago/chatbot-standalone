"""Vector store initialization and management."""
import logging
import os

from langchain_community.document_loaders import JSONLoader
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

from app.core.constants import INDEX_PATH, DATABASE_PATH
from app.core.exceptions import VectorStoreError

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for managing vector store operations."""
    
    @staticmethod
    def initialize() -> FAISS:
        """Initialize and return the vector store."""
        try:
            loader = JSONLoader(
                file_path=DATABASE_PATH, 
                jq_schema='."portfolio-faq"[] | @json'
            )
            docs = loader.load()
            embeddings = OpenAIEmbeddings()

            if os.path.exists(INDEX_PATH):
                logger.info(f"Loading existing vector store from {INDEX_PATH}")
                return FAISS.load_local(
                    embeddings=embeddings, 
                    folder_path=INDEX_PATH, 
                    allow_dangerous_deserialization=True
                )
            else:
                logger.info("Creating new vector store")
                vector_store = FAISS.from_documents(docs, embeddings)
                vector_store.save_local(folder_path=INDEX_PATH)
                return vector_store
        except Exception as e:
            logger.error(f"Error initializing vector store: {str(e)}")
            raise VectorStoreError(f"Failed to initialize vector store: {str(e)}") from e

