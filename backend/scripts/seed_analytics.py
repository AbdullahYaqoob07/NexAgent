#!/usr/bin/env python3
"""
Sample data seeder for NexAgent analytics system
This script creates realistic sample data for testing the analytics dashboard
"""

import sys
import os
import asyncio
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Initialize Firebase before importing services
import firebase_admin
from firebase_admin import credentials, firestore
from app.core.config import get_firebase_credentials

# Initialize Firebase if not already initialized
if not firebase_admin._apps:
    firebase_creds = get_firebase_credentials()
    cred = credentials.Certificate(firebase_creds)
    firebase_admin.initialize_app(cred)
    print("🔥 Firebase initialized for seeding")

from app.services.analytics_service import analytics_service
from app.services.firebase_service import firebase_service

# Sample workflow data
SAMPLE_WORKFLOWS = [
    {
        'id': 'wf_email_marketing',
        'name': 'Email Marketing Campaign',
        'description': 'Automated email marketing workflow'
    },
    {
        'id': 'wf_data_sync',
        'name': 'Data Synchronization',
        'description': 'Sync data between systems'
    },
    {
        'id': 'wf_lead_scoring',
        'name': 'Lead Scoring System',
        'description': 'Automated lead scoring and routing'
    },
    {
        'id': 'wf_inventory_update',
        'name': 'Inventory Updates',
        'description': 'Real-time inventory synchronization'
    },
    {
        'id': 'wf_customer_onboarding',
        'name': 'Customer Onboarding',
        'description': 'Automated new customer onboarding'
    }
]

SAMPLE_USERS = [
    {
        'uid': 'user_001',
        'email': 'john@example.com',
        'displayName': 'John Doe'
    },
    {
        'uid': 'user_002', 
        'email': 'jane@example.com',
        'displayName': 'Jane Smith'
    },
    {
        'uid': 'user_003',
        'email': 'bob@example.com', 
        'displayName': 'Bob Johnson'
    }
]

EVENT_TYPES = [
    'workflow_started',
    'workflow_completed', 
    'workflow_failed',
    'user_action',
    'integration_connected',
    'api_call',
    'error'
]

async def create_sample_workflows():
    """Create sample workflows in Firestore"""
    print("📝 Creating sample workflows...")
    
    db = firebase_service.db
    
    for workflow in SAMPLE_WORKFLOWS:
        workflow_ref = db.collection('workflows').document(workflow['id'])
        workflow_data = {
            **workflow,
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow(),
            'isActive': True,
            'owner': 'admin@gmail.com'
        }
        workflow_ref.set(workflow_data)
        print(f"  ✅ Created workflow: {workflow['name']}")

async def create_sample_users():
    """Create sample users in Firestore"""
    print("👥 Creating sample users...")
    
    db = firebase_service.db
    
    for user in SAMPLE_USERS:
        user_ref = db.collection('users').document(user['uid'])
        user_data = {
            **user,
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow(),
            'isActive': True,
            'emailVerified': True
        }
        user_ref.set(user_data)
        print(f"  ✅ Created user: {user['displayName']}")

async def create_sample_events():
    """Create sample analytics events"""
    print("📊 Creating sample analytics events...")
    
    now = datetime.utcnow()
    events_created = 0
    
    # Create events for the last 30 days
    for days_ago in range(30, 0, -1):
        event_date = now - timedelta(days=days_ago)
        
        # Create 10-50 events per day
        daily_events = random.randint(10, 50)
        
        for _ in range(daily_events):
            # Random time within the day
            event_time = event_date + timedelta(
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59)
            )
            
            workflow = random.choice(SAMPLE_WORKFLOWS)
            user = random.choice(SAMPLE_USERS)
            event_type = random.choice(EVENT_TYPES)
            
            # Create realistic event data
            if event_type in ['workflow_completed', 'workflow_failed']:
                event_data = {
                    'eventType': event_type,
                    'eventName': f"{workflow['name']} - {event_type.replace('_', ' ').title()}",
                    'userId': user['uid'],
                    'workflowId': workflow['id'],
                    'timestamp': event_time,
                    'properties': {
                        'duration': random.uniform(1.0, 30.0) if event_type == 'workflow_completed' else None,
                        'steps': random.randint(3, 10),
                        'errorMessage': f"Error in step {random.randint(1, 5)}" if event_type == 'workflow_failed' else None
                    }
                }
            elif event_type == 'user_action':
                actions = ['login', 'create_workflow', 'edit_workflow', 'view_dashboard', 'connect_integration']
                event_data = {
                    'eventType': event_type,
                    'eventName': random.choice(actions),
                    'userId': user['uid'],
                    'timestamp': event_time,
                    'properties': {
                        'sessionId': f"session_{random.randint(1000, 9999)}",
                        'source': random.choice(['web', 'api', 'mobile'])
                    }
                }
            elif event_type == 'error':
                event_data = {
                    'eventType': event_type,
                    'eventName': 'System Error',
                    'userId': user['uid'],
                    'timestamp': event_time,
                    'properties': {
                        'errorType': random.choice(['ValidationError', 'NetworkError', 'DatabaseError']),
                        'endpoint': random.choice(['/api/v1/workflows', '/api/v1/users', '/api/v1/integrations']),
                        'severity': random.choice(['warning', 'critical'])
                    }
                }
            else:
                event_data = {
                    'eventType': event_type,
                    'eventName': event_type.replace('_', ' ').title(),
                    'userId': user['uid'],
                    'workflowId': workflow['id'] if 'workflow' in event_type else None,
                    'timestamp': event_time,
                    'properties': {
                        'source': random.choice(['web', 'api', 'webhook'])
                    }
                }
            
            # Track the event
            result = await analytics_service.track_event(event_data)
            if result['success']:
                events_created += 1
            
            # Small delay to avoid overwhelming Firestore
            if events_created % 100 == 0:
                await asyncio.sleep(0.1)
                print(f"  📈 Created {events_created} events...")
    
    print(f"  ✅ Total events created: {events_created}")

async def create_sample_workflow_executions():
    """Create sample workflow execution records"""
    print("🔄 Creating sample workflow executions...")
    
    db = firebase_service.db
    executions_created = 0
    
    now = datetime.utcnow()
    
    # Create executions for the last 7 days
    for days_ago in range(7, 0, -1):
        execution_date = now - timedelta(days=days_ago)
        
        # Create 5-20 executions per day
        daily_executions = random.randint(5, 20)
        
        for _ in range(daily_executions):
            workflow = random.choice(SAMPLE_WORKFLOWS)
            user = random.choice(SAMPLE_USERS)
            
            start_time = execution_date + timedelta(
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            
            duration = random.uniform(1.0, 30.0)
            end_time = start_time + timedelta(seconds=duration)
            
            status = random.choice(['completed', 'completed', 'completed', 'failed'])  # 75% success rate
            
            execution_data = {
                'workflowId': workflow['id'],
                'workflowName': workflow['name'],
                'userId': user['uid'],
                'status': status,
                'startTime': start_time,
                'endTime': end_time,
                'duration': duration,
                'steps': random.randint(3, 10),
                'completedSteps': random.randint(3, 10) if status == 'completed' else random.randint(1, 5),
                'errorMessage': f"Step {random.randint(1, 5)} failed" if status == 'failed' else None,
                'metadata': {
                    'trigger': random.choice(['manual', 'schedule', 'webhook']),
                    'environment': 'production'
                }
            }
            
            execution_ref = db.collection('workflow_executions').document()
            execution_ref.set(execution_data)
            executions_created += 1
    
    print(f"  ✅ Total executions created: {executions_created}")

async def create_system_metrics():
    """Create sample system metrics"""
    print("⚙️ Creating sample system metrics...")
    
    db = firebase_service.db
    metrics_created = 0
    
    now = datetime.utcnow()
    
    # Create metrics for the last 24 hours (every 5 minutes)
    for minutes_ago in range(24 * 60, 0, -5):
        metric_time = now - timedelta(minutes=minutes_ago)
        
        metrics_data = {
            'timestamp': metric_time,
            'uptime': random.uniform(99.0, 99.99),
            'uptimePercentage': random.uniform(99.0, 99.99),
            'totalRequests': random.randint(800, 1200),
            'successfulRequests': random.randint(780, 1180),
            'failedRequests': random.randint(5, 30),
            'avgResponseTime': random.uniform(80, 200),
            'errorRate': random.uniform(0.5, 3.0),
            'activeConnections': random.randint(10, 50),
            'cpuUsage': random.uniform(30, 70),
            'memoryUsage': random.uniform(40, 80),
            'diskUsage': random.uniform(30, 60)
        }
        
        metric_ref = db.collection('system_metrics').document()
        metric_ref.set(metrics_data)
        metrics_created += 1
    
    print(f"  ✅ Total metrics created: {metrics_created}")

async def create_sample_alerts():
    """Create sample system alerts"""
    print("🚨 Creating sample alerts...")
    
    db = firebase_service.db
    
    sample_alerts = [
        {
            'title': 'High Error Rate Detected',
            'message': 'Error rate has exceeded 5% threshold',
            'severity': 'warning',
            'category': 'performance',
            'source': 'monitoring_system',
            'acknowledged': False,
            'timestamp': datetime.utcnow() - timedelta(hours=2)
        },
        {
            'title': 'Workflow Execution Failed',
            'message': 'Email Marketing Campaign workflow failed multiple times',
            'severity': 'critical',
            'category': 'workflow',
            'source': 'workflow_engine',
            'acknowledged': True,
            'acknowledgedBy': 'admin@gmail.com',
            'acknowledgedAt': datetime.utcnow() - timedelta(hours=1),
            'timestamp': datetime.utcnow() - timedelta(hours=4)
        },
        {
            'title': 'Database Connection Issues',
            'message': 'Intermittent database connection timeouts',
            'severity': 'warning',
            'category': 'infrastructure',
            'source': 'database_monitor',
            'acknowledged': False,
            'timestamp': datetime.utcnow() - timedelta(minutes=30)
        }
    ]
    
    for alert_data in sample_alerts:
        alert_ref = db.collection('analytics_alerts').document()
        alert_ref.set(alert_data)
        print(f"  ✅ Created alert: {alert_data['title']}")

async def main():
    """Main seeder function"""
    print("🌱 Starting analytics data seeding...")
    print("=" * 50)
    
    try:
        # Create base data
        await create_sample_workflows()
        await create_sample_users()
        
        # Create analytics data
        await create_sample_events()
        await create_sample_workflow_executions()
        await create_system_metrics()
        await create_sample_alerts()
        
        print("=" * 50)
        print("✅ Analytics data seeding completed successfully!")
        print("\n📊 You should now see data in your analytics dashboard:")
        print("   - Workflow execution metrics")
        print("   - User activity data")
        print("   - System health information")
        print("   - Recent events and alerts")
        
    except Exception as e:
        print(f"❌ Error during seeding: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())