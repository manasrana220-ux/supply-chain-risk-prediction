from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user_model import User
from app.core.security import authenticate_user, create_access_token, get_password_hash, get_current_user

router = APIRouter()


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    profile_photo: str | None = None


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "analyst"
    recovery_phrase: str | None = None


class UserResponse(BaseModel):
    username: str
    role: str
    is_active: bool
    profile_photo: str | None = None

    class Config:
        from_attributes = True


class PasswordReset(BaseModel):
    username: str
    recovery_phrase: str
    new_password: str


class ProfilePhotoUpdate(BaseModel):
    profile_photo: str


@router.post("/token", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Get a JWT token.
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": user.username})
    return Token(
        access_token=token,
        token_type="bearer",
        username=user.username,
        role=user.role,
        profile_photo=user.profile_photo,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user in the system.
    """
    existing_user = db.query(User).filter(User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    if user_in.role not in ["admin", "analyst"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'admin' or 'analyst'"
        )

    new_user = User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True,
        recovery_phrase=user_in.recovery_phrase
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/users", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a list of all registered users (Admin only).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view the user directory."
        )
    return db.query(User).all()


@router.post("/reset-password")
def reset_password(reset_in: PasswordReset, db: Session = Depends(get_db)):
    """
    Reset a user's password using their recovery phrase.
    """
    user = db.query(User).filter(User.username == reset_in.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.recovery_phrase or user.recovery_phrase.strip().lower() != reset_in.recovery_phrase.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect recovery phrase"
        )
        
    user.hashed_password = get_password_hash(reset_in.new_password)
    db.commit()
    return {"message": "Password reset successfully"}


@router.put("/profile-photo", response_model=UserResponse)
def update_profile_photo(
    photo_in: ProfilePhotoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the current user's profile photo.
    """
    current_user.profile_photo = photo_in.profile_photo
    db.commit()
    db.refresh(current_user)
    return current_user
