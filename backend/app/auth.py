from fastapi import HTTPException, Depends, Header
from typing import Optional
import httpx
import os

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dzsxuiurwavlfmkdgwnk.supabase.co")

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Supabase Auth 토큰을 검증하고 user_id를 반환합니다.
    토큰이 없으면 None을 반환합니다 (인증 선택적인 경우).
    """
    if not authorization:
        return None
    
    if not authorization.startswith("Bearer "):
        return None
    
    token = authorization.split(" ")[1]
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": os.getenv("SUPABASE_ANON_KEY", "")
                }
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return user_data.get("id")
            else:
                return None
    except Exception:
        return None


async def require_auth(authorization: Optional[str] = Header(None)) -> str:
    """
    인증이 필수인 엔드포인트에서 사용합니다.
    토큰이 없거나 유효하지 않으면 401 에러를 발생시킵니다.
    """
    user_id = await get_current_user(authorization)
    
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    return user_id


