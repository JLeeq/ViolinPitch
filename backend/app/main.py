from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import analysis

# 테이블 생성 (앱 시작 시)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Violin Coach AI API", version="1.0.0")

# CORS 설정 (프론트엔드에서 접근 가능하도록)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(analysis.router)

@app.get("/")
async def root():
    return {"message": "Violin Coach AI API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

