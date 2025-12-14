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

# Firebase Configuration
FIREBASE_PROJECT_ID=nexagent-90391
FIREBASE_PRIVATE_KEY_ID=206c7663976b1ad11aba7ef7dd0439b897335534
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDAftFHxH76c/Bg\\n094ypIKwnyvsT5c+q2bXgczLVjpMW70AmFe/Q0F34RiH7Ga9s0dOJkDokUSLpsyu\\nMOz6Fsa3uuthMNepyLEfld/ELJMZ3m5UOnQdqR2DEi2kYcnbEYf+N+gQjkEn9HfI\\nhHHBCUL9+iYjGO72SKj/1UMukxgOu82prrqrhrhjlFxaT3P4hnmCa2r+eSIm5B+G\\nsKhl470bf+BQiRRiNZo/XV9UGanvjPPtZRGTgFwBo+37yHAwx5pf+kAMqEM4JFQy\\n/189u32ME0STBaedumnMnpI9Q5Zx+AxfPzr4TJnM1bC9lgaGx9TNBKnNJV6DFt6I\\ne62cHYsdAgMBAAECggEAB5OzId4aIAcgwtryfKLtMjRHVEYRiyODIozG9okDT4tv\\nFHJd39b71HlqHKDBeyP7p+SWR2E/P4T8oQdArxsztFP/9sON3AgpiqrJhxoFd0fC\\nJxmyH0aPghMc2oMIrd4SI/K06IC4KVe0c4Wp4zVXXpJlkZn/y/alULhAn8YL9OzX\\ni32KSS2WkX+Qpts+s7OCcuTYIqC50IkStMSVNoR5Y7FTM6cy2bdEXkSUrae8DH8x\\nlbTQuvbIFMDNF4euPCBy+HuViXimjyhuR6gtyxcpDIP2WUUpPRDKYVHh0h5Hhr8d\\n7OH/vYAYR9iGG5pNEB+XTzOiC/JWrTJqo6Fgw4GEQQKBgQDiMOZe3txron0ivLgi\\ntIRDqkje4bzI3TuHuB5PHFmKnFZHKMXO5MXUD9SZo3MMRERuAOBI2xKgiSCOAcxC\\nSVPlnkpybakIqEGutAng4gDvEyjImXrXJh0SeqSn1zKZFjuSrwMmSwS/sssrqLz7\\n+lJBvuHms9qACwLT5DdNvVMHXQKBgQDZ3R0wmCLTNqo3fqYfemt6MbzlCFJCRK7Y\\niTXOV/7DB9eIomLyCgGB068z3ueOmLyFBVVMxNeYYGzDkus/bw7FZpDQaL1cfaLr\\n/HCeVLokCqvKAe/T/hWkor67GMPDU4FNZ0MrR0j5qRFbZM2fTe3IkLHFAtssjl4t\\nzBCcxj8WwQKBgAvj0ChKhMGvr+5Eh1VjsdQwvlXg/eB9KKTwu78i2V4c67gf344J\\nnpCQKHfPDLwnVoWFzERoJ6mCq9BrLcaKPjvCv10WgJ0w4wsA8cf9eVkX47vvvXJT\\n0ZFoGwGroUBE1+rVAlBf/yboih+IZi7EsNA97XgIGkNC0Oo8g9+1RQkNAoGAFcfd\\nWzZahPM6IUIwKYV7qUO/tsYWMznaoRtWncJ+XdEy4x4Y9km5zNj08yKd08vBTSsz\\nU/F5/GnndcYCbt0ThPi0EaHnDJAi8aTTPYEK+v92HUQEThVg5IzAtMPNDoISs0JX\\nnMQLr6oPaiuxwvNvilWs8B1Q/CtfjwSPxJytQgECgYAAvysT26Gl7545rmO/nIAI\\npvablo/jPS1hdPXKB8xcH8nLsEF1hp19Wr3drsVmm+7M+b+eCqD4bd+GOhyITeAl\\nVqyu9Lz9qNhkfiTEjgUigETAXbTqLSqp9rFSSVHyiGqhw/7zASwciG5nQJNfczRB\\ne8TY4shopkhhr8xvCJf49g==\\n-----END PRIVATE KEY-----\\n"
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

