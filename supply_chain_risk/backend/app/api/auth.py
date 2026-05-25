from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.core.security import authenticate_user, create_access_token

router = APIRouter()


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str


@router.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Get a JWT token.

    Demo credentials:
    - **admin** / admin123
    - **analyst** / analyst123
    """
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": user["username"]})
    return Token(
        access_token=token,
        token_type="bearer",
        username=user["username"],
        role=user["role"],
    )
