"""
Example of a custom node executor for the LangGraph workflow engine
"""
import asyncio
import logging
from typing import Any, Dict
from lib.workflow.langgraph.executor_factory import NodeExecutor, NodeConfig, NodeExecutionContext

logger = logging.getLogger(__name__)

class CustomHTTPEndpointExecutor(NodeExecutor):
    """
    Example custom node executor that makes HTTP requests to a specific endpoint
    """
    
    def get_required_config_fields(self) -> list:
        """Return list of required configuration fields"""
        return ["endpoint", "method"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Execute the HTTP endpoint call
        """
        import aiohttp
        import json
        
        # Get configuration
        endpoint = self.config.config.get("endpoint")
        method = self.config.config.get("method", "GET").upper()
        headers = self.config.config.get("headers", {})
        timeout = self.config.config.get("timeout", 30)
        
        # Interpolate variables in endpoint URL
        interpolated_endpoint = self.interpolate_variables(endpoint, input_data)
        
        logger.info(f"Making {method} request to {interpolated_endpoint}")
        
        try:
            # Make HTTP request
            async with aiohttp.ClientSession() as session:
                if method == "GET":
                    async with session.get(
                        interpolated_endpoint, 
                        headers=headers, 
                        timeout=aiohttp.ClientTimeout(total=timeout)
                    ) as response:
                        result = {
                            "status_code": response.status,
                            "headers": dict(response.headers),
                            "data": await response.text()
                        }
                elif method == "POST":
                    # Convert input data to JSON for POST requests
                    json_data = json.dumps(input_data) if isinstance(input_data, (dict, list)) else str(input_data)
                    async with session.post(
                        interpolated_endpoint, 
                        data=json_data,
                        headers={**headers, "Content-Type": "application/json"},
                        timeout=aiohttp.ClientTimeout(total=timeout)
                    ) as response:
                        result = {
                            "status_code": response.status,
                            "headers": dict(response.headers),
                            "data": await response.text()
                        }
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                logger.info(f"HTTP request completed with status {response.status}")
                return result
                
        except Exception as e:
            logger.error(f"HTTP request failed: {str(e)}")
            raise e

class CustomDatabaseQueryExecutor(NodeExecutor):
    """
    Example custom node executor that executes database queries
    """
    
    def get_required_config_fields(self) -> list:
        """Return list of required configuration fields"""
        return ["query"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Execute the database query
        """
        import sqlite3
        from contextlib import closing
        
        # Get configuration
        query = self.config.config.get("query")
        database_path = self.config.config.get("database_path", ":memory:")
        
        # Interpolate variables in query
        interpolated_query = self.interpolate_variables(query, input_data)
        
        logger.info(f"Executing database query: {interpolated_query}")
        
        try:
            # Execute query
            with closing(sqlite3.connect(database_path)) as conn:
                cursor = conn.cursor()
                cursor.execute(interpolated_query)
                
                # If it's a SELECT query, fetch results
                if interpolated_query.strip().upper().startswith("SELECT"):
                    columns = [description[0] for description in cursor.description]
                    rows = cursor.fetchall()
                    result = {
                        "columns": columns,
                        "rows": rows,
                        "row_count": len(rows)
                    }
                else:
                    # For INSERT/UPDATE/DELETE, commit and return affected rows
                    conn.commit()
                    result = {
                        "affected_rows": cursor.rowcount
                    }
                
                logger.info(f"Database query completed")
                return result
                
        except Exception as e:
            logger.error(f"Database query failed: {str(e)}")
            raise e

# Example usage in orchestrator registration
def register_custom_executors(orchestrator):
    """
    Register custom executors with the orchestrator
    """
    orchestrator.register_node_executor("HTTP Endpoint", CustomHTTPEndpointExecutor)
    orchestrator.register_node_executor("Database Query", CustomDatabaseQueryExecutor)
    
    logger.info("Custom node executors registered")

# Example workflow using custom executors
EXAMPLE_WORKFLOW = {
    "id": "example-custom-nodes",
    "name": "Example with Custom Nodes",
    "config": {},
    "nodes": [
        {
            "id": "start",
            "type": "Start",
            "name": "Start",
            "config": {}
        },
        {
            "id": "http_call",
            "type": "HTTP Endpoint",
            "name": "Get User Data",
            "config": {
                "endpoint": "https://jsonplaceholder.typicode.com/users/{{input.user_id}}",
                "method": "GET",
                "timeout": 10
            }
        },
        {
            "id": "db_insert",
            "type": "Database Query",
            "name": "Save User Data",
            "config": {
                "query": "INSERT INTO users (id, name, email) VALUES ({{input.user_id}}, '{{user_data.name}}', '{{user_data.email}}')",
                "database_path": "./example.db"
            }
        },
        {
            "id": "end",
            "type": "End",
            "name": "End",
            "config": {}
        }
    ],
    "connections": [
        {"sourceNodeId": "start", "targetNodeId": "http_call"},
        {"sourceNodeId": "http_call", "targetNodeId": "db_insert"},
        {"sourceNodeId": "db_insert", "targetNodeId": "end"}
    ]
}

if __name__ == "__main__":
    # This is just an example - in practice, you would register these executors
    # with your orchestrator instance
    print("Custom node executors example")
    print("To use these executors, register them with your orchestrator:")
    print("register_custom_executors(your_orchestrator_instance)")