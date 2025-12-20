"""
Test script for simple workflow execution
Tests the orchestrator with a basic workflow: Manual Trigger → HTTP Request → Logger
"""
import asyncio
import json
import sys
import os
from pathlib import Path

# Add the project root to the path
sys.path.insert(0, str(Path(__file__).parent))

from lib.workflow.langgraph.orchestrator import WorkflowOrchestrator

async def test_simple_workflow():
    """Test a simple 3-node workflow"""
    print("=" * 60)
    print("TESTING SIMPLE WORKFLOW EXECUTION")
    print("=" * 60)
    
    # Load workflow JSON
    workflow_file = Path(__file__).parent / "test_workflow_simple.json"
    
    if not workflow_file.exists():
        print(f"❌ Workflow file not found: {workflow_file}")
        return
    
    with open(workflow_file, 'r') as f:
        workflow_data = json.load(f)
    
    print(f"\n✓ Loaded workflow: {workflow_data['name']}")
    print(f"  - Nodes: {len(workflow_data['nodes'])}")
    print(f"  - Connections: {len(workflow_data['connections'])}")
    
    # Create orchestrator
    print("\n📦 Creating orchestrator...")
    orchestrator = WorkflowOrchestrator(
        enable_checkpointing=False,  # Disable checkpointing for simple test
        enable_circuit_breakers=False,  # Disable circuit breakers for simple test
        checkpoint_storage_dir="./backend/checkpoints"
    )
    
    # Initial input data
    initial_input = {
        "test": True,
        "timestamp": "2024-01-01T00:00:00Z"
    }
    
    print(f"\n▶️  Executing workflow...")
    print("-" * 60)
    
    try:
        # Execute workflow
        result = await orchestrator.execute_workflow(workflow_data, initial_input)
        
        print("\n" + "=" * 60)
        print("EXECUTION RESULT")
        print("=" * 60)
        
        print(f"\n✓ Status: {result.get('status', 'unknown')}")
        
        if result.get('status') == 'success':
            print("\n✅ WORKFLOW EXECUTED SUCCESSFULLY!")
            
            # Print execution summary
            summary = result.get('summary', {})
            print(f"\n📊 Summary:")
            print(f"  - Total nodes: {summary.get('total_nodes', 0)}")
            print(f"  - Successful: {summary.get('successful_nodes', 0)}")
            print(f"  - Failed: {summary.get('failed_nodes', 0)}")
            print(f"  - Execution time: {summary.get('total_execution_time_ms', 0):.2f}ms")
            
            # Print node logs
            node_logs = result.get('node_logs', [])
            if node_logs:
                print(f"\n📝 Node Execution Logs:")
                for log in node_logs:
                    status_icon = "✓" if log.get('status') == 'success' else "✗"
                    print(f"  {status_icon} {log.get('node_name', 'Unknown')}")
                    print(f"    Type: {log.get('node_type', 'unknown')}")
                    print(f"    Status: {log.get('status', 'unknown')}")
                    if log.get('output'):
                        output_preview = str(log['output'])[:100]
                        print(f"    Output: {output_preview}...")
                    print()
            
            # Print final output
            final_output = result.get('final_output')
            if final_output:
                print(f"\n📤 Final Output:")
                print(json.dumps(final_output, indent=2)[:500])
        
        else:
            print("\n❌ WORKFLOW EXECUTION FAILED!")
            error = result.get('error', 'Unknown error')
            print(f"\n🔴 Error: {error}")
            
            # Print partial results
            partial_results = result.get('partial_results', [])
            if partial_results:
                print(f"\n⚠️  Partial Results (executed {len(partial_results)} nodes):")
                for log in partial_results:
                    print(f"  - {log.get('node_name', 'Unknown')}: {log.get('status', 'unknown')}")
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n❌ EXCEPTION OCCURRED!")
        print(f"🔴 Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_simple_workflow())
