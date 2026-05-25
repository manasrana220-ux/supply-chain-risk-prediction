from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="analyst", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    recovery_phrase = Column(String, nullable=True)
    profile_photo = Column(String, nullable=True)
