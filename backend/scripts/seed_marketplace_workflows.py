#!/usr/bin/env python3
"""
Script to seed marketplace workflows (NEXAs) for testing purposes.
Creates sample free and paid workflows in the marketplace.
"""

import sys
import os
import asyncio
from pathlib import Path

# Add the backend directory to Python path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.services.marketplace_service import MarketplaceService
from app.models.marketplace_models import NexaCreateRequest, NexaCategory, PricingModel, LicenseType, SellerRegistrationRequest
from decimal import Decimal
from datetime import datetime
import json


# Sample workflow data
SAMPLE_WORKFLOWS = [
    {
        "name": "Email Notification System",
        "description": "Automatically send email notifications when events occur in your workflows. Perfect for alerts, reports, and user communications.",
        "short_description": "Send automated email notifications with customizable templates",
        "category": NexaCategory.NOTIFICATION,
        "tags": ["email", "notification", "automation", "alerts"],
        "workflow_file": "demo_data_processing_workflow.json",
        "pricing_model": PricingModel.FREE,
        "price": Decimal('0'),
        "license_type": LicenseType.OPEN_SOURCE,
        "screenshots": [
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop",
            "https://images.unsplash.com/photo-1516387938699-a93567ec168e?w=400&h=200&fit=crop"
        ],
        "demo_video_url": None,
        "documentation_url": "https://docs.nexagent.com/email-notifications"
    },
    {
        "name": "Advanced Data Pipeline",
        "description": "Professional-grade data pipeline that ingests, transforms, and exports data between multiple systems. Supports CSV, JSON, XML, and database connections.",
        "short_description": "Professional data pipeline with multi-format support",
        "category": NexaCategory.DATA_PROCESSING,
        "tags": ["data", "pipeline", "etl", "integration", "csv", "json"],
        "workflow_file": "demo_data_processing_workflow.json",
        "pricing_model": PricingModel.MONTHLY,
        "price": Decimal('19.99'),
        "license_type": LicenseType.TEAM,
        "screenshots": [
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop",
            "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=200&fit=crop"
        ],
        "demo_video_url": "https://example.com/demo-video",
        "documentation_url": "https://docs.nexagent.com/data-pipeline"
    },
    {
        "name": "Social Media Scheduler",
        "description": "Schedule and publish content across multiple social media platforms including Twitter, LinkedIn, and Facebook. Includes analytics and engagement tracking.",
        "short_description": "Schedule posts across Twitter, LinkedIn, and Facebook",
        "category": NexaCategory.SOCIAL_MEDIA,
        "tags": ["social", "scheduler", "twitter", "linkedin", "facebook", "marketing"],
        "workflow_file": "demo_data_processing_workflow.json",
        "pricing_model": PricingModel.MONTHLY,
        "price": Decimal('29.99'),
        "license_type": LicenseType.TEAM,
        "screenshots": [
            "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=200&fit=crop",
            "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=200&fit=crop"
        ],
        "demo_video_url": "https://example.com/social-demo",
        "documentation_url": "https://docs.nexagent.com/social-scheduler"
    },
    {
        "name": "Customer Support Bot",
        "description": "AI-powered customer support bot that handles common inquiries, escalates complex issues, and integrates with your ticketing system.",
        "short_description": "AI-powered customer support with escalation",
        "category": NexaCategory.CRM,
        "tags": ["ai", "chatbot", "support", "customer-service", "automation"],
        "workflow_file": "demo_data_processing_workflow.json",
        "pricing_model": PricingModel.MONTHLY,
        "price": Decimal('49.99'),
        "license_type": LicenseType.ENTERPRISE,
        "screenshots": [
            "https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=400&h=200&fit=crop",
            "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=200&fit=crop"
        ],
        "demo_video_url": "https://example.com/support-bot-demo",
        "documentation_url": "https://docs.nexagent.com/support-bot"
    }
]


async def load_workflow_data(filename: str) -> dict:
    """Load workflow data from JSON file"""
    workflow_path = backend_path.parent / filename
    if not workflow_path.exists():
        # Return a default workflow if file doesn't exist
        return {
            "id": f"sample_{filename.replace('.json', '')}",
            "name": "Sample Workflow",
            "description": "A sample workflow for demonstration purposes",
            "nodes": [
                {
                    "id": "trigger_1",
                    "type": "Manual Trigger",
                    "name": "Start",
                    "position": {"x": 100, "y": 150},
                    "config": {}
                }
            ],
            "connections": []
        }
    
    with open(workflow_path, 'r') as f:
        return json.load(f)


async def seed_marketplace_workflows():
    """Seed marketplace with sample workflows"""
    print("🚀 Seeding marketplace workflows...")
    
    marketplace_service = MarketplaceService()
    
    # For testing, we'll use a dummy user ID
    test_seller_id = "test_seller_001"
    
    # Register a test seller if not exists
    try:
        # Check if seller already exists
        existing_seller = await marketplace_service.get_seller_profile(test_seller_id)
        if not existing_seller:
            seller_data = {
                "business_name": "NexAgent Demo Seller",
                "business_email": "seller@nexagent.com",
                "business_type": "individual",
                "country": "US",
                "address_line1": "123 Demo Street",
                "city": "San Francisco",
                "postal_code": "94105",
                "accepts_terms": True,
                "accepts_privacy": True
            }
            
            # Register seller
            seller_request = SellerRegistrationRequest(**seller_data)
            await marketplace_service.register_seller(seller_request, test_seller_id)
            print("🏢 Registered test seller")
            
            # Activate seller account by directly updating the database
            try:
                from app.db.marketplace_db import marketplace_db
                await marketplace_db.sellers_col.document(test_seller_id).update({
                    'status': 'active',
                    'updated_at': datetime.utcnow()
                })
                print("✅ Activated test seller")
            except Exception as e:
                print(f"⚠️  Could not activate seller: {str(e)}")
        else:
            print("🏢 Using existing test seller")
    except Exception as e:
        print(f"ℹ️  Seller setup: {str(e)}")
    
    # Create sample workflows
    for i, workflow_data in enumerate(SAMPLE_WORKFLOWS):
        try:
            print(f"📦 Creating workflow: {workflow_data['name']}")
            
            # Load actual workflow data
            workflow_json = await load_workflow_data(workflow_data["workflow_file"])
            
            # Create NexaCreateRequest
            nexa_request = NexaCreateRequest(
                name=workflow_data["name"],
                description=workflow_data["description"],
                short_description=workflow_data["short_description"],
                category=workflow_data["category"],
                tags=workflow_data["tags"],
                workflow_data=workflow_json,
                workflow_version="1.0.0",
                pricing_model=workflow_data["pricing_model"],
                price=workflow_data["price"],
                currency="USD",
                license_type=workflow_data["license_type"],
                screenshots=workflow_data["screenshots"],
                demo_video_url=workflow_data["demo_video_url"],
                documentation_url=workflow_data["documentation_url"]
            )
            
            # Create the Nexa in the marketplace
            result = await marketplace_service.create_nexa(nexa_request, test_seller_id)
            
            if result.get("success"):
                print(f"✅ Successfully created: {workflow_data['name']}")
            else:
                print(f"❌ Failed to create {workflow_data['name']}: {result.get('error')}")
                
        except Exception as e:
            print(f"❌ Error creating {workflow_data['name']}: {str(e)}")
    
    print("\n🎉 Marketplace seeding completed!")


if __name__ == "__main__":
    asyncio.run(seed_marketplace_workflows())