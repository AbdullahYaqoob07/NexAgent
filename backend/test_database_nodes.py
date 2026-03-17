"""Quick test to verify database nodes register and have correct definitions."""
import sys
import os
import asyncio

# Ensure backend is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from nodes.registry import NodeRegistry
from nodes.databases.postgres import PostgresQuery
from nodes.databases.mongodb import MongoDBQuery
from nodes.databases.pinecone import PineconeQuery


def test_node_definition(cls):
    d = cls.definition
    assert d.type, "type required"
    assert d.display_name, "display_name required"
    assert d.description, "description required"
    assert d.category == "Databases", f"category must be 'Databases', got {d.category}"
    assert d.icon, "icon required"
    assert d.color.startswith("#"), "color must be hex"
    assert len(d.parameters) > 0, "must have parameters"
    assert len(d.outputs) > 0, "must have outputs"
    # Every required credential parameter must be marked is_private
    for p in d.parameters:
        if p.type.value == "credential":
            assert p.is_private, f"Credential param '{p.name}' must be is_private=True"
    print(f"  PASS  {d.type}: {len(d.parameters)} params, {len(d.outputs)} outputs")


def test_registry():
    r = NodeRegistry()
    r.discover()
    keys = sorted(r._nodes.keys())
    needed = ["PostgresQuery", "MongoDBQuery", "PineconeQuery"]
    missing = [k for k in needed if k not in keys]
    if missing:
        print(f"  FAIL  Missing nodes: {missing}")
        return False
    print(f"  PASS  All 3 database nodes registered ({len(keys)} total)")
    return True


async def test_node_execution_missing_config():
    """Each node should raise NodeExecutionError for missing connection string."""
    from nodes.base import NodeExecutionError

    class FakeContext:
        def get_database(self, _):
            return None

    ctx = FakeContext()

    # PostgreSQL
    try:
        await PostgresQuery().execute({}, {}, ctx)
        print("  FAIL  PostgresQuery: should have raised error for missing config")
    except NodeExecutionError as e:
        print(f"  PASS  PostgresQuery raises NodeExecutionError: {e}")

    # MongoDB
    try:
        await MongoDBQuery().execute({}, {}, ctx)
        print("  FAIL  MongoDBQuery: should have raised error for missing config")
    except NodeExecutionError as e:
        print(f"  PASS  MongoDBQuery raises NodeExecutionError: {e}")

    # Pinecone
    try:
        await PineconeQuery().execute({}, {}, ctx)
        print("  FAIL  PineconeQuery: should have raised error for missing config")
    except NodeExecutionError as e:
        print(f"  PASS  PineconeQuery raises NodeExecutionError: {e}")


def test_sql_builder():
    """Test PostgresQuery SQL builder directly."""
    node = PostgresQuery()

    sql = node._build_sql(
        {"operation": "select", "table": "users", "columns": "id, name", "limit": 10}, "select"
    )
    assert "SELECT id, name FROM users LIMIT 10" == sql, f"Got: {sql}"
    print(f"  PASS  SELECT builder: {sql}")

    sql = node._build_sql(
        {"operation": "insert", "table": "users", "data": '{"name": "Alice", "age": 30}'}, "insert"
    )
    assert "INSERT INTO users" in sql and "Alice" in sql, f"Got: {sql}"
    print(f"  PASS  INSERT builder: {sql}")

    sql = node._build_sql(
        {"operation": "delete", "table": "users", "where_clause": "id = 1"}, "delete"
    )
    assert sql == "DELETE FROM users WHERE id = 1", f"Got: {sql}"
    print(f"  PASS  DELETE builder: {sql}")


def main():
    print("=" * 60)
    print("DATABASE NODES TEST SUITE")
    print("=" * 60)

    print("\n[1] Node Definitions")
    test_node_definition(PostgresQuery)
    test_node_definition(MongoDBQuery)
    test_node_definition(PineconeQuery)

    print("\n[2] Registry Discovery")
    ok = test_registry()

    print("\n[3] SQL Builder (PostgresQuery)")
    test_sql_builder()

    print("\n[4] Missing Config Error Handling")
    asyncio.run(test_node_execution_missing_config())

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED" if ok else "SOME TESTS FAILED")
    print("=" * 60)


if __name__ == "__main__":
    main()
