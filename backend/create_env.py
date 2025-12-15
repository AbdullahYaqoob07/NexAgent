#!/usr/bin/env python3
"""
Script to create .env file for local backend development
"""
import os

env_content = """# Environment
ENVIRONMENT=development
DEBUG=true

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_VERSION=v1

# Security
SECRET_KEY=your-local-dev-secret-key-change-in-production-12345

# Firebase Configuration (from nexagent-90391-firebase-adminsdk-fbsvc-8539900f77.json)
FIREBASE_PROJECT_ID=nexagent-90391
FIREBASE_PRIVATE_KEY_ID=8539900f77b2623d65b930a2a459e005ce3e1050
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJhy9rIi7xPCob\\n+kahMJAJqkbCWMQYXQe6XfoD+EgUUw+gSvzpa/OWcF7Dbn5CwEEpkVjl9YQk8g5e\\nHs0lWSf4zs3u8cuPVWs4mCgIS4LZoYN4fNTGot2Wf4nTyLrYFouWaoM5XWczkCTb\\nb+H0KTRSwzSk8bxK3EsvAhaOztX0041ZOffjyaU+4yo4BdhOdU25zRHvDx7rJcLn\\njvkXh006gzxQVXk8Nr6jd3zArcLPm/tgZdikeyumuKNO+oVXQLw56zLhGIDDppyV\\n2fePHGmp7BToZISkjqMf3WX5zuhj6d0H2+C+kKdI43KecrawesGtWHNeVy+7JjnR\\nErE/A1SDAgMBAAECggEAU2MV+ljvHo9cBy6Ueg77kpw74h/TqBcaYwGOuYTK4moK\\nDbPpmXY7GPUPKQN3yAwACoCjTae80YK88jIBhaIx+XAs4uF27qyUDJtc+S2xi3aa\\nzUitzDFIygSk1ZZ5xX7yrD8PZDWjRcEvlwLg9mP0TAiMqHGEDV/A1kchaV7pRf9k\\nTW6u3BnSZ/29d0CxZDSoAz3BS2CCHzLiXM2lZzW4CrzhWxsUQ8z+KCku+nmWGEOM\\n741FlpMB8aUG61Vc5kTeUa4SmSvqUjK3fsrEuo6+ww2e8Vk5wj18W2vZSuwq5VOk\\nrjiZfR6QT/sNQg2MfTbpouB/ZHt6eZXO3CkkfJzN4QKBgQD7aHjY2+KeNdNafwW4\\nKGCE2n1AiDHnAtWJCld8RUSQ+4YbO1dRvmP7fLrivXAq2yELfP+1cc4MuRY4QM2w\\nLAld1Pswxmq+v93Yy3qURSWRYElVZbPlmKRHqO3CMzyX8qHunZmKgwL/moIW4MCe\\nb41JRt/n5WD4kRhv5YvSbGAHowKBgQDNNXw+++NIx7RabjUajmgVrPavpXvxzRZT\\n1m3UTCPJjrMT7oFBGYasUEQ8N1Fk5xoQAh220tnACC0ojJCzUatR0IMLZV78vNp7\\njDvBPwJHZfesh+d22YLH8fFKMD42IKBm5Qw49epuYKY7tqVBYgk4xiN7+e2jqE6c\\nnHMGeYvNoQKBgGmoi3lgWApzxqK21ZmC5qWPCarQUmCrEUEp5oCkv99Kxh61vsnt\\nASoVTpmyUezA8U9ZtkH0VUuFkfAMVCWhLEKSGwtxqDUIf9z4D0k3EkXZuJg6SPPK\\nReiT93Bxhhq57xJQi9Hpo532uouQ44LykOdl8P4NqcZtfF6ykyPZRjaPAoGAMH7z\\nXe8pR4nqlXR2GFCPSJAXvGrfX8WYATgrvIBB9OBEcfFrmnbt3MsbVR+9nJsBDcdy\\nPkKWM0u7YFnX2Ij0c+FTFt5eFFyNRaVeeczqPPVcEuoLSYsd3SLQYzgDe8c6IRcA\\nTHXRcURmBLalV05T35bzy9jE0Gh2K4zNojoXUAECgYEAgj1NWbt0wXU9zyoOXd2l\\nXzZ5K6lfTgUS29xJg+ywHKsfBg7r5c7Xv/ROggCf7sZ9foyiDTIi3Kxtb3Efjdyc\\njrxIy0J4dEImTOnhNAXh5dYFJTz3JMGng/yJG07m3SqvZIUE3aP9dMyS6Qa4I9dz\\nq9+OfbKWFgoR6rlV8HuFjmM=\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@nexagent-90391.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=103707892832817770070
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40nexagent-90391.iam.gserviceaccount.com

# CORS Configuration (for local development)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=INFO
"""

# Write to .env file
env_path = os.path.join(os.path.dirname(__file__), '.env')
with open(env_path, 'w') as f:
    f.write(env_content)

print(f"✅ Created .env file at: {env_path}")
print("📝 Next steps:")
print("   1. Install dependencies: pip install -r requirements.txt")
print("   2. Run backend: python run.py")
print("   3. Update frontend .env.local with: NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000")

