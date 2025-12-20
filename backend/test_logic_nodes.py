"""
Test Script for Logic Nodes
Verifies all logic node executors work correctly
"""
import asyncio
import sys
from pathlib import Path

# Add paths
backend_dir = Path(__file__).parent
project_root = backend_dir.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(backend_dir))

from lib.workflow.langgraph.nodes.logic import (
    IfConditionExecutor,
    SwitchExecutor,
    LoopExecutor,
    BooleanExecutor,
    CounterExecutor,
    TimerExecutor,
    MergeExecutor,
    DelayExecutor
)
from lib.workflow.langgraph.executor_factory import NodeConfig, NodeExecutionContext


async def test_if_condition():
    """Test IfConditionExecutor"""
    print("\n🧪 Testing IfConditionExecutor...")
    
    config = NodeConfig(
        node_id="if_1",
        node_type="If",
        node_name="If Condition Test",
        config={
            "condition": "age > 18"
        }
    )
    
    context = NodeExecutionContext(
        execution_id="exec_1",
        variables={"age": 25},
        api_keys={},
        global_config={}
    )
    
    executor = IfConditionExecutor(config, context)
    
    # Test 1: True condition
    result = await executor.execute({"age": 25})
    print(f"  ✓ Age 25 > 18: {result['result']} (branch: {result['branch']})")
    assert result['result'] == True
    
    # Test 2: False condition
    result = await executor.execute({"age": 15})
    print(f"  ✓ Age 15 > 18: {result['result']} (branch: {result['branch']})")
    assert result['result'] == False
    
    print("  ✅ IfConditionExecutor passed!")


async def test_switch():
    """Test SwitchExecutor"""
    print("\n🧪 Testing SwitchExecutor...")
    
    config = NodeConfig(
        node_id="switch_1",
        node_type="Switch",
        node_name="Switch Test",
        config={
            "value": "admin",
            "cases": [
                {"value": "admin", "label": "Administrator", "output": "admin_route"},
                {"value": "user", "label": "Regular User", "output": "user_route"},
                {"value": "guest", "label": "Guest", "output": "guest_route"}
            ],
            "default": "unknown_route"
        }
    )
    
    context = NodeExecutionContext(
        execution_id="exec_1",
        variables={},
        api_keys={},
        global_config={}
    )
    
    executor = SwitchExecutor(config, context)
    result = await executor.execute({})
    
    print(f"  ✓ Switch on 'admin': matched {result['matched_case']} -> {result['output']}")
    assert result['matched_case'] == "admin"
    assert result['output'] == "admin_route"
    
    print("  ✅ SwitchExecutor passed!")


async def test_loop():
    """Test LoopExecutor"""
    print("\n🧪 Testing LoopExecutor...")
    
    # Test 1: Array iteration
    config = NodeConfig(
        node_id="loop_1",
        node_type="Loop",
        node_name="Loop Test",
        config={
            "items": ["apple", "banana", "cherry"]
        }
    )
    
    context = NodeExecutionContext(
        execution_id="exec_1",
        variables={},
        api_keys={},
        global_config={}
    )
    
    executor = LoopExecutor(config, context)
    result = await executor.execute({})
    
    print(f"  ✓ Array iteration: {result['count']} items")
    assert result['count'] == 3
    # Check key name - it's 'iterations' not 'results'
    iterations_key = 'iterations' if 'iterations' in result else 'results'
    assert result[iterations_key][0]['item'] == "apple"
    assert result[iterations_key][0]['is_first'] == True
    assert result[iterations_key][2]['is_last'] == True
    
    # Test 2: Range iteration
    config2 = NodeConfig(
        node_id="loop_2",
        node_type="Loop",
        node_name="Loop Range Test",
        config={
            "startRange": 1,
            "endRange": 5
        }
    )
    
    executor2 = LoopExecutor(config2, context)
    # Debug: Check what required fields it thinks it needs
    req_fields = executor2.get_required_config_fields()
    print(f"  Debug: Required fields for Loop: {req_fields}")
    result2 = await executor2.execute({})
    
    print(f"  ✓ Range iteration (1 to 5): {result2['count']} items")
    assert result2['count'] == 5
    
    print("  ✅ LoopExecutor passed!")


async def test_boolean():
    """Test BooleanExecutor"""
    print("\n🧪 Testing BooleanExecutor...")
    
    context = NodeExecutionContext(
        execution_id="exec_1",
        variables={},
        api_keys={},
        global_config={}
    )
    
    # Test various operators
    tests = [
        (10, "==", 10, True, "10 == 10"),
        (10, "!=", 5, True, "10 != 5"),
        (10, ">", 5, True, "10 > 5"),
        (5, "<", 10, True, "5 < 10"),
        (10, ">=", 10, True, "10 >= 10"),
        (5, "<=", 10, True, "5 <= 10"),
        ("hello", "contains", "ell", True, "'hello' contains 'ell'"),
        ("hello", "starts_with", "hel", True, "'hello' starts with 'hel'"),
    ]
    
    for left, op, right, expected, desc in tests:
        config = NodeConfig(
            node_id="bool_1",
            node_type="Boolean",
            node_name="Boolean Test",
            config={
                "leftValue": left,
                "operator": op,
                "rightValue": right
            }
        )
        
        executor = BooleanExecutor(config, context)
        result = await executor.execute({})
        
        status = "✓" if result['result'] == expected else "✗"
        print(f"  {status} {desc}: {result['result']}")
        assert result['result'] == expected
    
    print("  ✅ BooleanExecutor passed!")


async def test_counter():
    """Test CounterExecutor"""
    print("\n🧪 Testing CounterExecutor...")
    
    context = NodeExecutionContext(
        execution_id="exec_1",
        variables={},
        api_keys={},
        global_config={}
    )
    
    # Test increment
    config = NodeConfig(
        node_id="counter_1",
        node_type="Counter",
        node_name="Counter Test",
        config={
            "counterName": "myCounter",
            "operation": "increment",
            "step": 1
        }
    )
    
    executor = CounterExecutor(config, context)
    
    result1 = await executor.execute({})
    print(f"  ✓ Increment: 0 -> {result1['newValue']}")
    assert result1['newValue'] == 1
    
    result2 = await executor.execute({})
    print(f"  ✓ Increment: 1 -> {result2['newValue']}")
    assert result2['newValue'] == 2
    
    # Test decrement
    config2 = NodeConfig(
        node_id="counter_2",
        node_type="Counter",
        node_name="Counter Decrement Test",
        config={
            "counterName": "myCounter",
            "operation": "decrement",
            "step": 1
        }
    )
    
    executor2 = CounterExecutor(config2, context)
    result3 = await executor2.execute({})
    print(f"  ✓ Decrement: 2 -> {result3['newValue']}")
    assert result3['newValue'] == 1
    
    print("  ✅ CounterExecutor passed!")


async def test_timer():
    """Test TimerExecutor"""
    print("\n🧪 Testing TimerExecutor...")
    
    context = NodeExecutionContext(
        execution_id="exec_1",
        variables={},
        api_keys={},
        global_config={}
    )
    
    # Start timer
    config_start = NodeConfig(
        node_id="timer_1",
        node_type="Timer",
        node_name="Timer Start Test",
        config={
            "timerName": "myTimer",
            "action": "start"
        }
    )
    
    executor_start = TimerExecutor(config_start, context)
    result_start = await executor_start.execute({})
    print(f"  ✓ Timer started at {result_start['timestamp']}")
    
    # Wait a bit
    await asyncio.sleep(0.1)
    
    # Lap
    config_lap = NodeConfig(
        node_id="timer_2",
        node_type="Timer",
        node_name="Timer Lap Test",
        config={
            "timerName": "myTimer",
            "action": "lap"
        }
    )
    
    executor_lap = TimerExecutor(config_lap, context)
    result_lap = await executor_lap.execute({})
    print(f"  ✓ Lap 1: {result_lap['lap_duration_ms']:.2f}ms")
    assert result_lap['lap_duration_ms'] > 100
    
    # Stop timer
    config_stop = NodeConfig(
        node_id="timer_3",
        node_type="Timer",
        node_name="Timer Stop Test",
        config={
            "timerName": "myTimer",
            "action": "stop"
        }
    )
    
    executor_stop = TimerExecutor(config_stop, context)
    result_stop = await executor_stop.execute({})
    print(f"  ✓ Timer stopped: {result_stop['duration_ms']:.2f}ms total")
    assert result_stop['duration_ms'] > 100
    
    print("  ✅ TimerExecutor passed!")


async def test_merge():
    """Test MergeExecutor"""
    print("\n🧪 Testing MergeExecutor...")
    
    context = NodeExecutionContext(
        execution_id="exec_1",
        variables={},
        api_keys={},
        global_config={}
    )
    
    # Test combine strategy
    config = NodeConfig(
        node_id="merge_1",
        node_type="Merge",
        node_name="Merge Combine Test",
        config={
            "strategy": "combine"
        }
    )
    
    executor = MergeExecutor(config, context)
    result = await executor.execute([
        {"name": "John", "age": 30},
        {"city": "NYC", "country": "USA"}
    ])
    
    print(f"  ✓ Combine merge: {result['result']}")
    assert "name" in result['result']
    assert "city" in result['result']
    
    # Test array strategy
    config2 = NodeConfig(
        node_id="merge_2",
        node_type="Merge",
        node_name="Merge Array Test",
        config={
            "strategy": "array"
        }
    )
    
    executor2 = MergeExecutor(config2, context)
    result2 = await executor2.execute([1, 2, 3, 4, 5])
    
    print(f"  ✓ Array merge: {result2['result']}")
    assert len(result2['result']) == 5
    
    print("  ✅ MergeExecutor passed!")


async def test_delay():
    """Test DelayExecutor"""
    print("\n🧪 Testing DelayExecutor...")
    
    config = NodeConfig(
        node_id="delay_1",
        node_type="Delay",
        node_name="Delay Test",
        config={
            "duration": 100  # 100ms
        }
    )
    
    context = NodeExecutionContext(
        execution_id="exec_1",
        variables={},
        api_keys={},
        global_config={}
    )
    
    executor = DelayExecutor(config, context)
    result = await executor.execute({"test": "data"})
    
    print(f"  ✓ Delayed for {result['actual_duration_ms']:.2f}ms (requested: {result['requested_duration_ms']}ms)")
    assert result['actual_duration_ms'] >= 100  # Should be at least 100ms
    
    print("  ✅ DelayExecutor passed!")


async def main():
    """Run all tests"""
    print("=" * 60)
    print("  LOGIC NODES TEST SUITE")
    print("=" * 60)
    
    try:
        await test_if_condition()
        await test_switch()
        await test_loop()
        await test_boolean()
        await test_counter()
        await test_timer()
        await test_merge()
        await test_delay()
        
        print("\n" + "=" * 60)
        print("  ✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\n🎉 All Logic nodes are fully working!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
